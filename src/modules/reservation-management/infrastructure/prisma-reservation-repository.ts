import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/platform/database/prisma";
import { withSqliteTransaction } from "@/platform/database/sqlite-transaction";
import { getDayOfWeekFromIsoDate, type DomainRestaurantEvent } from "../domain/availability-engine";
import { generateReservationCode } from "../domain/reservation-code";
import { calculateFloorInterval, restaurantLocalDateTime } from "@/modules/floor-management/contracts";
import { getFloorAssignmentOptions, getPhysicalAvailability, syncReservationAllocation } from "./floor-allocations";
import type {
  AdminCreateReservationCommand,
  BlockedDateView,
  RecurringClosureView,
  ReservationStatus,
  ReservationStatusOptions,
  ReservationView,
  RestaurantEventView,
  TimeSlotView,
  UpdateReservationCommand,
  UpsertRestaurantEventCommand,
  UpsertTimeSlotCommand,
} from "../contracts";
import type { ReservationRepositoryPort } from "../application/ports";

const occupyingStatuses = ["PENDING", "CONFIRMED", "COMPLETED"] as const;

type ReservationRecord = Prisma.TableReservationGetPayload<{
  include: { event: { select: { title: true } } };
}>;

function toReservationView(reservation: ReservationRecord): ReservationView {
  const { event, ...data } = reservation;
  return {
    ...data,
    eventTitle: event?.title ?? null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };
}

function toEventView(event: Prisma.RestaurantEventGetPayload<object> & { rooms?: { roomId: string }[] }): RestaurantEventView {
  const { rooms, ...data } = event;
  return { ...data, roomIds: rooms?.map((room) => room.roomId), createdAt: event.createdAt.toISOString(), updatedAt: event.updatedAt.toISOString() };
}

function isCodeCollision(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false;
  const adapterError = error.meta?.driverAdapterError as { cause?: { constraint?: { fields?: unknown } } } | undefined;
  const target = error.meta?.target ?? adapterError?.cause?.constraint?.fields;
  if (Array.isArray(target)) return target.includes("restaurantId") && target.includes("code");
  return typeof target === "string" && target.includes("restaurantId_code");
}

export class PrismaReservationRepository implements ReservationRepositoryPort {
  constructor(private readonly database: PrismaClient = prisma) {}

  private async settings(database: Prisma.TransactionClient, restaurantId: string) {
    const restaurant = await database.restaurant.findUnique({ where: { id: restaurantId }, select: { timeZone: true, floorManagementEnabled: true } });
    if (!restaurant) throw new NotFoundError("Restaurante");
    return restaurant;
  }

  private async statuses(database: Prisma.TransactionClient, restaurantId: string) {
    return (await this.settings(database, restaurantId)).floorManagementEnabled
      ? ["CONFIRMED", "COMPLETED"] as const : occupyingStatuses;
  }

  private async assertRevision(tx: Prisma.TransactionClient, existing: { restaurantId: string; revision: number }, status: ReservationStatus, expectedRevision?: number) {
    const settings = await this.settings(tx, existing.restaurantId);
    if ((expectedRevision !== undefined && expectedRevision !== existing.revision) ||
      (settings.floorManagementEnabled && status === "CONFIRMED" && expectedRevision === undefined)) {
      throw new ConflictError("La reserva cambió o falta su revisión actual. Actualizá la vista antes de confirmar.");
    }
  }

  private async assertEventCapacity(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    eventId: string,
    partySize: number,
    status: ReservationStatus,
    excludeReservationId?: string,
  ) {
    const event = await tx.restaurantEvent.findFirst({ where: { id: eventId, restaurantId } });
    if (!event) throw new NotFoundError("Evento no encontrado");
    const statuses = await this.statuses(tx, restaurantId);
    if (statuses.some((value) => value === status)) {
      const occupied = await tx.tableReservation.aggregate({
        where: {
          restaurantId,
          eventId,
          status: { in: [...statuses] },
          id: excludeReservationId ? { not: excludeReservationId } : undefined,
        },
        _sum: { partySize: true },
      });
      if ((occupied._sum.partySize ?? 0) + partySize > event.capacity) {
        throw new ConflictError("Lo sentimos, este evento no tiene cupos disponibles para ese grupo.");
      }
    }
    return event;
  }

