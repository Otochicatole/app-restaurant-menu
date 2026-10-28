import "server-only";

import { reservationManagementService } from "./infrastructure/composition";

export {
  addBlockedDateAction,
  createAdminReservationAction,
  deleteReservationAction,
  deleteRestaurantEventAction,
  deleteTimeSlotAction,
  removeBlockedDateAction,
  setRecurringClosuresAction,
  updateReservationAction,
  updateReservationStatusAction,
  upsertRestaurantEventAction,
  upsertTimeSlotAction,
} from "./presentation/actions";

export type {
  AddBlockedDateCommand,
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
  RestaurantEventStatus,
  RestaurantEventView,
  SetRecurringClosuresCommand,
  TimeSlotView,
  UpdateReservationCommand,
  UpsertRestaurantEventCommand,
  UpsertTimeSlotCommand,
} from "./contracts";

export {
  addBlockedDateSchema,
  adminCreateReservationSchema,
  publicAvailabilityQuerySchema,
  publicCreateReservationSchema,
  publicCreateTableReservationSchema,
  publicCreateEventReservationSchema,
  recurringClosureItemSchema,
  reservationStatusSchema,
  restaurantEventStatusSchema,
  setRecurringClosuresSchema,
  updateReservationSchema,
  upsertRestaurantEventSchema,
  upsertTimeSlotSchema,
} from "./contracts";

export const reservationManagement = reservationManagementService;
