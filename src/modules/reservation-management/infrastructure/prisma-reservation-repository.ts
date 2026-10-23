import { ConflictError, NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
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

export class PrismaReservationRepository implements ReservationRepositoryPort {
  async isLandingEnabled(tenantId: string): Promise<boolean> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { landingEnabled: true, status: true },
    });
    return Boolean(tenant && tenant.status === "ACTIVE" && tenant.landingEnabled);
  }

  async getTenantPublicContext(slug: string): Promise<{
    tenantId: string;
    name: string;
    slug: string;
    landingEnabled: boolean;
  } | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        landingEnabled: true,
        status: true,
      },
    });

    if (!tenant || tenant.status !== "ACTIVE") {
      return null;
    }

    return {
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      landingEnabled: tenant.landingEnabled,
    };
  }

  // ---------------------------------------------------------------------------
  // Time Slots
  // ---------------------------------------------------------------------------

  async getTimeSlots(tenantId: string): Promise<TimeSlotView[]> {
    const slots = await prisma.reservationTimeSlot.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: "asc" }, { time: "asc" }],
    });

    return slots.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      time: s.time,
      label: s.label,
      active: s.active,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  async upsertTimeSlot(
    tenantId: string,
    cmd: UpsertTimeSlotCommand,
  ): Promise<TimeSlotView> {
    if (cmd.id) {
      const updated = await prisma.reservationTimeSlot.update({
        where: { id: cmd.id, tenantId },
        data: {
          time: cmd.time,
          label: cmd.label,
          active: cmd.active,
          sortOrder: cmd.sortOrder,
        },
      });
      return {
        id: updated.id,
        tenantId: updated.tenantId,
        time: updated.time,
        label: updated.label,
        active: updated.active,
        sortOrder: updated.sortOrder,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    const upserted = await prisma.reservationTimeSlot.upsert({
      where: {
        tenantId_time: {
          tenantId,
          time: cmd.time,
        },
      },
      create: {
        tenantId,
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
      tenantId: upserted.tenantId,
      time: upserted.time,
      label: upserted.label,
      active: upserted.active,
      sortOrder: upserted.sortOrder,
      createdAt: upserted.createdAt.toISOString(),
      updatedAt: upserted.updatedAt.toISOString(),
    };
  }

  async deleteTimeSlot(tenantId: string, slotId: string): Promise<void> {
    await prisma.reservationTimeSlot.deleteMany({
      where: { id: slotId, tenantId },
    });
  }

  // ---------------------------------------------------------------------------
  // Recurring Closures
  // ---------------------------------------------------------------------------

  async getRecurringClosures(tenantId: string): Promise<RecurringClosureView[]> {
    const list = await prisma.reservationRecurringClosure.findMany({
      where: { tenantId },
      orderBy: { dayOfWeek: "asc" },
    });

    return list.map((item) => ({
      id: item.id,
      tenantId: item.tenantId,
      dayOfWeek: item.dayOfWeek,
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));
  }

  async setRecurringClosures(
    tenantId: string,
    closures: { dayOfWeek: number; reason: string }[],
  ): Promise<RecurringClosureView[]> {
    return prisma.$transaction(async (tx) => {
      await tx.reservationRecurringClosure.deleteMany({
        where: { tenantId },
      });

      if (closures.length > 0) {
        await tx.reservationRecurringClosure.createMany({
          data: closures.map((c) => ({
            tenantId,
            dayOfWeek: c.dayOfWeek,
            reason: c.reason,
          })),
        });
      }

      const fresh = await tx.reservationRecurringClosure.findMany({
        where: { tenantId },
        orderBy: { dayOfWeek: "asc" },
      });

      return fresh.map((item) => ({
        id: item.id,
        tenantId: item.tenantId,
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

  async getBlockedDates(tenantId: string): Promise<BlockedDateView[]> {
    const list = await prisma.reservationBlockedDate.findMany({
      where: { tenantId },
      orderBy: { date: "asc" },
    });

    return list.map((b) => ({
      id: b.id,
      tenantId: b.tenantId,
      date: b.date,
      reason: b.reason,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));
  }

  async addBlockedDate(
    tenantId: string,
    date: string,
    reason: string,
  ): Promise<BlockedDateView> {
    const upserted = await prisma.reservationBlockedDate.upsert({
      where: {
        tenantId_date: {
          tenantId,
          date,
        },
      },
      create: {
        tenantId,
        date,
        reason,
      },
      update: {
        reason,
      },
    });

    return {
      id: upserted.id,
      tenantId: upserted.tenantId,
      date: upserted.date,
      reason: upserted.reason,
      createdAt: upserted.createdAt.toISOString(),
      updatedAt: upserted.updatedAt.toISOString(),
    };
  }

  async removeBlockedDate(tenantId: string, id: string): Promise<void> {
    await prisma.reservationBlockedDate.deleteMany({
      where: { id, tenantId },
    });
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  async getEvents(tenantId: string): Promise<RestaurantEventView[]> {
    const events = await prisma.restaurantEvent.findMany({
      where: { tenantId },
      include: {
        reservations: {
          where: {
            status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
          },
          select: { id: true, partySize: true },
        },
      },
      orderBy: { date: "asc" },
    });

    return events.map((e) => {
      const confirmedReservationsCount = e.reservations.length;
      const remainingCapacity = Math.max(0, e.capacity - confirmedReservationsCount);
      return {
        id: e.id,
        tenantId: e.tenantId,
        title: e.title,
        description: e.description,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        capacity: e.capacity,
        priceLabel: e.priceLabel,
        imageUrl: e.imageUrl,
        blocksRegularReservations: e.blocksRegularReservations,
        status: e.status as RestaurantEventView["status"],
        confirmedReservationsCount,
        remainingCapacity,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      };
    });
  }

  async upsertEvent(
    tenantId: string,
    cmd: UpsertRestaurantEventCommand,
  ): Promise<RestaurantEventView> {
    if (cmd.id) {
      const updated = await prisma.restaurantEvent.update({
        where: { id: cmd.id, tenantId },
        data: {
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
        id: updated.id,
        tenantId: updated.tenantId,
        title: updated.title,
        description: updated.description,
        date: updated.date,
        startTime: updated.startTime,
        endTime: updated.endTime,
        capacity: updated.capacity,
        priceLabel: updated.priceLabel,
        imageUrl: updated.imageUrl,
        blocksRegularReservations: updated.blocksRegularReservations,
        status: updated.status as RestaurantEventView["status"],
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    const created = await prisma.restaurantEvent.create({
      data: {
        tenantId,
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
      tenantId: created.tenantId,
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

  async deleteEvent(tenantId: string, eventId: string): Promise<void> {
    await prisma.restaurantEvent.deleteMany({
      where: { id: eventId, tenantId },
    });
  }

  // ---------------------------------------------------------------------------
  // Reservations
  // ---------------------------------------------------------------------------

  async getReservations(
    tenantId: string,
    filter?: { date?: string; status?: ReservationStatus },
  ): Promise<ReservationView[]> {
    const list = await prisma.tableReservation.findMany({
      where: {
        tenantId,
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
      tenantId: r.tenantId,
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
    tenantId: string,
    reservationId: string,
  ): Promise<ReservationView | null> {
    const r = await prisma.tableReservation.findFirst({
      where: { id: reservationId, tenantId },
      include: {
        event: { select: { title: true } },
      },
    });
    if (!r) return null;

    return {
      id: r.id,
      tenantId: r.tenantId,
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
    tenantId: string,
    cmd: AdminCreateReservationCommand,
    code: string,
  ): Promise<ReservationView> {
    return prisma.$transaction(async (tx) => {
      // If not an event, ensure slot is strictly free to prevent race condition
      if (!cmd.eventId && cmd.source === "LANDING") {
        const existingActive = await tx.tableReservation.findFirst({
          where: {
            tenantId,
            date: cmd.date,
            time: cmd.time,
            eventId: null,
            status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
          },
        });

        if (existingActive) {
          throw new ConflictError(
            "Este horario acaba de ser reservado por otro cliente. Por favor seleccioná otro horario.",
          );
        }
      }

      const created = await tx.tableReservation.create({
        data: {
          tenantId,
          code,
          customerName: cmd.customerName,
          customerEmail: cmd.customerEmail || "",
          customerPhone: cmd.customerPhone,
          partySize: cmd.partySize,
          date: cmd.date,
          time: cmd.time,
          notes: cmd.notes || "",
          adminNotes: cmd.adminNotes || "",
          status: cmd.status,
          source: cmd.source,
          eventId: cmd.eventId || null,
        },
        include: {
          event: { select: { title: true } },
        },
      });

      return {
        id: created.id,
        tenantId: created.tenantId,
        code: created.code,
        customerName: created.customerName,
        customerEmail: created.customerEmail,
        customerPhone: created.customerPhone,
        partySize: created.partySize,
        date: created.date,
        time: created.time,
        notes: created.notes,
        adminNotes: created.adminNotes,
        status: created.status as ReservationStatus,
        source: created.source,
        eventId: created.eventId,
        eventTitle: created.event?.title ?? null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    });
  }

  async updateReservation(
    tenantId: string,
    cmd: UpdateReservationCommand,
  ): Promise<ReservationView> {
    const updated = await prisma.tableReservation.update({
      where: { id: cmd.id, tenantId },
      data: {
        customerName: cmd.customerName,
        customerEmail: cmd.customerEmail,
        customerPhone: cmd.customerPhone,
        partySize: cmd.partySize,
        date: cmd.date,
        time: cmd.time,
        notes: cmd.notes,
        adminNotes: cmd.adminNotes,
        status: cmd.status,
      },
      include: {
        event: { select: { title: true } },
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      code: updated.code,
      customerName: updated.customerName,
      customerEmail: updated.customerEmail,
      customerPhone: updated.customerPhone,
      partySize: updated.partySize,
      date: updated.date,
      time: updated.time,
      notes: updated.notes,
      adminNotes: updated.adminNotes,
      status: updated.status as ReservationStatus,
      source: updated.source,
      eventId: updated.eventId,
      eventTitle: updated.event?.title ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async updateReservationStatus(
    tenantId: string,
    id: string,
    status: ReservationStatus,
  ): Promise<ReservationView> {
    const existing = await prisma.tableReservation.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundError("Reserva no encontrada");
    }

    const updated = await prisma.tableReservation.update({
      where: { id, tenantId },
      data: { status },
      include: {
        event: { select: { title: true } },
      },
    });

    return {
      id: updated.id,
      tenantId: updated.tenantId,
      code: updated.code,
      customerName: updated.customerName,
      customerEmail: updated.customerEmail,
      customerPhone: updated.customerPhone,
      partySize: updated.partySize,
      date: updated.date,
      time: updated.time,
      notes: updated.notes,
      adminNotes: updated.adminNotes,
      status: updated.status as ReservationStatus,
      source: updated.source,
      eventId: updated.eventId,
      eventTitle: updated.event?.title ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteReservation(tenantId: string, id: string): Promise<void> {
    await prisma.tableReservation.deleteMany({
      where: { id, tenantId },
    });
  }
}
