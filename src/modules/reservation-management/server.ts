import "server-only";

import { reservationManagementService } from "./infrastructure/composition";
import { prisma } from "@/platform/database/prisma";
import type { FloorOptionsQuery } from "@/modules/floor-management/contracts";
import { getFloorAssignmentOptions as readFloorAssignmentOptions } from "./infrastructure/floor-allocations";
import { createWalkIn, getWalkInOptions, releaseWalkIn } from "./infrastructure/floor-walk-ins";
import type { CreateWalkInCommand } from "./contracts";
import { getFloorReassignmentOptions, reassignFloorAllocation, type FloorReassignmentCommand } from "./infrastructure/floor-reassignments";

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
  ReservationStatusOptions,
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

export function getFloorAssignmentOptions(restaurantId: string, query: FloorOptionsQuery) {
  return readFloorAssignmentOptions(prisma, restaurantId, query);
}

export { createWalkInSchema, walkInDurationSchema } from "./contracts";
export const floorWalkIns = {
  options: (restaurantId: string, partySize: number, durationMinutes: number) => getWalkInOptions(prisma, restaurantId, partySize, durationMinutes),
  create: (restaurantId: string, command: CreateWalkInCommand) => createWalkIn(prisma, restaurantId, command),
  release: (restaurantId: string, reservationId: string, expectedRevision: number) => releaseWalkIn(prisma, restaurantId, reservationId, expectedRevision),
};

export { floorReassignmentSchema } from "./infrastructure/floor-reassignments";
export type { FloorReassignmentCommand } from "./infrastructure/floor-reassignments";
export const floorReassignments = {
  options: (restaurantId: string, reservationId: string) => getFloorReassignmentOptions(prisma, restaurantId, reservationId),
  reassign: (restaurantId: string, command: FloorReassignmentCommand) => reassignFloorAllocation(prisma, restaurantId, command),
};
