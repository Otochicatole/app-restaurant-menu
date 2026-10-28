"use server";

import { revalidatePath } from "next/cache";
import {
  actionErrorResult,
  actionSuccess,
  type ActionResult,
} from "@/platform/application/action-result";
import { ForbiddenError } from "@/platform/application/errors";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import {
  addBlockedDateSchema,
  adminCreateReservationSchema,
  reservationStatusSchema,
  setRecurringClosuresSchema,
  updateReservationSchema,
  upsertRestaurantEventSchema,
  upsertTimeSlotSchema,
  type AddBlockedDateCommand,
  type AdminCreateReservationCommand,
  type BlockedDateView,
  type RecurringClosureView,
  type ReservationStatus,
  type ReservationView,
  type RestaurantEventView,
  type SetRecurringClosuresCommand,
  type TimeSlotView,
  type UpdateReservationCommand,
  type UpsertRestaurantEventCommand,
  type UpsertTimeSlotCommand,
} from "../contracts";
import { reservationManagementService } from "../infrastructure/composition";

async function assertCanManageReservations(restaurantId: string) {
  await requireRestaurantContext(restaurantId, { allowSuperAdmin: true });
  const isEnabled = await reservationManagementService.isLandingEnabled(restaurantId);
  if (!isEnabled) {
    throw new ForbiddenError(
      "La funcionalidad de Landing y Reservas no está habilitada para este restaurante",
    );
  }
}

export async function upsertTimeSlotAction(
  restaurantId: string,
  input: UpsertTimeSlotCommand,
): Promise<ActionResult<TimeSlotView>> {
  try {
    await assertCanManageReservations(restaurantId);
    const cmd = upsertTimeSlotSchema.parse(input);
    const data = await reservationManagementService.upsertTimeSlot(restaurantId, cmd);
    revalidatePath("/admin/restaurantes/[restaurantId]/reservas", "page");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo guardar el turno de atención");
  }
}

export async function deleteTimeSlotAction(
  restaurantId: string,
  slotId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageReservations(restaurantId);
    await reservationManagementService.deleteTimeSlot(restaurantId, slotId);
    revalidatePath("/admin/restaurantes/[restaurantId]/reservas", "page");
    return actionSuccess({ deletedId: slotId });
  } catch (error) {
    return actionErrorResult(error, "No se pudo eliminar el turno de atención");
  }
}

export async function setRecurringClosuresAction(
  restaurantId: string,
  input: SetRecurringClosuresCommand,
): Promise<ActionResult<RecurringClosureView[]>> {
  try {
    await assertCanManageReservations(restaurantId);
    const cmd = setRecurringClosuresSchema.parse(input);
    const data = await reservationManagementService.setRecurringClosures(
      restaurantId,
      cmd.closures,
    );
    revalidatePath("/admin/restaurantes/[restaurantId]/reservas", "page");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudieron actualizar los días de cierre semanal",
    );
  }
}

export async function addBlockedDateAction(
  restaurantId: string,
  input: AddBlockedDateCommand,
): Promise<ActionResult<BlockedDateView>> {
  try {
    await assertCanManageReservations(restaurantId);
    const cmd = addBlockedDateSchema.parse(input);
    const data = await reservationManagementService.addBlockedDate(
      restaurantId,
      cmd.date,
      cmd.reason,
    );
    revalidatePath("/admin/restaurantes/[restaurantId]/reservas", "page");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo bloquear la fecha seleccionada");
  }
}

export async function removeBlockedDateAction(
  restaurantId: string,
  blockedDateId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageReservations(restaurantId);
    await reservationManagementService.removeBlockedDate(restaurantId, blockedDateId);
    revalidatePath("/admin/restaurantes/[restaurantId]/reservas", "page");
    return actionSuccess({ deletedId: blockedDateId });
  } catch (error) {
    return actionErrorResult(error, "No se pudo desbloquear la fecha");
  }
}

export async function upsertRestaurantEventAction(
  restaurantId: string,
  input: UpsertRestaurantEventCommand,
): Promise<ActionResult<RestaurantEventView>> {
  try {
    await assertCanManageReservations(restaurantId);
    const cmd = upsertRestaurantEventSchema.parse(input);
    const data = await reservationManagementService.upsertRestaurantEvent(
      restaurantId,
      cmd,
    );
    revalidatePath("/admin/restaurantes/[restaurantId]/reservas", "page");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo guardar el evento");
  }
}

export async function deleteRestaurantEventAction(
  restaurantId: string,
  eventId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageReservations(restaurantId);
    await reservationManagementService.deleteRestaurantEvent(restaurantId, eventId);
    revalidatePath("/admin/restaurantes/[restaurantId]/reservas", "page");
    return actionSuccess({ deletedId: eventId });
  } catch (error) {
    return actionErrorResult(error, "No se pudo eliminar el evento");
  }
}

export async function createAdminReservationAction(
  restaurantId: string,
  input: AdminCreateReservationCommand,
): Promise<ActionResult<ReservationView>> {
  try {
    await assertCanManageReservations(restaurantId);
    const cmd = adminCreateReservationSchema.parse(input);
    const data = await reservationManagementService.createAdminReservation(
      restaurantId,
      cmd,
    );
    revalidatePath("/admin/restaurantes/[restaurantId]/reservas", "page");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo crear la reserva");
  }
}

export async function updateReservationAction(
  restaurantId: string,
  input: UpdateReservationCommand,
): Promise<ActionResult<ReservationView>> {
  try {
    await assertCanManageReservations(restaurantId);
    const cmd = updateReservationSchema.parse(input);
    const data = await reservationManagementService.updateReservation(
      restaurantId,
      cmd,
    );
    revalidatePath("/admin/restaurantes/[restaurantId]/reservas", "page");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo actualizar la reserva");
  }
}

export async function updateReservationStatusAction(
  restaurantId: string,
  reservationId: string,
  status: ReservationStatus,
): Promise<ActionResult<ReservationView>> {
  try {
    await assertCanManageReservations(restaurantId);
    const parsedStatus = reservationStatusSchema.parse(status);
    const data = await reservationManagementService.updateReservationStatus(
      restaurantId,
      reservationId,
      parsedStatus,
    );
    revalidatePath("/admin/restaurantes/[restaurantId]/reservas", "page");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo actualizar el estado de la reserva",
    );
  }
}

export async function deleteReservationAction(
  restaurantId: string,
  reservationId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageReservations(restaurantId);
    await reservationManagementService.deleteReservation(restaurantId, reservationId);
    revalidatePath("/admin/restaurantes/[restaurantId]/reservas", "page");
    return actionSuccess({ deletedId: reservationId });
  } catch (error) {
    return actionErrorResult(error, "No se pudo eliminar la reserva");
  }
}
