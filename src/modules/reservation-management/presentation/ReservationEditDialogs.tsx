import { useId, useState } from "react";
import { FloorAssignmentPicker, FloorRoomSelector } from "@/modules/floor-management/ui";
import { type FloorAssignmentInput } from "@/modules/floor-management/contracts";
import { LayoutGrid, Loader2 } from "lucide-react";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { AdminModal } from "@/ui/admin/AdminUI";
import { type AdminCreateReservationCommand, type ReservationStatus, type UpsertRestaurantEventCommand, type UpsertTimeSlotCommand } from "../contracts";
import { reservationWorkspace, assignmentChanged, dialogClosed, type ActiveReservationDialog } from "./reservation-workspace";
import { confirmAssignment, saveEvent, saveReservation, saveSlot } from "./reservation-commands";
import { STATUS_LABEL, formatShortDate, preferredSectorLabel } from "./reservation-labels";
import { PreferredSector, reservationInputClass, ReservationSelect, ReservationField, ReservationWriteError } from "./ReservationUi";

export function ReservationAssignment({ dialog }: { dialog: ActiveReservationDialog & { kind: "assignment" } }) {
  const restaurantId = reservationWorkspace.useSelector((state) => state.data.restaurantId);
  const store = reservationWorkspace.useStore();
  const isPending = reservationWorkspace.useSelector((state) => state.write !== null);
  const close = () => store.dispatch(dialogClosed(dialog.id));
  const setAssignment = (assignment: FloorAssignmentInput | null) => store.dispatch(assignmentChanged({ dialogId: dialog.id, assignment }));
  const assigningReservation = dialog.reservation;
  const quickAssignment = reservationWorkspace.useSelector((state) => state.assignment);
  const quickAssignmentTooSmall = quickAssignment?.capacity !== undefined && quickAssignment.capacity < assigningReservation.partySize;
  return (
    <AdminModal open title={`Confirmar reserva ${assigningReservation.code}`} description={`${assigningReservation.customerName} · ${assigningReservation.partySize} personas · ${assigningReservation.date} ${assigningReservation.time}`} wide onClose={() => { if (!isPending) close(); }}>
        <div className="space-y-4">
          <ReservationWriteError dialogId={dialog.id} />
          <PreferredSector label={preferredSectorLabel(assigningReservation)} />
          <FloorAssignmentPicker restaurantId={restaurantId} query={{ date: assigningReservation.date, time: assigningReservation.time, partySize: assigningReservation.partySize, eventId: assigningReservation.eventId, excludeReservationId: assigningReservation.id }} value={quickAssignment} onChange={setAssignment} />
          <div className="flex justify-end gap-2"><button type="button" className={adminSecondaryButtonClass} onClick={() => close()} disabled={isPending}>Cancelar</button><button type="button" className={adminPrimaryButtonClass} disabled={isPending || !quickAssignment || quickAssignmentTooSmall} onClick={() => void store.dispatch(confirmAssignment(dialog.id))}>{isPending && <Loader2 size={15} className="animate-spin" />}Confirmar y asignar mesas</button></div>
        </div>
      </AdminModal>
  );
}

