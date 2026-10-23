export type DayOfWeekNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

export interface DomainTimeSlot {
  id: string;
  time: string; // "HH:mm"
  label: string;
  sortOrder?: number;
}

export interface DomainRecurringClosure {
  dayOfWeek: number;
  reason?: string;
}

export interface DomainBlockedDate {
  date: string; // "YYYY-MM-DD"
  reason?: string;
}

export interface DomainRestaurantEvent {
  id: string;
  title: string;
  description: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string;
  capacity: number;
  priceLabel: string;
  imageUrl: string;
  blocksRegularReservations: boolean;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
}

export interface DomainReservation {
  id: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "REJECTED";
  partySize: number;
  eventId?: string | null;
}

export type DateAvailabilityStatus =
  | "AVAILABLE"
  | "FULLY_BOOKED"
  | "CLOSED_RECURRING"
  | "BLOCKED_DATE"
  | "EVENT_EXCLUSIVE"
  | "NO_SHIFTS_CONFIGURED"
  | "PAST_DATE";

export interface AvailableSlotView {
  id: string;
  time: string;
  label: string;
}

export interface DateAvailabilityView {
  date: string; // "YYYY-MM-DD"
  dayOfWeek: number; // 0..6
  available: boolean;
  status: DateAvailabilityStatus;
  reason: string | null;
  totalSlots: number;
  availableSlots: AvailableSlotView[];
  occupiedTimes: string[];
}

export interface PublicEventAvailabilityView {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  priceLabel: string;
  imageUrl: string;
  capacity: number;
  remainingSpots: number;
  available: boolean;
  blocksRegularReservations: boolean;
}

export interface ComputeAvailabilityInput {
  dates: string[]; // List of "YYYY-MM-DD"
  activeSlots: DomainTimeSlot[];
  recurringClosures: DomainRecurringClosure[];
  blockedDates: DomainBlockedDate[];
  events: DomainRestaurantEvent[];
  reservations: DomainReservation[];
  todayIso?: string; // Optional "YYYY-MM-DD" reference for past check
}

export interface AvailabilityResult {
  dates: DateAvailabilityView[];
  events: PublicEventAvailabilityView[];
}

/**
 * Calculates day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday) from "YYYY-MM-DD"
 * without timezone drifting.
 */
export function getDayOfWeekFromIsoDate(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return 0;
  // Use UTC to avoid daylight saving or client local timezone shifts
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCDay();
}

/**
 * Checks whether a reservation status occupies a table slot.
 * PENDING, CONFIRMED, COMPLETED occupy the slot.
 * CANCELLED, REJECTED release the slot.
 */
export function isOccupyingReservation(status: DomainReservation["status"]): boolean {
  return status === "PENDING" || status === "CONFIRMED" || status === "COMPLETED";
}

/**
 * Pure domain availability engine for table reservations & events.
 */
