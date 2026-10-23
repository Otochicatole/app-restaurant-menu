import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/platform/application/errors";
import {
  computeAvailability,
  type AvailabilityResult,
  type DateAvailabilityView,
  type DomainBlockedDate,
  type DomainRecurringClosure,
  type DomainReservation,
  type DomainRestaurantEvent,
  type DomainTimeSlot,
  type PublicEventAvailabilityView,
} from "../domain/availability-engine";
import type {
  AdminCreateReservationCommand,
  BlockedDateView,
  PublicAvailabilityQuery,
  PublicCreateReservationCommand,
  PublicCreateTableReservationCommand,
  PublicCreateEventReservationCommand,
  RecurringClosureView,
  ReservationCmsData,
  ReservationStatus,
  ReservationView,
  RestaurantEventView,
  TimeSlotView,
  UpdateReservationCommand,
  UpsertRestaurantEventCommand,
  UpsertTimeSlotCommand,
} from "../contracts";
import type { ReservationRepositoryPort } from "./ports";

function generateReservationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 5; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RES-${random}`;
}

function getTodayIsoString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function generateDatesInRange(fromIso: string, toIso: string): string[] {
  const list: string[] = [];
  let current = fromIso;
  let safety = 0;
  while (current <= toIso && safety < 120) {
    list.push(current);
    current = addDaysToIso(current, 1);
    safety++;
  }
  return list;
}

export class ReservationManagementService {
  constructor(private readonly repo: ReservationRepositoryPort) {}

  async isLandingEnabled(tenantId: string): Promise<boolean> {
    return this.repo.isLandingEnabled(tenantId);
  }

  // ---------------------------------------------------------------------------
  // Admin CMS Operations
  // ---------------------------------------------------------------------------

  async getCmsData(tenantId: string): Promise<ReservationCmsData> {
    const isEnabled = await this.repo.isLandingEnabled(tenantId);
    if (!isEnabled) {
      throw new ForbiddenError(
        "La funcionalidad de Landing y Reservas no está habilitada para esta cuenta.",
      );
    }

    const [timeSlots, recurringClosures, blockedDates, events, reservations] =
      await Promise.all([
        this.repo.getTimeSlots(tenantId),
        this.repo.getRecurringClosures(tenantId),
        this.repo.getBlockedDates(tenantId),
        this.repo.getEvents(tenantId),
        this.repo.getReservations(tenantId),
      ]);

    const todayIso = getTodayIsoString();
    const todayReservations = reservations.filter((r) => r.date === todayIso);
    const pendingReservations = reservations.filter((r) => r.status === "PENDING");
    const confirmedReservations = reservations.filter((r) => r.status === "CONFIRMED");
    const activeEvents = events.filter((e) => e.status === "PUBLISHED");
    const activeSlots = timeSlots.filter((s) => s.active);

    return {
      tenantId,
      restaurantName: "Mi Restaurante",
      restaurantSlug: "",
      landingEnabled: isEnabled,
      timeSlots,
      recurringClosures,
      blockedDates,
      events,
      reservations,
      summary: {
        totalReservationsToday: todayReservations.length,
        pendingReservationsCount: pendingReservations.length,
        confirmedReservationsCount: confirmedReservations.length,
        activeEventsCount: activeEvents.length,
        activeTimeSlotsCount: activeSlots.length,
      },
    };
  }

  async upsertTimeSlot(
    tenantId: string,
    cmd: UpsertTimeSlotCommand,
  ): Promise<TimeSlotView> {
    return this.repo.upsertTimeSlot(tenantId, cmd);
  }

  async deleteTimeSlot(tenantId: string, slotId: string): Promise<void> {
    return this.repo.deleteTimeSlot(tenantId, slotId);
  }

  async setRecurringClosures(
    tenantId: string,
    closures: { dayOfWeek: number; reason: string }[],
  ): Promise<RecurringClosureView[]> {
    return this.repo.setRecurringClosures(tenantId, closures);
  }

  async addBlockedDate(
    tenantId: string,
    date: string,
    reason: string,
  ): Promise<BlockedDateView> {
    return this.repo.addBlockedDate(tenantId, date, reason);
  }

  async removeBlockedDate(tenantId: string, id: string): Promise<void> {
    return this.repo.removeBlockedDate(tenantId, id);
  }

  async upsertRestaurantEvent(
    tenantId: string,
    cmd: UpsertRestaurantEventCommand,
  ): Promise<RestaurantEventView> {
    return this.repo.upsertEvent(tenantId, cmd);
  }

  async deleteRestaurantEvent(tenantId: string, eventId: string): Promise<void> {
    return this.repo.deleteEvent(tenantId, eventId);
  }

  async createAdminReservation(
    tenantId: string,
    cmd: AdminCreateReservationCommand,
  ): Promise<ReservationView> {
    const code = generateReservationCode();
    return this.repo.createReservation(tenantId, cmd, code);
  }

  async updateReservation(
    tenantId: string,
    cmd: UpdateReservationCommand,
  ): Promise<ReservationView> {
    return this.repo.updateReservation(tenantId, cmd);
  }

  async updateReservationStatus(
    tenantId: string,
    id: string,
    status: ReservationStatus,
  ): Promise<ReservationView> {
    return this.repo.updateReservationStatus(tenantId, id, status);
  }

  async deleteReservation(tenantId: string, id: string): Promise<void> {
    return this.repo.deleteReservation(tenantId, id);
  }

  // ---------------------------------------------------------------------------
  // Public Client Operations (Landing Page)
  // ---------------------------------------------------------------------------

  async getPublicAvailability(
    slug: string,
    query: PublicAvailabilityQuery,
  ): Promise<{
    restaurantName: string;
    restaurantSlug: string;
    from: string;
    to: string;
    recurringClosedDays: number[];
    dates: DateAvailabilityView[];
    events: PublicEventAvailabilityView[];
    availability: AvailabilityResult;
  }> {
    const context = await this.repo.getTenantPublicContext(slug);
    if (!context) {
      throw new NotFoundError("Restaurante no encontrado");
    }
    if (!context.landingEnabled) {
      throw new ForbiddenError("Las reservas no están habilitadas para este restaurante");
    }

    const todayIso = getTodayIsoString();
    let fromIso = query.from || query.date || todayIso;
    if (fromIso < todayIso) fromIso = todayIso;
    const toIso = query.to || query.date || addDaysToIso(fromIso, 60);

    const datesList = generateDatesInRange(fromIso, toIso);

    const [timeSlots, recurringClosures, blockedDates, events, reservations] =
      await Promise.all([
        this.repo.getTimeSlots(context.tenantId),
        this.repo.getRecurringClosures(context.tenantId),
        this.repo.getBlockedDates(context.tenantId),
        this.repo.getEvents(context.tenantId),
        this.repo.getReservations(context.tenantId),
      ]);

    const activeSlots: DomainTimeSlot[] = timeSlots
      .filter((s) => s.active)
      .map((s) => ({
        id: s.id,
        time: s.time,
        label: s.label,
        sortOrder: s.sortOrder,
      }));

    const domainClosures: DomainRecurringClosure[] = recurringClosures.map((c) => ({
      dayOfWeek: c.dayOfWeek,
      reason: c.reason,
    }));

    const domainBlockedDates: DomainBlockedDate[] = blockedDates.map((b) => ({
      date: b.date,
      reason: b.reason,
    }));

    const domainEvents: DomainRestaurantEvent[] = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      capacity: e.capacity,
      priceLabel: e.priceLabel,
      imageUrl: e.imageUrl,
      blocksRegularReservations: e.blocksRegularReservations,
      status: e.status,
    }));

    const domainReservations: DomainReservation[] = reservations.map((r) => ({
      id: r.id,
      date: r.date,
      time: r.time,
      status: r.status,
      partySize: r.partySize,
      eventId: r.eventId,
    }));

    const availability = computeAvailability({
      dates: datesList,
      activeSlots,
      recurringClosures: domainClosures,
      blockedDates: domainBlockedDates,
      events: domainEvents,
      reservations: domainReservations,
      todayIso,
    });

    return {
      restaurantName: context.name,
      restaurantSlug: context.slug,
      from: fromIso,
      to: toIso,
      recurringClosedDays: recurringClosures.map((c) => c.dayOfWeek),
      dates: availability.dates,
      events: availability.events,
      availability,
    };
  }

  async getPublicTableAvailability(
    slug: string,
    query: PublicAvailabilityQuery,
  ) {
    const full = await this.getPublicAvailability(slug, query);
    return {
      restaurantName: full.restaurantName,
      restaurantSlug: full.restaurantSlug,
      from: full.from,
      to: full.to,
      recurringClosedDays: full.recurringClosedDays,
      dates: full.availability.dates,
      availability: full.availability,
    };
  }

  async createPublicTableReservation(
    slug: string,
    cmd: PublicCreateTableReservationCommand,
  ): Promise<ReservationView> {
    return this.createPublicReservation(slug, {
      ...cmd,
      eventId: null,
    });
  }

  async getPublicEvents(slug: string) {
    const full = await this.getPublicAvailability(slug, {});
    return {
      restaurantName: full.restaurantName,
      restaurantSlug: full.restaurantSlug,
      events: full.availability.events,
    };
  }

  async createPublicEventReservation(
    slug: string,
    cmd: PublicCreateEventReservationCommand,
  ): Promise<ReservationView> {
    const context = await this.repo.getTenantPublicContext(slug);
    if (!context || !context.landingEnabled) {
      throw new ForbiddenError("Las reservas no están habilitadas para este restaurante");
    }

    const events = await this.repo.getEvents(context.tenantId);
    const targetEvent = events.find((e) => e.id === cmd.eventId);
    if (!targetEvent || targetEvent.status !== "PUBLISHED") {
      throw new NotFoundError("El evento seleccionado no existe o no está publicado.");
    }

    return this.createPublicReservation(slug, {
      customerName: cmd.customerName,
      customerEmail: cmd.customerEmail || "",
      customerPhone: cmd.customerPhone,
      partySize: cmd.partySize,
      date: targetEvent.date,
      time: targetEvent.startTime,
      notes: cmd.notes || "",
      eventId: cmd.eventId,
    });
  }

  async createPublicReservation(
    slug: string,
    cmd: PublicCreateReservationCommand,
  ): Promise<ReservationView> {
    const context = await this.repo.getTenantPublicContext(slug);
    if (!context) {
      throw new NotFoundError("Restaurante no encontrado");
    }
    if (!context.landingEnabled) {
      throw new ForbiddenError("Las reservas no están habilitadas para este restaurante");
    }

    const todayIso = getTodayIsoString();
    if (cmd.date < todayIso) {
      throw new BadRequestError("No se pueden realizar reservas para fechas pasadas.");
    }

    // Availability validation check
    const availResult = await this.getPublicAvailability(slug, {
      from: cmd.date,
      to: cmd.date,
    });
    const dateAvail = availResult.availability.dates[0];

    if (cmd.eventId) {
      const targetEvent = availResult.availability.events.find(
        (e) => e.id === cmd.eventId,
      );
      if (!targetEvent) {
        throw new NotFoundError("El evento seleccionado no existe o no está publicado.");
      }
      if (!targetEvent.available || targetEvent.remainingSpots <= 0) {
        throw new ConflictError("Lo sentimos, este evento no tiene cupos disponibles.");
      }
    } else {
      if (!dateAvail || !dateAvail.available) {
        throw new ConflictError(
          dateAvail?.reason || "La fecha seleccionada no se encuentra disponible para reservas.",
        );
      }
      const isSlotAvailable = dateAvail.availableSlots.some(
        (slot) => slot.time === cmd.time,
      );
      if (!isSlotAvailable) {
        throw new ConflictError(
          "El horario seleccionado ya no está disponible. Por favor elegí otro horario.",
        );
      }
    }

    const code = generateReservationCode();
    const adminCommand: AdminCreateReservationCommand = {
      ...cmd,
      adminNotes: "",
      status: "PENDING",
      source: "LANDING",
    };

    return this.repo.createReservation(context.tenantId, adminCommand, code);
  }
}
