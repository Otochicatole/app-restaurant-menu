import { AdminConfirmModal } from "@/ui/admin/AdminUI";
import { reservationWorkspace, dialogClosed } from "./reservation-workspace";
import { removeEvent, removeReservation } from "./reservation-commands";
import { ReservationWriteError } from "./ReservationUi";
import { ReservationReceipt, ReservationAttendees } from "./ReservationDetailsDialogs";
import { ReservationAssignment, ReservationEdit, ReservationEventEdit, ReservationSlotEdit } from "./ReservationEditDialogs";

export function ReservationDialogs({ today }: { today: string }) {
  const dialog = reservationWorkspace.useSelector((state) => state.dialog);
  if (!dialog) return null;
  switch (dialog.kind) {
    case "reservation": return <ReservationEdit key={dialog.id} dialog={dialog} />;
    case "assignment": return <ReservationAssignment key={dialog.id} dialog={dialog} />;
    case "receipt": return <ReservationReceipt key={dialog.id} dialog={dialog} />;
    case "event": return <ReservationEventEdit key={dialog.id} dialog={dialog} />;
    case "attendees": return <ReservationAttendees key={dialog.id} dialog={dialog} today={today} />;
    case "slot": return <ReservationSlotEdit key={dialog.id} dialog={dialog} />;
    case "deleteReservation": return <DeleteReservation key={dialog.id} dialogId={dialog.id} reservationId={dialog.reservationId} />;
    case "deleteEvent": return <DeleteEvent key={dialog.id} dialogId={dialog.id} eventId={dialog.eventId} />;
  }
}

function DeleteReservation({ dialogId, reservationId }: { dialogId: number; reservationId: string }) {
  const store = reservationWorkspace.useStore();
  const reservation = reservationWorkspace.useSelector((state) => state.data.reservations.find(({ id }) => id === reservationId));
  const loading = reservationWorkspace.useSelector((state) => state.write !== null);
  if (!reservation) return null;
  return <AdminConfirmModal open title="¿Eliminar esta reserva?"
    description={"Se eliminará la reserva " + reservation.code + " a nombre de " + reservation.customerName + ". Esta acción no se puede deshacer."}
    confirmLabel="Eliminar Reserva" loading={loading}
    onConfirm={async () => { await store.dispatch(removeReservation(dialogId, reservationId)); }}
    onClose={() => store.dispatch(dialogClosed(dialogId))}>
    <ReservationWriteError dialogId={dialogId} />
  </AdminConfirmModal>;
}

function DeleteEvent({ dialogId, eventId }: { dialogId: number; eventId: string }) {
  const store = reservationWorkspace.useStore();
  const event = reservationWorkspace.useSelector((state) => state.data.events.find(({ id }) => id === eventId));
  const loading = reservationWorkspace.useSelector((state) => state.write !== null);
  if (!event) return null;
  return <AdminConfirmModal open title="¿Eliminar este evento?"
    description={'Se eliminará "' + event.title + '". No afectará a las reservas que ya fueron confirmadas.'}
    confirmLabel="Eliminar Evento" loading={loading}
    onConfirm={async () => { await store.dispatch(removeEvent(dialogId, eventId)); }}
    onClose={() => store.dispatch(dialogClosed(dialogId))}>
    <ReservationWriteError dialogId={dialogId} />
  </AdminConfirmModal>;
}
