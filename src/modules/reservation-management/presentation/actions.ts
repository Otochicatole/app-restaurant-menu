"use server";

import { revalidatePath } from "next/cache";
import {
  actionErrorResult,
  actionSuccess,
  type ActionResult,
} from "@/platform/application/action-result";
import { ForbiddenError } from "@/platform/application/errors";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";
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

async function assertCanManageReservations(tenantId: string) {
  const actor = await requireAuthenticatedAccount();
  if (actor.kind === "tenant-admin") {
    if (actor.tenantId !== tenantId) {
      throw new ForbiddenError("No tenés acceso a este negocio");
    }
    const isEnabled = await reservationManagementService.isLandingEnabled(tenantId);
    if (!isEnabled) {
      throw new ForbiddenError(
        "La funcionalidad de Landing y Reservas no está habilitada por el Super Admin",
      );
    }
  }
}

export async function upsertTimeSlotAction(
  tenantId: string,
  input: UpsertTimeSlotCommand,
): Promise<ActionResult<TimeSlotView>> {
  try {
    await assertCanManageReservations(tenantId);
    const cmd = upsertTimeSlotSchema.parse(input);
    const data = await reservationManagementService.upsertTimeSlot(tenantId, cmd);
    revalidatePath("/admin/reservas");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo guardar el turno de atención");
  }
}

export async function deleteTimeSlotAction(
  tenantId: string,
  slotId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageReservations(tenantId);
    await reservationManagementService.deleteTimeSlot(tenantId, slotId);
    revalidatePath("/admin/reservas");
    return actionSuccess({ deletedId: slotId });
  } catch (error) {
    return actionErrorResult(error, "No se pudo eliminar el turno de atención");
  }
}

export async function setRecurringClosuresAction(
  tenantId: string,
  input: SetRecurringClosuresCommand,
): Promise<ActionResult<RecurringClosureView[]>> {
  try {
    await assertCanManageReservations(tenantId);
    const cmd = setRecurringClosuresSchema.parse(input);
    const data = await reservationManagementService.setRecurringClosures(
      tenantId,
      cmd.closures,
    );
    revalidatePath("/admin/reservas");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudieron actualizar los días de cierre semanal",
    );
  }
}

export async function addBlockedDateAction(
  tenantId: string,
  input: AddBlockedDateCommand,
): Promise<ActionResult<BlockedDateView>> {
  try {
    await assertCanManageReservations(tenantId);
    const cmd = addBlockedDateSchema.parse(input);
    const data = await reservationManagementService.addBlockedDate(
      tenantId,
      cmd.date,
      cmd.reason,
    );
    revalidatePath("/admin/reservas");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo bloquear la fecha seleccionada");
  }
}

export async function removeBlockedDateAction(
  tenantId: string,
  blockedDateId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageReservations(tenantId);
    await reservationManagementService.removeBlockedDate(tenantId, blockedDateId);
    revalidatePath("/admin/reservas");
    return actionSuccess({ deletedId: blockedDateId });
  } catch (error) {
    return actionErrorResult(error, "No se pudo desbloquear la fecha");
  }
}

export async function upsertRestaurantEventAction(
  tenantId: string,
  input: UpsertRestaurantEventCommand,
): Promise<ActionResult<RestaurantEventView>> {
  try {
    await assertCanManageReservations(tenantId);
    const cmd = upsertRestaurantEventSchema.parse(input);
    const data = await reservationManagementService.upsertRestaurantEvent(
      tenantId,
      cmd,
    );
    revalidatePath("/admin/reservas");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo guardar el evento");
  }
}

export async function deleteRestaurantEventAction(
  tenantId: string,
  eventId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageReservations(tenantId);
    await reservationManagementService.deleteRestaurantEvent(tenantId, eventId);
    revalidatePath("/admin/reservas");
    return actionSuccess({ deletedId: eventId });
  } catch (error) {
    return actionErrorResult(error, "No se pudo eliminar el evento");
  }
}

export async function createAdminReservationAction(
  tenantId: string,
  input: AdminCreateReservationCommand,
): Promise<ActionResult<ReservationView>> {
  try {
    await assertCanManageReservations(tenantId);
    const cmd = adminCreateReservationSchema.parse(input);
    const data = await reservationManagementService.createAdminReservation(
      tenantId,
      cmd,
    );
    revalidatePath("/admin/reservas");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo crear la reserva");
  }
}

export async function updateReservationAction(
  tenantId: string,
  input: UpdateReservationCommand,
): Promise<ActionResult<ReservationView>> {
  try {
    await assertCanManageReservations(tenantId);
    const cmd = updateReservationSchema.parse(input);
    const data = await reservationManagementService.updateReservation(
      tenantId,
      cmd,
    );
    revalidatePath("/admin/reservas");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo actualizar la reserva");
  }
}

export async function updateReservationStatusAction(
  tenantId: string,
  reservationId: string,
  status: ReservationStatus,
): Promise<ActionResult<ReservationView>> {
  try {
    await assertCanManageReservations(tenantId);
    const parsedStatus = reservationStatusSchema.parse(status);
    const data = await reservationManagementService.updateReservationStatus(
      tenantId,
      reservationId,
      parsedStatus,
    );
    revalidatePath("/admin/reservas");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo actualizar el estado de la reserva",
    );
  }
}

export async function deleteReservationAction(
  tenantId: string,
  reservationId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageReservations(tenantId);
    await reservationManagementService.deleteReservation(tenantId, reservationId);
    revalidatePath("/admin/reservas");
    return actionSuccess({ deletedId: reservationId });
  } catch (error) {
    return actionErrorResult(error, "No se pudo eliminar la reserva");
  }
}