export function ReservationEdit({ dialog }: { dialog: ActiveReservationDialog & { kind: "reservation" } }) {
  const floorManagementEnabled = reservationWorkspace.useSelector((state) => state.data.floorManagementEnabled);
  const timeSlots = reservationWorkspace.useSelector((state) => state.data.timeSlots);
  const events = reservationWorkspace.useSelector((state) => state.data.events);
  const restaurantId = reservationWorkspace.useSelector((state) => state.data.restaurantId);
  const store = reservationWorkspace.useStore();
  const isPending = reservationWorkspace.useSelector((state) => state.write !== null);
  const close = () => store.dispatch(dialogClosed(dialog.id));
  const setAssignment = (assignment: FloorAssignmentInput | null) => store.dispatch(assignmentChanged({ dialogId: dialog.id, assignment }));
  const { editing: editingReservation, date, time, eventId } = dialog;
  const resAssignment = reservationWorkspace.useSelector((state) => state.assignment);
  const reservationFormId = useId();
  const [optionalAssignment, setOptionalAssignment] = useState(false);
  const [resForm, setResForm] = useState<AdminCreateReservationCommand>(() => ({
    customerName: editingReservation?.customerName ?? "", customerEmail: editingReservation?.customerEmail ?? "",
    customerPhone: editingReservation?.customerPhone ?? "", partySize: editingReservation?.partySize ?? 2,
    date, time, notes: editingReservation?.notes ?? "", adminNotes: editingReservation?.adminNotes ?? "",
    status: editingReservation?.status ?? "CONFIRMED", source: editingReservation?.source === "LANDING" ? "LANDING" : "ADMIN",
    eventId: editingReservation?.eventId ?? eventId ?? null,
  }));
  const resAssignmentTooSmall = resForm.status === "CONFIRMED" && resAssignment?.capacity !== undefined && resAssignment.capacity < resForm.partySize;
  const handleSaveReservation = (event: React.FormEvent) => {
    event.preventDefault();
    void store.dispatch(saveReservation(dialog.id, resForm));
  };
  return (
    <AdminModal
        open
        title={editingReservation ? "Modificar Reserva" : "Nueva Reserva Manual"}
        wide={Boolean(floorManagementEnabled)}
        description={
          editingReservation
            ? `Editando los datos de la reserva ${editingReservation.code}`
            : "Registrá una reserva telefónica o presencial directamente en el sistema."
        }
        onClose={close}
        footer={
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#e9eee7] bg-white px-6 py-3 sm:px-8">
            <button type="button" className={adminSecondaryButtonClass} disabled={isPending} onClick={close}>Cancelar</button>
            <button type="submit" form={reservationFormId} disabled={isPending || resAssignmentTooSmall || (floorManagementEnabled && resForm.status === "CONFIRMED" && !resAssignment)} className={adminPrimaryButtonClass}>
              {isPending && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {editingReservation ? "Guardar cambios" : "Crear reserva"}
            </button>
          </div>
        }
      >
        <form id={reservationFormId} onSubmit={handleSaveReservation} className="space-y-5">
          <ReservationWriteError dialogId={dialog.id} />

          <fieldset className="min-w-0 space-y-3">
            <legend className="mb-2 text-base font-semibold text-[#263e23]">Contacto</legend>
            <ReservationField label="Nombre y apellido">
              <input type="text" autoComplete="name" required placeholder="Ej. Martín Pérez" value={resForm.customerName} onChange={(event) => setResForm((previous) => ({ ...previous, customerName: event.target.value }))} className={`${reservationInputClass} w-full`} />
            </ReservationField>
            <div className="grid gap-3 sm:grid-cols-2">
              <ReservationField label={editingReservation?.source === "WALK_IN" ? "Teléfono (opcional)" : "Teléfono / WhatsApp"}>
                <input type="tel" autoComplete="tel" required={editingReservation?.source !== "WALK_IN"} placeholder="Ej. +54 9 11 1234-5678" value={resForm.customerPhone} onChange={(event) => setResForm((previous) => ({ ...previous, customerPhone: event.target.value }))} className={`${reservationInputClass} w-full`} />
              </ReservationField>
              <ReservationField label="Email (opcional)">
                <input type="email" autoComplete="email" placeholder="nombre@correo.com" value={resForm.customerEmail || ""} onChange={(event) => setResForm((previous) => ({ ...previous, customerEmail: event.target.value }))} className={`${reservationInputClass} w-full`} />
              </ReservationField>
            </div>
          </fieldset>

          <fieldset className="min-w-0 space-y-3">
            <legend className="mb-2 text-base font-semibold text-[#263e23]">Servicio</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_6.5rem]">
              <ReservationField label="Fecha">
                <input type="date" required value={resForm.date} onChange={(event) => setResForm((previous) => ({ ...previous, date: event.target.value }))} className={`${reservationInputClass} w-full min-w-0`} />
              </ReservationField>
              <ReservationField label="Horario">
                <ReservationSelect label="Horario" required value={resForm.time} onChange={(event) => setResForm((previous) => ({ ...previous, time: event.target.value }))}>
                  {resForm.time && !timeSlots.some((slot) => slot.time === resForm.time) && <option value={resForm.time}>{resForm.time} hs</option>}
                  {timeSlots.map((slot) => <option key={slot.id} value={slot.time}>{slot.time} hs{slot.label && ` · ${slot.label}`}</option>)}
                </ReservationSelect>
              </ReservationField>
              <ReservationField label="Comensales">
                <input type="number" min={1} max={40} required value={resForm.partySize} onChange={(event) => setResForm((previous) => ({ ...previous, partySize: Number(event.target.value) }))} className={`${reservationInputClass} w-full`} />
              </ReservationField>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <ReservationField label="Tipo de reserva">
                <ReservationSelect label="Tipo de reserva" value={resForm.eventId || ""} disabled={Boolean(editingReservation)} onChange={(event) => {
                  const eventId = event.target.value || null;
                  const selected = events.find((item) => item.id === eventId);
                  setResForm((previous) => ({ ...previous, eventId, date: selected?.date ?? previous.date, time: selected?.startTime ?? previous.time }));
                }}>
                  <option value="">Mesa en salón</option>
                  {events.map((event) => <option key={event.id} value={event.id}>{event.title} · {formatShortDate(event.date)}</option>)}
                </ReservationSelect>
              </ReservationField>
              <ReservationField label="Estado">
                <ReservationSelect label="Estado" value={resForm.status} onChange={(event) => setResForm((previous) => ({ ...previous, status: event.target.value as ReservationStatus }))}>
                  {Object.entries(STATUS_LABEL).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
                </ReservationSelect>
              </ReservationField>
            </div>
          </fieldset>

          {!floorManagementEnabled && resForm.status === "CONFIRMED" && !optionalAssignment && (
            <button type="button" className={adminSecondaryButtonClass} onClick={() => setOptionalAssignment(true)}><LayoutGrid size={15} />Asignar mesas antes de activar salones</button>
          )}
          {(floorManagementEnabled || optionalAssignment) && resForm.status === "CONFIRMED" && (
            <div className="space-y-2">
              {editingReservation && <PreferredSector label={preferredSectorLabel(resForm)} />}
              <FloorAssignmentPicker
                key={editingReservation?.id ?? "new-reservation"}
                restaurantId={restaurantId}
                query={{ date: resForm.date, time: resForm.time, partySize: resForm.partySize, eventId: resForm.eventId, ...(editingReservation ? { excludeReservationId: editingReservation.id } : {}) }}
                value={resAssignment}
                onChange={setAssignment}
              />
            </div>
          )}

          <fieldset className="min-w-0 space-y-3">
            <legend className="mb-2 text-base font-semibold text-[#263e23]">Notas</legend>
            <ReservationField label="Del comensal (opcional)">
              <textarea rows={2} placeholder="Alergias, festejos o preferencias" value={resForm.notes || ""} onChange={(event) => setResForm((previous) => ({ ...previous, notes: event.target.value }))} className={`${reservationInputClass} w-full`} />
            </ReservationField>
            <ReservationField label="Nota interna (opcional)">
              <input type="text" placeholder="Ej. Cliente frecuente" value={resForm.adminNotes || ""} onChange={(event) => setResForm((previous) => ({ ...previous, adminNotes: event.target.value }))} className={`${reservationInputClass} w-full`} />
            </ReservationField>
          </fieldset>

        </form>
      </AdminModal>
  );
}

export function ReservationEventEdit({ dialog }: { dialog: ActiveReservationDialog & { kind: "event" } }) {
  const floorManagementEnabled = reservationWorkspace.useSelector((state) => state.data.floorManagementEnabled);
  const restaurantId = reservationWorkspace.useSelector((state) => state.data.restaurantId);
  const store = reservationWorkspace.useStore();
  const isPending = reservationWorkspace.useSelector((state) => state.write !== null);
  const close = () => store.dispatch(dialogClosed(dialog.id));
  const { editing: editingEvent } = dialog;
  const [eventForm, setEventForm] = useState<UpsertRestaurantEventCommand>(() => editingEvent ? {
    title: editingEvent.title, description: editingEvent.description, date: editingEvent.date,
    startTime: editingEvent.startTime, endTime: editingEvent.endTime, capacity: editingEvent.capacity,
    priceLabel: editingEvent.priceLabel, imageUrl: editingEvent.imageUrl, blocksRegularReservations: editingEvent.blocksRegularReservations,
    roomIds: editingEvent.roomIds ?? [], status: editingEvent.status,
  } : {
    title: "", description: "", date: dialog.date, startTime: "21:00", endTime: "", capacity: 20,
    priceLabel: "", imageUrl: "", blocksRegularReservations: false, roomIds: [], status: "PUBLISHED",
  });
  const handleSaveEvent = (event: React.FormEvent) => {
    event.preventDefault();
    void store.dispatch(saveEvent(dialog.id, { ...eventForm, id: editingEvent?.id }));
  };
  return (
    <AdminModal
        open
        title={editingEvent ? "Modificar Evento" : "Crear Evento Especial"}
        description="Publicá una experiencia especial con aforo limitado en tu menú y landing page."
        onClose={close}
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <ReservationWriteError dialogId={dialog.id} />
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Título del Evento *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Cata de Vinos & Maridaje"
              value={eventForm.title}
              onChange={(e) =>
                setEventForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={3}
              placeholder="Explicá en qué consiste la velada, qué incluye y detalles importantes."
              value={eventForm.description || ""}
              onChange={(e) =>
                setEventForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={eventForm.date}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Cupo Máximo (Aforo) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={eventForm.capacity}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    capacity: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Hora Inicio *
              </label>
              <input
                type="time"
                required
                value={eventForm.startTime}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, startTime: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Hora Fin (Opcional)
              </label>
              <input
                type="time"
                value={eventForm.endTime || ""}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, endTime: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Etiqueta de Precio
              </label>
              <input
                type="text"
                placeholder="Ej. $18.000 / $25.000 p/p"
                value={eventForm.priceLabel || ""}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, priceLabel: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Estado de Publicación
              </label>
              <select
                value={eventForm.status}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    status: e.target.value as "DRAFT" | "PUBLISHED" | "CANCELLED",
                  }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#182618] font-medium"
              >
                <option value="PUBLISHED">Publicado (Visible en Web)</option>
                <option value="DRAFT">Borrador (Oculto)</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="blocksRegular"
              checked={eventForm.blocksRegularReservations}
              onChange={(e) =>
                setEventForm((prev) => ({
                  ...prev,
                  blocksRegularReservations: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded text-[#182618] focus:ring-[#182618]"
            />
            <label htmlFor="blocksRegular" className="text-xs text-zinc-700 font-medium">
              Salón Exclusivo (bloquea las reservas regulares en esta fecha)
            </label>
          </div>

          {floorManagementEnabled && <FloorRoomSelector restaurantId={restaurantId} value={eventForm.roomIds ?? []} onChange={(roomIds) => setEventForm((previous) => ({ ...previous, roomIds }))} />}

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              className={adminSecondaryButtonClass}
              onClick={close}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={adminPrimaryButtonClass}
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              <span>{editingEvent ? "Guardar Evento" : "Crear Evento"}</span>
            </button>
          </div>
        </form>
      </AdminModal>
  );
}

export function ReservationSlotEdit({ dialog }: { dialog: ActiveReservationDialog & { kind: "slot" } }) {
  const store = reservationWorkspace.useStore();
  const isPending = reservationWorkspace.useSelector((state) => state.write !== null);
  const close = () => store.dispatch(dialogClosed(dialog.id));
  const { editing: editingSlot } = dialog;
  const [slotForm, setSlotForm] = useState<UpsertTimeSlotCommand>(() => editingSlot
    ? { time: editingSlot.time, label: editingSlot.label, active: editingSlot.active, sortOrder: editingSlot.sortOrder }
    : { time: "20:00", label: "Cena", active: true, sortOrder: store.getState().data.timeSlots.length });
  const handleSaveSlot = (event: React.FormEvent) => {
    event.preventDefault();
    void store.dispatch(saveSlot(dialog.id, { ...slotForm, id: editingSlot?.id }));
  };
  return (
    <AdminModal
        open
        title={editingSlot ? "Editar Turno" : "Nuevo Turno de Reserva"}
        description="Configurá las horas en las que los comensales pueden reservar mesas."
        onClose={close}
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          <ReservationWriteError dialogId={dialog.id} />
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Hora del Turno *
            </label>
            <input
              type="time"
              required
              value={slotForm.time}
              onChange={(e) =>
                setSlotForm((prev) => ({ ...prev, time: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618] font-mono text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Etiqueta Descriptiva (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Almuerzo, Cena 1er Turno, After Office"
              value={slotForm.label || ""}
              onChange={(e) =>
                setSlotForm((prev) => ({ ...prev, label: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="activeSlotModal"
              checked={slotForm.active}
              onChange={(e) =>
                setSlotForm((prev) => ({ ...prev, active: e.target.checked }))
              }
              className="h-4 w-4 rounded text-[#182618] focus:ring-[#182618]"
            />
            <label htmlFor="activeSlotModal" className="text-xs text-zinc-700 font-medium">
              Turno Activo (visible para reservas regulares)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              className={adminSecondaryButtonClass}
              onClick={close}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={adminPrimaryButtonClass}
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              <span>{editingSlot ? "Guardar Turno" : "Crear Turno"}</span>
            </button>
          </div>
        </form>
      </AdminModal>
  );
}
