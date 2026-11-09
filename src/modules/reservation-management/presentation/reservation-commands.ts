import type { ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import type { ActionResult } from "@/platform/application/action-result";
import type { AdminCreateReservationCommand, ReservationStatus, RestaurantEventView, TimeSlotView, UpdateReservationCommand, UpsertRestaurantEventCommand, UpsertTimeSlotCommand } from "../contracts";
import { STATUS_LABEL } from "./reservation-labels";
import {
  addBlockedDateAction, createAdminReservationAction, deleteReservationAction, deleteRestaurantEventAction,
  deleteTimeSlotAction, removeBlockedDateAction, setRecurringClosuresAction, updateReservationAction,
  updateReservationStatusAction, upsertRestaurantEventAction, upsertTimeSlotAction,
} from "./actions";
import { dialogOpened, feedbackChanged, reservationWorkspace, writeFinished, writeStarted } from "./reservation-workspace";

type State = ReturnType<ReturnType<typeof reservationWorkspace.makeStore>["getState"]>;
type Command<Result = Promise<boolean>> = ThunkAction<Result, State, unknown, UnknownAction>;
type WriteUpdate = Omit<ReturnType<typeof writeFinished>["payload"], "id">;

function write<T>(
  dialogId: number | null,
  send: (state: State) => Promise<ActionResult<T>>,
  committed: (value: T, state: State) => WriteUpdate,
): Command {
  return async (dispatch, getState) => {
    const current = getState();
    if (current.write || (dialogId !== null && current.dialog?.id !== dialogId)) return false;
    dispatch(writeStarted(dialogId));
    const id = getState().writeSequence;
    try {
      const result = await send(current);
      if (result.success) {
        dispatch(writeFinished({ ...committed(result.data, getState()), id }));
      } else {
        dispatch(writeFinished({ id, feedback: { type: "error", message: result.error.message } }));
      }
      return result.success;
    } catch (error) {
      dispatch(writeFinished({ id, feedback: { type: "error", message: error instanceof Error ? error.message : "No se pudo completar la operación." } }));
      return false;
    }
  };
}

const success = (message: string) => ({ type: "success" as const, message });

export function openManualReservation(today: string, event?: RestaurantEventView): Command<void> {
  return (dispatch, getState) => {
    const { data, filters } = getState();
    dispatch(dialogOpened({
      kind: "reservation",
      date: event?.date ?? (filters.dateFilter || today),
      time: event?.startTime ?? (data.timeSlots[0]?.time || "20:00"),
      eventId: event?.id,
    }));
  };
}

export function saveReservation(dialogId: number, form: AdminCreateReservationCommand): Command {
  return async (dispatch, getState) => {
    const { data, dialog, assignment, write: activeWrite } = getState();
    if (activeWrite || dialog?.kind !== "reservation" || dialog.id !== dialogId) return false;
    const selected = form.status === "CONFIRMED" ? assignment : null;
    const message = form.status === "CONFIRMED" && data.floorManagementEnabled && !selected
      ? "Seleccioná y ubicá las mesas antes de confirmar la reserva."
      : selected?.capacity !== undefined && selected.capacity < form.partySize
        ? "El armado necesita más lugares útiles para esta reserva." : null;
    if (message) {
      dispatch(feedbackChanged({ type: "error", message, dialogId }));
      return false;
    }
    const editing = dialog.editing;
    const { customerName, customerEmail, customerPhone, partySize, date, time, notes, adminNotes, status } = form;
    const arrangement = selected ? { assignment: selected } : {};
    return dispatch(write(dialogId, () => editing
      ? updateReservationAction(data.restaurantId, {
        id: editing.id, expectedRevision: editing.revision, customerName, customerEmail: customerEmail || "",
        customerPhone, partySize, date, time, notes: notes || "", adminNotes: adminNotes || "", status, ...arrangement,
      })
      : createAdminReservationAction(data.restaurantId, { ...form, ...arrangement }),
    (reservation) => ({ reservation, closeDialog: true, feedback: success(editing ? "Reserva actualizada con éxito." : "Reserva creada con código " + reservation.code) })));
  };
}

export function requestReservationStatus(reservationId: string, status: ReservationStatus): Command {
  return async (dispatch, getState) => {
    const { data, dialog, write: activeWrite } = getState();
    if (activeWrite) return false;
    const reservation = data.reservations.find((item) => item.id === reservationId);
    if (!reservation) return false;
    if (status === "CONFIRMED" && data.floorManagementEnabled) {
      dispatch(dialogOpened({ kind: "assignment", reservation }));
      return false;
    }
    return dispatch(write(dialog?.kind === "receipt" ? dialog.id : null,
      () => updateReservationStatusAction(data.restaurantId, reservation.id, status, { expectedRevision: reservation.revision }),
      (reservation) => ({ reservation, feedback: success('Estado actualizado a "' + STATUS_LABEL[status] + '"') })));
  };
}

const confirmationFields = ["customerName", "customerEmail", "customerPhone", "partySize", "date", "time", "notes", "adminNotes"] as const;
export type ReservationConfirmationDetails = Pick<UpdateReservationCommand, (typeof confirmationFields)[number]>;

export function confirmAssignment(dialogId: number, details: ReservationConfirmationDetails): Command {
  return async (dispatch, getState) => {
    const { data, dialog, assignment } = getState();
    if (dialog?.kind !== "assignment" || dialog.id !== dialogId || !assignment) return false;
    const { reservation } = dialog;
    if (assignment.capacity !== undefined && assignment.capacity < details.partySize) return false;
    const options = { assignment, expectedRevision: reservation.revision };
    const edited = confirmationFields.some((field) => details[field] !== reservation[field]);
    return dispatch(write(dialogId, () => edited
      ? updateReservationAction(data.restaurantId, { ...details, id: reservation.id, status: "CONFIRMED", ...options })
      : updateReservationStatusAction(data.restaurantId, reservation.id, "CONFIRMED", options),
    (reservation) => ({ reservation, closeDialog: true, feedback: success('Estado actualizado a "Confirmada"') })));
  };
}

export const removeReservation = (dialogId: number, reservationId: string) =>
  write(dialogId, ({ data }) => deleteReservationAction(data.restaurantId, reservationId), ({ deletedId }, { data }) => ({
    collections: { reservations: data.reservations.filter(({ id }) => id !== deletedId) }, closeDialog: true, feedback: success("Reserva eliminada."),
  }));

export const saveEvent = (dialogId: number, command: UpsertRestaurantEventCommand) =>
  write(dialogId, ({ data }) => upsertRestaurantEventAction(data.restaurantId, command), (event, { data }) => ({
    collections: { events: [...data.events.filter(({ id }) => id !== event.id), event].sort((a, b) => a.date.localeCompare(b.date)) },
    closeDialog: true, feedback: success("Evento guardado."),
  }));

export const removeEvent = (dialogId: number, eventId: string) =>
  write(dialogId, ({ data }) => deleteRestaurantEventAction(data.restaurantId, eventId), (_, { data }) => ({
    collections: { events: data.events.filter(({ id }) => id !== eventId) }, closeDialog: true, feedback: success("Evento eliminado."),
  }));

export const saveSlot = (dialogId: number, command: UpsertTimeSlotCommand) =>
  write(dialogId, ({ data }) => upsertTimeSlotAction(data.restaurantId, command), (slot, { data }) => ({
    collections: { timeSlots: [...data.timeSlots.filter(({ id }) => id !== slot.id), slot].sort((a, b) => a.time.localeCompare(b.time)) },
    closeDialog: true, feedback: success("Turno guardado con éxito."),
  }));

export const toggleSlot = (slot: TimeSlotView) =>
  write(null, ({ data }) => upsertTimeSlotAction(data.restaurantId, {
    id: slot.id, time: slot.time, label: slot.label, active: !slot.active, sortOrder: slot.sortOrder,
  }), (updated, { data }) => ({
    collections: { timeSlots: data.timeSlots.map((item) => item.id === slot.id ? updated : item) },
  }));

export const removeSlot = (slotId: string) =>
  write(null, ({ data }) => deleteTimeSlotAction(data.restaurantId, slotId), (_, { data }) => ({
    collections: { timeSlots: data.timeSlots.filter(({ id }) => id !== slotId) }, feedback: success("Turno eliminado."),
  }));

export const toggleRecurringDay = (dayOfWeek: number) =>
  write(null, ({ data }) => {
    const closures = data.recurringClosures.map(({ dayOfWeek, reason }) => ({ dayOfWeek, reason }));
    return setRecurringClosuresAction(data.restaurantId, {
      closures: closures.some((item) => item.dayOfWeek === dayOfWeek)
        ? closures.filter((item) => item.dayOfWeek !== dayOfWeek)
        : [...closures, { dayOfWeek, reason: "Cerrado por descanso semanal" }],
    });
  }, (recurringClosures) => ({ collections: { recurringClosures }, feedback: success("Días de descanso semanal actualizados.") }));

export const addBlockedDate = (command: { date: string; reason: string }) =>
  write(null, ({ data }) => addBlockedDateAction(data.restaurantId, command), (blocked, { data }) => ({
    collections: { blockedDates: [...data.blockedDates.filter(({ date }) => date !== blocked.date), blocked].sort((a, b) => a.date.localeCompare(b.date)) },
    feedback: success("Fecha bloqueada con éxito."),
  }));

export const removeBlockedDate = (blockedDateId: string) =>
  write(null, ({ data }) => removeBlockedDateAction(data.restaurantId, blockedDateId), (_, { data }) => ({
    collections: { blockedDates: data.blockedDates.filter(({ id }) => id !== blockedDateId) }, feedback: success("Fecha desbloqueada."),
  }));