export function computeAvailability({
  dates,
  activeSlots,
  recurringClosures,
  blockedDates,
  events,
  reservations,
  todayIso,
}: ComputeAvailabilityInput): AvailabilityResult {
  const sortedSlots = [...activeSlots].sort((a, b) => {
    const orderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return a.time.localeCompare(b.time);
  });

  const recurringClosureMap = new Map<number, string>();
  for (const rc of recurringClosures) {
    recurringClosureMap.set(rc.dayOfWeek, rc.reason || "Cerrado por descanso semanal");
  }

  const blockedDateMap = new Map<string, string>();
  for (const bd of blockedDates) {
    blockedDateMap.set(bd.date, bd.reason || "Cerrado por fecha especial");
  }

  // Pre-filter published events
  const publishedEvents = events.filter((e) => e.status === "PUBLISHED");
  const publishedEventsByDate = new Map<string, DomainRestaurantEvent[]>();
  for (const pe of publishedEvents) {
    const list = publishedEventsByDate.get(pe.date) ?? [];
    list.push(pe);
    publishedEventsByDate.set(pe.date, list);
  }

  // Group active reservations by date
  const activeRegularReservationsByDate = new Map<string, Set<string>>();
  const activeEventReservationsByEvent = new Map<string, number>();

  for (const r of reservations) {
    if (!isOccupyingReservation(r.status)) continue;

    if (r.eventId) {
      const count = activeEventReservationsByEvent.get(r.eventId) ?? 0;
      activeEventReservationsByEvent.set(r.eventId, count + 1);
    } else {
      const occupied = activeRegularReservationsByDate.get(r.date) ?? new Set<string>();
      occupied.add(r.time);
      activeRegularReservationsByDate.set(r.date, occupied);
    }
  }

  // 1. Process Dates
  const processedDates: DateAvailabilityView[] = dates.map((dateStr) => {
    const dayOfWeek = getDayOfWeekFromIsoDate(dateStr);

    if (todayIso && dateStr < todayIso) {
      return {
        date: dateStr,
        dayOfWeek,
        available: false,
        status: "PAST_DATE",
        reason: "Fecha pasada",
        totalSlots: sortedSlots.length,
        availableSlots: [],
        occupiedTimes: [],
      };
    }

    if (sortedSlots.length === 0) {
      return {
        date: dateStr,
        dayOfWeek,
        available: false,
        status: "NO_SHIFTS_CONFIGURED",
        reason: "No hay horarios de atención configurados",
        totalSlots: 0,
        availableSlots: [],
        occupiedTimes: [],
      };
    }

    if (recurringClosureMap.has(dayOfWeek)) {
      return {
        date: dateStr,
        dayOfWeek,
        available: false,
        status: "CLOSED_RECURRING",
        reason: recurringClosureMap.get(dayOfWeek) ?? "Cerrado por descanso semanal",
        totalSlots: sortedSlots.length,
        availableSlots: [],
        occupiedTimes: [],
      };
    }

    if (blockedDateMap.has(dateStr)) {
      return {
        date: dateStr,
        dayOfWeek,
        available: false,
        status: "BLOCKED_DATE",
        reason: blockedDateMap.get(dateStr) ?? "Cerrado por fecha especial",
        totalSlots: sortedSlots.length,
        availableSlots: [],
        occupiedTimes: [],
      };
    }

    const dayEvents = publishedEventsByDate.get(dateStr) ?? [];
    const hasExclusiveEvent = dayEvents.some((e) => e.blocksRegularReservations);
    if (hasExclusiveEvent) {
      return {
        date: dateStr,
        dayOfWeek,
        available: false,
        status: "EVENT_EXCLUSIVE",
        reason: "Fecha con evento exclusivo",
        totalSlots: sortedSlots.length,
        availableSlots: [],
        occupiedTimes: [],
      };
    }

    const occupiedTimesSet = activeRegularReservationsByDate.get(dateStr) ?? new Set<string>();
    const occupiedTimes = Array.from(occupiedTimesSet);

    const availableSlots: AvailableSlotView[] = sortedSlots
      .filter((slot) => !occupiedTimesSet.has(slot.time))
      .map((slot) => ({
        id: slot.id,
        time: slot.time,
        label: slot.label || slot.time,
      }));

    if (availableSlots.length === 0) {
      return {
        date: dateStr,
        dayOfWeek,
        available: false,
        status: "FULLY_BOOKED",
        reason: "Todos los horarios de este día están reservados",
        totalSlots: sortedSlots.length,
        availableSlots: [],
        occupiedTimes,
      };
    }

    return {
      date: dateStr,
      dayOfWeek,
      available: true,
      status: "AVAILABLE",
      reason: null,
      totalSlots: sortedSlots.length,
      availableSlots,
      occupiedTimes,
    };
  });

  // 2. Process Events
  const processedEvents: PublicEventAvailabilityView[] = publishedEvents.map((evt) => {
    const bookedCount = activeEventReservationsByEvent.get(evt.id) ?? 0;
    const remainingSpots = Math.max(0, evt.capacity - bookedCount);
    return {
      id: evt.id,
      title: evt.title,
      description: evt.description,
      date: evt.date,
      startTime: evt.startTime,
      endTime: evt.endTime,
      priceLabel: evt.priceLabel,
      imageUrl: evt.imageUrl,
      capacity: evt.capacity,
      remainingSpots,
      available: remainingSpots > 0,
      blocksRegularReservations: evt.blocksRegularReservations,
    };
  });

  return {
    dates: processedDates,
    events: processedEvents,
  };
}
