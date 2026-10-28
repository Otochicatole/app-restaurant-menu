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
import type { DomainRestaurantEvent } from "../domain/availability-engine";

export interface ReservationRepositoryPort {
  isLandingEnabled(restaurantId: string): Promise<boolean>;
  getRestaurantInfo(restaurantId: string): Promise<{
    name: string;
    landingSlug: string;
  } | null>;
  getRestaurantPublicContext(slug: string): Promise<{
    restaurantId: string;
    name: string;
    slug: string;
    landingEnabled: boolean;
  } | null>;

  // Time slots
  getTimeSlots(restaurantId: string): Promise<TimeSlotView[]>;
  upsertTimeSlot(restaurantId: string, cmd: UpsertTimeSlotCommand): Promise<TimeSlotView>;
  deleteTimeSlot(restaurantId: string, slotId: string): Promise<void>;

  // Recurring closures
  getRecurringClosures(restaurantId: string): Promise<RecurringClosureView[]>;
  setRecurringClosures(
    restaurantId: string,
    closures: { dayOfWeek: number; reason: string }[],
  ): Promise<RecurringClosureView[]>;

  // Blocked dates
  getBlockedDates(restaurantId: string): Promise<BlockedDateView[]>;
  addBlockedDate(restaurantId: string, date: string, reason: string): Promise<BlockedDateView>;
  removeBlockedDate(restaurantId: string, id: string): Promise<void>;

  // Events
  getEvents(restaurantId: string): Promise<RestaurantEventView[]>;
  getEventById(restaurantId: string, eventId: string): Promise<RestaurantEventView | null>;
  getAvailabilityEvents(
    restaurantId: string,
    range: { from: string; to: string },
  ): Promise<DomainRestaurantEvent[]>;
  upsertEvent(restaurantId: string, cmd: UpsertRestaurantEventCommand): Promise<RestaurantEventView>;
  deleteEvent(restaurantId: string, eventId: string): Promise<void>;

  // Reservations
  getReservations(
    restaurantId: string,
    filter?: { date?: string; status?: ReservationStatus },
  ): Promise<ReservationView[]>;
  getReservationById(restaurantId: string, reservationId: string): Promise<ReservationView | null>;
  createReservation(
    restaurantId: string,
    cmd: AdminCreateReservationCommand,
    code: string,
  ): Promise<ReservationView>;
  updateReservation(restaurantId: string, cmd: UpdateReservationCommand): Promise<ReservationView>;
  updateReservationStatus(
    restaurantId: string,
    id: string,
    status: ReservationStatus,
  ): Promise<ReservationView>;
  deleteReservation(restaurantId: string, id: string): Promise<void>;
}
