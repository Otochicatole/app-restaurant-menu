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

export interface ReservationRepositoryPort {
  isLandingEnabled(tenantId: string): Promise<boolean>;
  getTenantPublicContext(slug: string): Promise<{
    tenantId: string;
    name: string;
    slug: string;
    landingEnabled: boolean;
  } | null>;

  // Time slots
  getTimeSlots(tenantId: string): Promise<TimeSlotView[]>;
  upsertTimeSlot(tenantId: string, cmd: UpsertTimeSlotCommand): Promise<TimeSlotView>;
  deleteTimeSlot(tenantId: string, slotId: string): Promise<void>;

  // Recurring closures
  getRecurringClosures(tenantId: string): Promise<RecurringClosureView[]>;
  setRecurringClosures(
    tenantId: string,
    closures: { dayOfWeek: number; reason: string }[],
  ): Promise<RecurringClosureView[]>;

  // Blocked dates
  getBlockedDates(tenantId: string): Promise<BlockedDateView[]>;
  addBlockedDate(tenantId: string, date: string, reason: string): Promise<BlockedDateView>;
  removeBlockedDate(tenantId: string, id: string): Promise<void>;

  // Events
  getEvents(tenantId: string): Promise<RestaurantEventView[]>;
  upsertEvent(tenantId: string, cmd: UpsertRestaurantEventCommand): Promise<RestaurantEventView>;
  deleteEvent(tenantId: string, eventId: string): Promise<void>;

  // Reservations
  getReservations(
    tenantId: string,
    filter?: { date?: string; status?: ReservationStatus },
  ): Promise<ReservationView[]>;
  getReservationById(tenantId: string, reservationId: string): Promise<ReservationView | null>;
  createReservation(
    tenantId: string,
    cmd: AdminCreateReservationCommand,
    code: string,
  ): Promise<ReservationView>;
  updateReservation(tenantId: string, cmd: UpdateReservationCommand): Promise<ReservationView>;
  updateReservationStatus(
    tenantId: string,
    id: string,
    status: ReservationStatus,
  ): Promise<ReservationView>;
  deleteReservation(tenantId: string, id: string): Promise<void>;
}