  private async assertPublicTableAvailability(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    date: string,
    time: string,
  ) {
    const settings = await this.settings(tx, restaurantId);
    const localNow = restaurantLocalDateTime(settings.timeZone);
    if (date < localNow.date || (date === localNow.date && time <= localNow.time)) {
      throw new BadRequestError("No se pueden realizar reservas para fechas pasadas.");
    }
    const [slot, closure, blocked, exclusive] = await Promise.all([
      tx.reservationTimeSlot.findFirst({ where: { restaurantId, time, active: true }, select: { id: true } }),
      tx.reservationRecurringClosure.findFirst({ where: { restaurantId, dayOfWeek: getDayOfWeekFromIsoDate(date) }, select: { reason: true } }),
      tx.reservationBlockedDate.findFirst({ where: { restaurantId, date }, select: { reason: true } }),
      tx.restaurantEvent.findFirst({ where: { restaurantId, date, status: "PUBLISHED", blocksRegularReservations: true }, select: { id: true } }),
    ]);
    if (!slot || closure || blocked || (exclusive && !settings.floorManagementEnabled)) {
      throw new ConflictError(closure?.reason || blocked?.reason || "El horario seleccionado no está disponible.");
    }
  }

  async isLandingEnabled(restaurantId: string): Promise<boolean> {
    const restaurant = await this.database.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        landingEnabled: true,
        status: true,
        organization: { select: { status: true } },
      },
    });
    return Boolean(
      restaurant &&
      restaurant.status === "ACTIVE" &&
      restaurant.organization.status === "ACTIVE" &&
      restaurant.landingEnabled,
    );
  }

  async getRestaurantInfo(restaurantId: string) {
    return this.database.restaurant.findUnique({
      where: { id: restaurantId },
      select: { name: true, landingSlug: true, floorManagementEnabled: true, timeZone: true },
    });
  }

  async getRestaurantPublicContext(slug: string): Promise<{
    restaurantId: string;
    name: string;
    slug: string;
    landingEnabled: boolean;
    floorManagementEnabled: boolean;
    timeZone: string;
  } | null> {
    const restaurant = await this.database.restaurant.findUnique({
      where: { landingSlug: slug },
      select: {
        id: true,
        name: true,
        landingSlug: true,
        landingEnabled: true,
        floorManagementEnabled: true,
        timeZone: true,
        status: true,
        organization: { select: { status: true } },
        landingPage: { select: { published: true } },
      },
    });

    if (
      !restaurant ||
      restaurant.status !== "ACTIVE" ||
      restaurant.organization.status !== "ACTIVE" ||
      !restaurant.landingPage?.published
    ) {
      return null;
    }

    return {
      restaurantId: restaurant.id,
      name: restaurant.name,
      slug: restaurant.landingSlug,
      landingEnabled: restaurant.landingEnabled,
      floorManagementEnabled: restaurant.floorManagementEnabled,
      timeZone: restaurant.timeZone,
    };
  }

  // ---------------------------------------------------------------------------
  // Time Slots
  // ---------------------------------------------------------------------------

  async getTimeSlots(restaurantId: string): Promise<TimeSlotView[]> {
    const slots = await this.database.reservationTimeSlot.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
    });

    return slots.map((s) => ({
      id: s.id,
      restaurantId: s.restaurantId,
      time: s.time,
      label: s.label,
      active: s.active,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  async upsertTimeSlot(
    restaurantId: string,
    cmd: UpsertTimeSlotCommand,
  ): Promise<TimeSlotView> {
    if (cmd.id) {
      const updated = await this.database.reservationTimeSlot.update({
        where: { id: cmd.id, restaurantId },
        data: {
          time: cmd.time,
          label: cmd.label,
          active: cmd.active,
          sortOrder: cmd.sortOrder,
        },
      });
      return {
        id: updated.id,
        restaurantId: updated.restaurantId,
        time: updated.time,
        label: updated.label,
        active: updated.active,
        sortOrder: updated.sortOrder,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    const upserted = await this.database.reservationTimeSlot.upsert({
      where: {
        restaurantId_time: {
          restaurantId,
          time: cmd.time,
        },
      },
      create: {
        restaurantId,
        time: cmd.time,
        label: cmd.label,
        active: cmd.active,
        sortOrder: cmd.sortOrder,
      },
      update: {
        label: cmd.label,
        active: cmd.active,
        sortOrder: cmd.sortOrder,
      },
    });

    return {
      id: upserted.id,
      restaurantId: upserted.restaurantId,
      time: upserted.time,
      label: upserted.label,
      active: upserted.active,
      sortOrder: upserted.sortOrder,
      createdAt: upserted.createdAt.toISOString(),
      updatedAt: upserted.updatedAt.toISOString(),
    };
  }

  async deleteTimeSlot(restaurantId: string, slotId: string): Promise<void> {
    await this.database.reservationTimeSlot.deleteMany({
      where: { id: slotId, restaurantId },
    });
  }

  // ---------------------------------------------------------------------------
  // Recurring Closures
  // ---------------------------------------------------------------------------

  async getRecurringClosures(restaurantId: string): Promise<RecurringClosureView[]> {
    const list = await this.database.reservationRecurringClosure.findMany({
      where: { restaurantId },
      orderBy: { dayOfWeek: "asc" },
    });

    return list.map((item) => ({
      id: item.id,
      restaurantId: item.restaurantId,
      dayOfWeek: item.dayOfWeek,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));
  }

  async setRecurringClosures(
    restaurantId: string,
    closures: { dayOfWeek: number; reason: string }[],
  ): Promise<RecurringClosureView[]> {
    return this.database.$transaction(async (tx) => {
      await tx.reservationRecurringClosure.deleteMany({
        where: { restaurantId },
      });

      if (closures.length > 0) {
        await tx.reservationRecurringClosure.createMany({
          data: closures.map((c) => ({
            restaurantId,
            dayOfWeek: c.dayOfWeek,
            reason: c.reason,
          })),
        });
      }

      const fresh = await tx.reservationRecurringClosure.findMany({
        where: { restaurantId },
        orderBy: { dayOfWeek: "asc" },
      });

      return fresh.map((item) => ({
        id: item.id,
        restaurantId: item.restaurantId,
        dayOfWeek: item.dayOfWeek,
        reason: item.reason,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      }));
    });
  }

  // ---------------------------------------------------------------------------
  // Blocked Dates
  // ---------------------------------------------------------------------------

  async getBlockedDates(restaurantId: string): Promise<BlockedDateView[]> {
    const list = await this.database.reservationBlockedDate.findMany({
      where: { restaurantId },
      orderBy: { date: "asc" },
    });

    return list.map((b) => ({
      id: b.id,
      restaurantId: b.restaurantId,
      date: b.date,
      reason: b.reason,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));
  }

  async addBlockedDate(
    restaurantId: string,
    date: string,
    reason: string,
  ): Promise<BlockedDateView> {
    const upserted = await this.database.reservationBlockedDate.upsert({
      where: {
        restaurantId_date: {
          restaurantId,
          date,
        },
      },
      create: {
        restaurantId,
        date,
        reason,
      },
      update: {
        reason,
      },
    });

    return {
      id: upserted.id,
      restaurantId: upserted.restaurantId,
      date: upserted.date,
      reason: upserted.reason,
      createdAt: upserted.createdAt.toISOString(),
      updatedAt: upserted.updatedAt.toISOString(),
    };
  }

  async removeBlockedDate(restaurantId: string, id: string): Promise<void> {
    await this.database.reservationBlockedDate.deleteMany({
      where: { id, restaurantId },
    });
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  async getEvents(restaurantId: string): Promise<RestaurantEventView[]> {
    const statuses = await this.statuses(this.database, restaurantId);
    const [events, occupancy] = await Promise.all([
      this.database.restaurantEvent.findMany({ where: { restaurantId }, include: { rooms: { select: { roomId: true } } }, orderBy: { date: "asc" } }),
      this.database.tableReservation.groupBy({
        by: ["eventId"],
        where: { restaurantId, eventId: { not: null }, status: { in: [...statuses] } },
        _sum: { partySize: true },
        _count: { _all: true },
      }),
    ]);
    const byEvent = new Map(occupancy.map((item) => [item.eventId, item]));
    return events.map((event) => ({
      ...toEventView(event),
      roomIds: event.rooms.map((room) => room.roomId),
      confirmedReservationsCount: byEvent.get(event.id)?._count._all ?? 0,
      remainingCapacity: Math.max(0, event.capacity - (byEvent.get(event.id)?._sum.partySize ?? 0)),
    }));
  }

  async getEventById(restaurantId: string, eventId: string): Promise<RestaurantEventView | null> {
    const event = await this.database.restaurantEvent.findFirst({ where: { id: eventId, restaurantId }, include: { rooms: { select: { roomId: true } } } });
    return event ? { ...toEventView(event), roomIds: event.rooms.map((room) => room.roomId) } : null;
  }

  async getAvailabilityEvents(
    restaurantId: string,
    { from, to }: { from: string; to: string },
  ): Promise<DomainRestaurantEvent[]> {
    const statuses = await this.statuses(this.database, restaurantId);
    const eventWhere = { restaurantId, status: "PUBLISHED" as const, date: { gte: from, lte: to } };
    const events = await this.database.restaurantEvent.findMany({
      where: eventWhere,
      select: {
        id: true, title: true, description: true, date: true, startTime: true, endTime: true,
        capacity: true, priceLabel: true, imageUrl: true, blocksRegularReservations: true, status: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    if (events.length === 0) return [];
    const occupancy = await this.database.tableReservation.groupBy({
      by: ["eventId"],
      where: { restaurantId, eventId: { in: events.map((event) => event.id) }, status: { in: [...statuses] } },
      _sum: { partySize: true },
    });
    const byEvent = new Map(occupancy.map((item) => [item.eventId, item._sum.partySize ?? 0]));
    return events.map((event) => ({ ...event, occupiedSpots: byEvent.get(event.id) ?? 0 }));
  }

  getPhysicalAvailability(restaurantId: string, query: { dates: string[]; times: string[]; partySize: number }) {
    return getPhysicalAvailability(this.database, restaurantId, query);
  }

  async hasEventPhysicalAvailability(restaurantId: string, eventId: string, partySize: number) {
    const event = await this.database.restaurantEvent.findFirst({ where: { id: eventId, restaurantId }, select: { date: true, startTime: true } });
    if (!event) return false;
    return Boolean((await getFloorAssignmentOptions(this.database, restaurantId, { date: event.date, time: event.startTime, eventId, partySize })).hasAvailability);
  }

  async upsertEvent(
    restaurantId: string,
    cmd: UpsertRestaurantEventCommand,
  ): Promise<RestaurantEventView> {
    return withSqliteTransaction(this.database, async (tx) => {
      const settings = await this.settings(tx, restaurantId);
      const existing = cmd.id ? await tx.restaurantEvent.findFirst({ where: { id: cmd.id, restaurantId }, include: { rooms: true } }) : null;
      if (cmd.id && !existing) throw new NotFoundError("Evento");
      const roomIds = [...new Set(cmd.roomIds ?? existing?.rooms.map((room) => room.roomId) ?? [])];
      if (settings.floorManagementEnabled && roomIds.length === 0) throw new BadRequestError("Seleccioná al menos un salón para el evento.");
      if (roomIds.length && await tx.diningRoom.count({ where: { restaurantId, id: { in: roomIds }, active: true } }) !== roomIds.length) {
        throw new BadRequestError("Los salones del evento deben estar activos y pertenecer a este restaurante.");
      }
      const interval = settings.floorManagementEnabled ? calculateFloorInterval({
        date: cmd.date, time: cmd.startTime, timeZone: settings.timeZone,
        event: { date: cmd.date, startTime: cmd.startTime, endTime: cmd.endTime },
      }) : null;
      const occupied = existing ? await tx.tableReservation.aggregate({
        where: { restaurantId, eventId: existing.id, status: { in: [...await this.statuses(tx, restaurantId)] } }, _sum: { partySize: true },
      }) : null;
      if ((occupied?._sum.partySize ?? 0) > cmd.capacity) throw new ConflictError("El aforo no puede ser menor que la cantidad de personas ya reservadas.");
      if (interval && cmd.status === "PUBLISHED" && cmd.blocksRegularReservations) {
        const exclusiveEvents = await tx.restaurantEvent.findMany({
          where: { restaurantId, status: "PUBLISHED", blocksRegularReservations: true,
            ...(existing ? { id: { not: existing.id } } : {}), rooms: { some: { roomId: { in: roomIds } } } },
          select: { date: true, startTime: true, endTime: true },
        });
        if (exclusiveEvents.some((event) => {
          const other = calculateFloorInterval({ date: event.date, time: event.startTime, timeZone: settings.timeZone, event });
          return Date.parse(other.blockedFrom) < Date.parse(interval.blockedUntil) && Date.parse(other.blockedUntil) > Date.parse(interval.blockedFrom);
        })) throw new ConflictError("Otro evento exclusivo ya ocupa uno de los salones durante ese horario.");
        const conflicting = await tx.reservationAllocation.findFirst({
          where: {
            restaurantId, roomId: { in: roomIds }, releasedAt: null,
            blockedFrom: { lt: new Date(interval.blockedUntil) }, blockedUntil: { gt: new Date(interval.blockedFrom) },
            reservation: { status: "CONFIRMED", ...(existing ? { OR: [{ eventId: null }, { eventId: { not: existing.id } }] } : {}) },
          }, select: { id: true },
        });
        if (conflicting) throw new ConflictError("El evento exclusivo se superpone con mesas ya confirmadas en uno de sus salones.");
      }
      const data = {
        title: cmd.title, description: cmd.description, date: cmd.date, startTime: cmd.startTime,
        endTime: cmd.endTime, capacity: cmd.capacity, priceLabel: cmd.priceLabel, imageUrl: cmd.imageUrl,
        blocksRegularReservations: cmd.blocksRegularReservations, status: cmd.status,
      };
      const event = existing
        ? await tx.restaurantEvent.update({ where: { id: existing.id, restaurantId }, data })
        : await tx.restaurantEvent.create({ data: { ...data, restaurantId } });
      await tx.restaurantEventRoom.deleteMany({ where: { eventId: event.id, restaurantId } });
      if (roomIds.length) await tx.restaurantEventRoom.createMany({ data: roomIds.map((roomId) => ({ eventId: event.id, restaurantId, roomId })) });
      const scheduleChanged = existing && (existing.date !== cmd.date || existing.startTime !== cmd.startTime || existing.endTime !== cmd.endTime ||
        existing.rooms.map((room) => room.roomId).sort().join(",") !== [...roomIds].sort().join(","));
      if (scheduleChanged) {
        await tx.tableReservation.updateMany({ where: { restaurantId, eventId: event.id }, data: { date: event.date, time: event.startTime, revision: { increment: 1 } } });
        const confirmed = await tx.tableReservation.findMany({ where: { restaurantId, eventId: event.id, status: "CONFIRMED" } });
        for (const reservation of confirmed) await syncReservationAllocation(tx, reservation);
      }
      return { ...toEventView(event), roomIds };
    });
  }

  async deleteEvent(restaurantId: string, eventId: string): Promise<void> {
    await withSqliteTransaction(this.database, async (transaction) => {
      await transaction.tableReservation.updateMany({
        where: { restaurantId, eventId },
        data: { eventId: null },
      });
      await transaction.restaurantEvent.deleteMany({
        where: { id: eventId, restaurantId },
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Reservations
  // ---------------------------------------------------------------------------

  async getReservations(
    restaurantId: string,
    filter?: { date?: string; status?: ReservationStatus },
  ): Promise<ReservationView[]> {
    const list = await this.database.tableReservation.findMany({
      where: {
        restaurantId,
        date: filter?.date,
        status: filter?.status,
      },
      include: {
        event: {
          select: { title: true },
        },
      },
      orderBy: [{ date: "desc" }, { time: "asc" }, { createdAt: "desc" }],
    });

    return list.map((r) => ({
      id: r.id,
      restaurantId: r.restaurantId,
      code: r.code,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      customerPhone: r.customerPhone,
      partySize: r.partySize,
      date: r.date,
      time: r.time,
      notes: r.notes,
      adminNotes: r.adminNotes,
      status: r.status as ReservationStatus,
      source: r.source,
      eventId: r.eventId,
      eventTitle: r.event?.title ?? null,
      revision: r.revision,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async getReservationById(
    restaurantId: string,
    reservationId: string,
  ): Promise<ReservationView | null> {
    const r = await this.database.tableReservation.findFirst({
      where: { id: reservationId, restaurantId },
      include: {
        event: { select: { title: true } },
      },
    });
    if (!r) return null;

    return {
      id: r.id,
      restaurantId: r.restaurantId,
      code: r.code,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      customerPhone: r.customerPhone,
      partySize: r.partySize,
      date: r.date,
      time: r.time,
      notes: r.notes,
      adminNotes: r.adminNotes,
      status: r.status as ReservationStatus,
      source: r.source,
      eventId: r.eventId,
      eventTitle: r.event?.title ?? null,
      revision: r.revision,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async createReservation(
    restaurantId: string,
    cmd: AdminCreateReservationCommand,
    code: string,
  ): Promise<ReservationView> {
    let reservationCode = code;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await withSqliteTransaction(this.database, async (tx) => {
          let date = cmd.date;
          let time = cmd.time;
          if (cmd.eventId) {
            const event = await this.assertEventCapacity(tx, restaurantId, cmd.eventId, cmd.partySize, cmd.status);
            date = event.date;
            time = event.startTime;
            if (cmd.source === "LANDING") {
              if (event.status !== "PUBLISHED") throw new NotFoundError("Evento no publicado");
              const localNow = restaurantLocalDateTime((await this.settings(tx, restaurantId)).timeZone);
              if (date < localNow.date || (date === localNow.date && time <= localNow.time)) {
                throw new BadRequestError("No se pueden realizar reservas para fechas pasadas.");
              }
            }
          } else if (cmd.source === "LANDING") {
            await this.assertPublicTableAvailability(tx, restaurantId, date, time);
          }
          if (cmd.source === "LANDING" && (await this.settings(tx, restaurantId)).floorManagementEnabled) {
            const available = await getFloorAssignmentOptions(tx, restaurantId, { date, time, partySize: cmd.partySize, eventId: cmd.eventId });
            if (!available.hasAvailability) throw new ConflictError("No hay mesas disponibles para ese grupo en el horario seleccionado.");
          }
          const created = await tx.tableReservation.create({
            data: {
              restaurantId, code: reservationCode, date, time, eventId: cmd.eventId || null,
              customerName: cmd.customerName, customerEmail: cmd.customerEmail || "", customerPhone: cmd.customerPhone,
              partySize: cmd.partySize, notes: cmd.notes || "", adminNotes: cmd.adminNotes || "", status: cmd.status, source: cmd.source,
            },
            include: { event: { select: { title: true } } },
          });
          await syncReservationAllocation(tx, created, cmd.assignment);
          return toReservationView(created);
        });
      } catch (error) {
        if (!isCodeCollision(error)) throw error;
        if (attempt === 2) throw new ConflictError("No se pudo generar un código de reserva único. Intentá nuevamente.");
        reservationCode = generateReservationCode();
      }
    }
    throw new ConflictError("No se pudo crear la reserva.");
  }

  async updateReservation(
    restaurantId: string,
    cmd: UpdateReservationCommand,
  ): Promise<ReservationView> {
    return withSqliteTransaction(this.database, async (tx) => {
      const existing = await tx.tableReservation.findFirst({ where: { id: cmd.id, restaurantId } });
      if (!existing) throw new NotFoundError("Reserva no encontrada");
      if (existing.source !== "WALK_IN" && cmd.customerPhone.trim().length < 6) throw new BadRequestError("La reserva requiere un teléfono de contacto válido.");
      await this.assertRevision(tx, existing, cmd.status, cmd.expectedRevision);
      const id = cmd.id;
      const data = {
        customerName: cmd.customerName, customerEmail: cmd.customerEmail, customerPhone: cmd.customerPhone,
        partySize: cmd.partySize, date: cmd.date, time: cmd.time, notes: cmd.notes, adminNotes: cmd.adminNotes, status: cmd.status,
      };
      if (existing.eventId) {
        const event = await this.assertEventCapacity(tx, restaurantId, existing.eventId, cmd.partySize, cmd.status, id);
        data.date = event.date;
        data.time = event.startTime;
      }
      const updated = await tx.tableReservation.update({
        where: { id, restaurantId }, data: { ...data, revision: { increment: 1 } }, include: { event: { select: { title: true } } },
      });
      await syncReservationAllocation(tx, updated, cmd.assignment);
      return toReservationView(updated);
    });
  }

  async updateReservationStatus(
    restaurantId: string,
    id: string,
    status: ReservationStatus,
    options?: ReservationStatusOptions,
  ): Promise<ReservationView> {
    return withSqliteTransaction(this.database, async (tx) => {
      const existing = await tx.tableReservation.findFirst({ where: { id, restaurantId } });
      if (!existing) throw new NotFoundError("Reserva no encontrada");
      await this.assertRevision(tx, existing, status, options?.expectedRevision);
      if (existing.eventId) {
        await this.assertEventCapacity(tx, restaurantId, existing.eventId, existing.partySize, status, id);
      }
      const updated = await tx.tableReservation.update({
        where: { id, restaurantId }, data: { status, revision: { increment: 1 } }, include: { event: { select: { title: true } } },
      });
      await syncReservationAllocation(tx, updated, options?.assignment);
      return toReservationView(updated);
    });
  }

  async deleteReservation(restaurantId: string, id: string): Promise<void> {
    await this.database.tableReservation.deleteMany({
      where: { id, restaurantId },
    });
  }
}
