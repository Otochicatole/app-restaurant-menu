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
  type DomainRestaurantEvent,
  type DomainTimeSlot,
  type PublicEventAvailabilityView,
} from "../domain/availability-engine";
import { generateReservationCode } from "../domain/reservation-code";
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

  async isLandingEnabled(restaurantId: string): Promise<boolean> {
    return this.repo.isLandingEnabled(restaurantId);
  }

  // ---------------------------------------------------------------------------
  // Admin CMS Operations
  // ---------------------------------------------------------------------------

  async getCmsData(restaurantId: string): Promise<ReservationCmsData> {
    const isEnabled = await this.repo.isLandingEnabled(restaurantId);
    if (!isEnabled) {
      throw new ForbiddenError(
        "La funcionalidad de Landing y Reservas no está habilitada para esta cuenta.",
      );
    }

    const [restaurant, timeSlots, recurringClosures, blockedDates, events, reservations] =
      await Promise.all([
        this.repo.getRestaurantInfo(restaurantId),
        this.repo.getTimeSlots(restaurantId),
        this.repo.getRecurringClosures(restaurantId),
        this.repo.getBlockedDates(restaurantId),
        this.repo.getEvents(restaurantId),
        this.repo.getReservations(restaurantId),
      ]);

    const todayIso = getTodayIsoString();
    const todayReservations = reservations.filter((r) => r.date === todayIso);
    const pendingReservations = reservations.filter((r) => r.status === "PENDING");
    const confirmedReservations = reservations.filter((r) => r.status === "CONFIRMED");
    const activeEvents = events.filter((e) => e.status === "PUBLISHED");
    const activeSlots = timeSlots.filter((s) => s.active);

    return {
      restaurantId,
      restaurantName: restaurant?.name ?? "Mi Restaurante",
      restaurantSlug: restaurant?.landingSlug ?? "",
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
    restaurantId: string,
    cmd: UpsertTimeSlotCommand,
  ): Promise<TimeSlotView> {
    return this.repo.upsertTimeSlot(restaurantId, cmd);
  }

  async deleteTimeSlot(restaurantId: string, slotId: string): Promise<void> {
    return this.repo.deleteTimeSlot(restaurantId, slotId);
  }

  async setRecurringClosures(
    restaurantId: string,
    closures: { dayOfWeek: number; reason: string }[],
  ): Promise<RecurringClosureView[]> {
    return this.repo.setRecurringClosures(restaurantId, closures);
  }

  async addBlockedDate(
    restaurantId: string,
    date: string,
    reason: string,
  ): Promise<BlockedDateView> {
    return this.repo.addBlockedDate(restaurantId, date, reason);
  }

  async removeBlockedDate(restaurantId: string, id: string): Promise<void> {
    return this.repo.removeBlockedDate(restaurantId, id);
  }

  async upsertRestaurantEvent(
    restaurantId: string,
    cmd: UpsertRestaurantEventCommand,
  ): Promise<RestaurantEventView> {
    return this.repo.upsertEvent(restaurantId, cmd);
  }

  async deleteRestaurantEvent(restaurantId: string, eventId: string): Promise<void> {
    return this.repo.deleteEvent(restaurantId, eventId);
  }

  async createAdminReservation(
    restaurantId: string,
    cmd: AdminCreateReservationCommand,
  ): Promise<ReservationView> {
    const code = generateReservationCode();
    return this.repo.createReservation(restaurantId, cmd, code);
  }

  async updateReservation(
    restaurantId: string,
    cmd: UpdateReservationCommand,
  ): Promise<ReservationView> {
    return this.repo.updateReservation(restaurantId, cmd);
  }

  async updateReservationStatus(
    restaurantId: string,
    id: string,
    status: ReservationStatus,
  ): Promise<ReservationView> {
    return this.repo.updateReservationStatus(restaurantId, id, status);
  }

  async deleteReservation(restaurantId: string, id: string): Promise<void> {
    return this.repo.deleteReservation(restaurantId, id);
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
    const context = await this.repo.getRestaurantPublicContext(slug);
    if (!context) {
      throw new NotFoundError("Restaurante no encontrado");
    }
    if (!context.landingEnabled) {
      throw new ForbiddenError("Las reservas no están habilitadas para este restaurante");
    }

    const todayIso = getTodayIsoString();
    let fromIso = query.from || query.date || todayIso;
    if (fromIso < todayIso) fromIso = todayIso;
    const requestedTo = query.to || query.date || addDaysToIso(fromIso, 60);
    if (requestedTo < fromIso) {
      throw new BadRequestError("La fecha final debe ser igual o posterior a la inicial.");
    }
    const toIso = requestedTo < addDaysToIso(fromIso, 119)
      ? requestedTo
      : addDaysToIso(fromIso, 119);

    const datesList = generateDatesInRange(fromIso, toIso);

    const [timeSlots, recurringClosures, blockedDates, events] =
      await Promise.all([
        this.repo.getTimeSlots(context.restaurantId),
        this.repo.getRecurringClosures(context.restaurantId),
        this.repo.getBlockedDates(context.restaurantId),
        this.repo.getAvailabilityEvents(context.restaurantId, { from: fromIso, to: toIso }),
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
      occupiedSpots: e.occupiedSpots,
    }));

    const availability = computeAvailability({
      dates: datesList,
      activeSlots,
      recurringClosures: domainClosures,
      blockedDates: domainBlockedDates,
      events: domainEvents,
      reservations: [],
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
    const context = await this.repo.getRestaurantPublicContext(slug);
    if (!context || !context.landingEnabled) {
      throw new ForbiddenError("Las reservas no están habilitadas para este restaurante");
    }

    const targetEvent = await this.repo.getEventById(context.restaurantId, cmd.eventId);
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
    const context = await this.repo.getRestaurantPublicContext(slug);
    if (!context) {
      throw new NotFoundError("Restaurante no encontrado");
    }
    if (!context.landingEnabled) {
      throw new ForbiddenError("Las reservas no están habilitadas para este restaurante");
    }

    let reservationCommand = cmd;
    if (cmd.eventId) {
      const event = await this.repo.getEventById(context.restaurantId, cmd.eventId);
      if (!event || event.status !== "PUBLISHED") {
        throw new NotFoundError("El evento seleccionado no existe o no está publicado.");
      }
      reservationCommand = { ...cmd, date: event.date, time: event.startTime };
    }

    const todayIso = getTodayIsoString();
    if (reservationCommand.date < todayIso) {
      throw new BadRequestError("No se pueden realizar reservas para fechas pasadas.");
    }

    // Availability validation check
    const availResult = await this.getPublicAvailability(slug, {
      from: reservationCommand.date,
      to: reservationCommand.date,
    });
    const dateAvail = availResult.availability.dates[0];

    if (cmd.eventId) {
      const targetEvent = availResult.availability.events.find(
        (e) => e.id === cmd.eventId,
      );
      if (!targetEvent) {
        throw new NotFoundError("El evento seleccionado no existe o no está publicado.");
      }
      if (!targetEvent.available || targetEvent.remainingSpots < cmd.partySize) {
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
      ...reservationCommand,
      adminNotes: "",
      status: "PENDING",
      source: "LANDING",
    };

    return this.repo.createReservation(context.restaurantId, adminCommand, code);
  }
}
