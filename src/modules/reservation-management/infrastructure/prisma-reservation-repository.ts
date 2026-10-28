import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/platform/database/prisma";
import { withSqliteTransaction } from "@/platform/database/sqlite-transaction";
import { getDayOfWeekFromIsoDate, isOccupyingReservation, type DomainRestaurantEvent } from "../domain/availability-engine";
import { generateReservationCode } from "../domain/reservation-code";
import type {
  AdminCreateReservationCommand,
  BlockedDateView,
  RecurringClosureView,
  ReservationStatus,
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

function toEventView(event: Prisma.RestaurantEventGetPayload<object>): RestaurantEventView {
  return { ...event, createdAt: event.createdAt.toISOString(), updatedAt: event.updatedAt.toISOString() };
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
    if (isOccupyingReservation(status)) {
      const occupied = await tx.tableReservation.aggregate({
        where: {
          restaurantId,
          eventId,
          status: { in: [...occupyingStatuses] },
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
    if (date < new Date().toISOString().slice(0, 10)) {
      throw new BadRequestError("No se pueden realizar reservas para fechas pasadas.");
    }
    const [slot, closure, blocked, exclusive] = await Promise.all([
      tx.reservationTimeSlot.findFirst({ where: { restaurantId, time, active: true }, select: { id: true } }),
      tx.reservationRecurringClosure.findFirst({ where: { restaurantId, dayOfWeek: getDayOfWeekFromIsoDate(date) }, select: { reason: true } }),
      tx.reservationBlockedDate.findFirst({ where: { restaurantId, date }, select: { reason: true } }),
      tx.restaurantEvent.findFirst({ where: { restaurantId, date, status: "PUBLISHED", blocksRegularReservations: true }, select: { id: true } }),
    ]);
    if (!slot || closure || blocked || exclusive) {
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
      select: { name: true, landingSlug: true },
    });
  }

  async getRestaurantPublicContext(slug: string): Promise<{
    restaurantId: string;
    name: string;
    slug: string;
    landingEnabled: boolean;
  } | null> {
    const restaurant = await this.database.restaurant.findUnique({
      where: { landingSlug: slug },
      select: {
        id: true,
        name: true,
        landingSlug: true,
        landingEnabled: true,
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
    const [events, occupancy] = await Promise.all([
      this.database.restaurantEvent.findMany({ where: { restaurantId }, orderBy: { date: "asc" } }),
      this.database.tableReservation.groupBy({
        by: ["eventId"],
        where: { restaurantId, eventId: { not: null }, status: { in: [...occupyingStatuses] } },
        _sum: { partySize: true },
        _count: { _all: true },
      }),
    ]);
    const byEvent = new Map(occupancy.map((item) => [item.eventId, item]));
    return events.map((event) => ({
      ...toEventView(event),
      confirmedReservationsCount: byEvent.get(event.id)?._count._all ?? 0,
      remainingCapacity: Math.max(0, event.capacity - (byEvent.get(event.id)?._sum.partySize ?? 0)),
    }));
  }

  async getEventById(restaurantId: string, eventId: string): Promise<RestaurantEventView | null> {
    const event = await this.database.restaurantEvent.findFirst({ where: { id: eventId, restaurantId } });
    return event ? toEventView(event) : null;
  }

  async getAvailabilityEvents(
    restaurantId: string,
    { from, to }: { from: string; to: string },
  ): Promise<DomainRestaurantEvent[]> {
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
      where: { restaurantId, eventId: { in: events.map((event) => event.id) }, status: { in: [...occupyingStatuses] } },
      _sum: { partySize: true },
    });
    const byEvent = new Map(occupancy.map((item) => [item.eventId, item._sum.partySize ?? 0]));
    return events.map((event) => ({ ...event, occupiedSpots: byEvent.get(event.id) ?? 0 }));
  }

  async upsertEvent(
    restaurantId: string,
    cmd: UpsertRestaurantEventCommand,
  ): Promise<RestaurantEventView> {
    if (cmd.id) {
      return withSqliteTransaction(this.database, async (tx) => {
        const occupied = await tx.tableReservation.aggregate({
          where: { restaurantId, eventId: cmd.id, status: { in: [...occupyingStatuses] } },
          _sum: { partySize: true },
        });
        if ((occupied._sum.partySize ?? 0) > cmd.capacity) {
          throw new ConflictError("El aforo no puede ser menor que la cantidad de personas ya reservadas.");
        }
        const updated = await tx.restaurantEvent.update({
          where: { id: cmd.id, restaurantId },
          data: {
            title: cmd.title, description: cmd.description, date: cmd.date, startTime: cmd.startTime,
            endTime: cmd.endTime, capacity: cmd.capacity, priceLabel: cmd.priceLabel, imageUrl: cmd.imageUrl,
            blocksRegularReservations: cmd.blocksRegularReservations, status: cmd.status,
          },
        });
        return toEventView(updated);
      });
    }

    const created = await this.database.restaurantEvent.create({
      data: {
        restaurantId,
        title: cmd.title,
        description: cmd.description,
        date: cmd.date,
        startTime: cmd.startTime,
        endTime: cmd.endTime,
        capacity: cmd.capacity,
        priceLabel: cmd.priceLabel,
        imageUrl: cmd.imageUrl,
        blocksRegularReservations: cmd.blocksRegularReservations,
        status: cmd.status,
      },
    });

    return {
      id: created.id,
      restaurantId: created.restaurantId,
      title: created.title,
      description: created.description,
      date: created.date,
      startTime: created.startTime,
      endTime: created.endTime,
      capacity: created.capacity,
      priceLabel: created.priceLabel,
      imageUrl: created.imageUrl,
      blocksRegularReservations: created.blocksRegularReservations,
      status: created.status as RestaurantEventView["status"],
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
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
              if (date < new Date().toISOString().slice(0, 10)) {
                throw new BadRequestError("No se pueden realizar reservas para fechas pasadas.");
              }
            }
          } else if (cmd.source === "LANDING") {
            await this.assertPublicTableAvailability(tx, restaurantId, date, time);
          }
          const created = await tx.tableReservation.create({
            data: {
              restaurantId, code: reservationCode, date, time, eventId: cmd.eventId || null,
              customerName: cmd.customerName, customerEmail: cmd.customerEmail || "", customerPhone: cmd.customerPhone,
              partySize: cmd.partySize, notes: cmd.notes || "", adminNotes: cmd.adminNotes || "", status: cmd.status, source: cmd.source,
            },
            include: { event: { select: { title: true } } },
          });
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
        where: { id, restaurantId }, data, include: { event: { select: { title: true } } },
      });
      return toReservationView(updated);
    });
  }

  async updateReservationStatus(
    restaurantId: string,
    id: string,
    status: ReservationStatus,
  ): Promise<ReservationView> {
    return withSqliteTransaction(this.database, async (tx) => {
      const existing = await tx.tableReservation.findFirst({ where: { id, restaurantId } });
      if (!existing) throw new NotFoundError("Reserva no encontrada");
      if (existing.eventId) {
        await this.assertEventCapacity(tx, restaurantId, existing.eventId, existing.partySize, status, id);
      }
      const updated = await tx.tableReservation.update({
        where: { id, restaurantId }, data: { status }, include: { event: { select: { title: true } } },
      });
      return toReservationView(updated);
    });
  }

  async deleteReservation(restaurantId: string, id: string): Promise<void> {
    await this.database.tableReservation.deleteMany({
      where: { id, restaurantId },
    });
  }
}
