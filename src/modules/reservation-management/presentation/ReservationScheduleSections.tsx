import { useMemo, useState } from "react";
import { CalendarX2, Edit2, Trash2, Users } from "lucide-react";
import { AdminEmptyState, adminPrimaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { type TimeSlotView } from "../contracts";
import { reservationWorkspace, dialogOpened, selectEventOccupancy } from "./reservation-workspace";
import { addBlockedDate, removeBlockedDate, removeSlot, toggleRecurringDay, toggleSlot } from "./reservation-commands";
import { EVENT_STATUS_LABEL, formatFriendlyDate, formatShortDate } from "./reservation-labels";
import { agendaActionClass, reservationInputClass, ReservationField, ReservationSectionHeader } from "./ReservationUi";

const DAYS_OF_WEEK = [
  { day: 1, label: "Lunes", short: "Lun" },
  { day: 2, label: "Martes", short: "Mar" },
  { day: 3, label: "Miércoles", short: "Mié" },
  { day: 4, label: "Jueves", short: "Jue" },
  { day: 5, label: "Viernes", short: "Vie" },
  { day: 6, label: "Sábado", short: "Sáb" },
  { day: 0, label: "Domingo", short: "Dom" },
];

export function ReservationEvents({ today }: { today: string }) {
  const events = reservationWorkspace.useSelector((state) => state.data.events);
  const eventOccupancy = reservationWorkspace.useSelector(selectEventOccupancy);
  const store = reservationWorkspace.useStore();
  return (
    <section aria-label="Eventos especiales" className="space-y-4">
          <ReservationSectionHeader title="Eventos" description="Publicá experiencias con cupos limitados y revisá sus inscripciones." action="Crear evento" onAction={() => store.dispatch(dialogOpened({ kind: "event", date: today }))} />
          {events.length === 0 ? (
            <AdminEmptyState title="Todavía no hay eventos" description="Creá un evento para abrir inscripciones en la página pública." />
          ) : (
            <div className="divide-y divide-[#e9eee7] overflow-hidden rounded-xl bg-white">
              {events.map((event) => {
                const occupied = Math.min(event.capacity, eventOccupancy[event.id] ?? 0);
                const percentage = Math.min(100, Math.round((occupied / event.capacity) * 100));
                return (
                  <article key={event.id} className="grid gap-4 p-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:p-5 lg:grid-cols-[8rem_minmax(0,1fr)_minmax(12rem,0.6fr)]">
                    <div className="flex items-baseline gap-2 sm:block">
                      <time dateTime={event.date} className="text-lg font-semibold tracking-tight text-[#182618]">{formatShortDate(event.date)}</time>
                      <p className="text-sm text-zinc-600 tabular-nums">{event.startTime}{event.endTime && ` – ${event.endTime}`} hs</p>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-zinc-950 [overflow-wrap:anywhere]">{event.title}</h3>
                      <p className="mt-1 text-sm text-zinc-700">{EVENT_STATUS_LABEL[event.status]}{event.blocksRegularReservations && " · Salón exclusivo"}{event.priceLabel && ` · ${event.priceLabel}`}</p>
                      {event.description && <p className="mt-2 line-clamp-3 max-w-[65ch] text-sm leading-6 text-zinc-600 [overflow-wrap:anywhere]">{event.description}</p>}
                    </div>
                    <div className="min-w-0 space-y-2 sm:col-start-2 lg:col-start-auto">
                      <div className="flex flex-wrap justify-between gap-2 text-sm">
                        <span className="font-semibold text-zinc-950">{occupied} de {event.capacity} lugares</span>
                        <span className={percentage === 100 ? "text-red-800" : "text-zinc-600"}>{percentage === 100 ? "Agotado" : `${percentage}%`}</span>
                      </div>
                      <div role="progressbar" aria-label={`Ocupación de ${event.title}`} aria-valuenow={percentage} className="h-2 overflow-hidden rounded-full bg-[#e7eee3]">
                        <div style={{ width: `${percentage}%` }} className={`h-full rounded-full ${percentage === 100 ? "bg-red-600" : "bg-[#3d5934]"}`} />
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <button type="button" onClick={() => store.dispatch(dialogOpened({ kind: "attendees", eventId: event.id }))} className={`${agendaActionClass} bg-[#e7eee3] font-semibold text-[#263e23]`}><Users size={16} aria-hidden="true" /> Ver inscriptos</button>
                        <button type="button" onClick={() => {
                          store.dispatch(dialogOpened({ kind: "event", editing: event, date: event.date }));
                        }} aria-label="Editar evento" title="Editar evento" className={agendaActionClass}><Edit2 size={16} aria-hidden="true" /></button>
                        <button type="button" onClick={() => store.dispatch(dialogOpened({ kind: "deleteEvent", eventId: event.id }))} aria-label="Eliminar evento" title="Eliminar evento" className={`${agendaActionClass} hover:bg-red-50 hover:text-red-800`}><Trash2 size={16} aria-hidden="true" /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
  );
}

export function ReservationShifts() {
  const timeSlots = reservationWorkspace.useSelector((state) => state.data.timeSlots);
  const store = reservationWorkspace.useStore();
  const isPending = reservationWorkspace.useSelector((state) => state.write !== null);
  const { lunchSlots, dinnerSlots, otherSlots } = useMemo(() => {
    const lunch: TimeSlotView[] = [];
    const dinner: TimeSlotView[] = [];
    const others: TimeSlotView[] = [];

    timeSlots.forEach((slot) => {
      const hour = parseInt(slot.time.split(":")[0] || "0", 10);
      if (hour >= 11 && hour <= 16) {
        lunch.push(slot);
      } else if (hour >= 19 && hour <= 23) {
        dinner.push(slot);
      } else {
        others.push(slot);
      }
    });

    return { lunchSlots: lunch, dinnerSlots: dinner, otherSlots: others };
  }, [timeSlots]);
  return (
    <section aria-label="Horarios de atención" className="space-y-4">
          <ReservationSectionHeader title="Horarios de atención" description="Definí los turnos que pueden elegir los comensales." action="Agregar turno" onAction={() => store.dispatch(dialogOpened({ kind: "slot" }))} />
          {timeSlots.length === 0 ? (
            <AdminEmptyState title="Todavía no hay turnos" description="Agregá un horario para que los comensales puedan reservar." />
          ) : (
            <div className="space-y-4">
              {[{ label: "Almuerzo", slots: lunchSlots }, { label: "Cena", slots: dinnerSlots }, { label: "Otros horarios", slots: otherSlots }].map(({ label, slots }) => slots.length > 0 && (
                <div key={label} className="overflow-hidden rounded-xl bg-white">
                  <h3 className="bg-[#e7eee3] px-4 py-3 text-sm font-semibold text-[#263e23]">{label}</h3>
                  <ul className="divide-y divide-[#e9eee7]">
                    {slots.map((slot) => (
                      <li key={slot.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 sm:px-4">
                        <p className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                          <strong className="mr-2 text-base font-semibold text-[#182618] tabular-nums">{slot.time} hs</strong>
                          <span className="text-sm text-zinc-600">{slot.label || "Sin etiqueta"}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-0.5">
                          <button type="button" aria-label={`Turno ${slot.time} activo`} aria-pressed={slot.active} disabled={isPending} onClick={() => void store.dispatch(toggleSlot(slot))} className={`${agendaActionClass} px-2.5 font-medium ${slot.active ? "bg-[#e7eee3] text-[#263e23]" : "bg-zinc-100"}`}>{slot.active ? "Activo" : "Pausado"}</button>
                          <button type="button" aria-label={`Editar turno de las ${slot.time}`} title="Editar turno" onClick={() => {
                            store.dispatch(dialogOpened({ kind: "slot", editing: slot }));
                          }} className={agendaActionClass}><Edit2 size={16} aria-hidden="true" /></button>
                          <button type="button" aria-label={`Eliminar turno de las ${slot.time}`} title="Eliminar turno" onClick={() => void store.dispatch(removeSlot(slot.id))} className={`${agendaActionClass} hover:bg-red-50 hover:text-red-800`}><Trash2 size={16} aria-hidden="true" /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
  );
}

export function ReservationClosures() {
  const recurringClosures = reservationWorkspace.useSelector((state) => state.data.recurringClosures);
  const blockedDates = reservationWorkspace.useSelector((state) => state.data.blockedDates);
  const store = reservationWorkspace.useStore();
  const isPending = reservationWorkspace.useSelector((state) => state.write !== null);
  const [newBlockedDate, setNewBlockedDate] = useState({ date: "", reason: "Feriado / Cierre especial" });
  const handleAddBlockedDate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newBlockedDate.date && await store.dispatch(addBlockedDate(newBlockedDate))) {
      setNewBlockedDate({ date: "", reason: "Feriado / Cierre especial" });
    }
  };
  return (
    <section aria-label="Cierres y descansos" className="space-y-4">
          <ReservationSectionHeader title="Cierres" description="Definí los días en que el restaurante no recibe reservas." />
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl bg-white">
              <div className="bg-[#e7eee3] px-4 py-3">
                <h3 className="font-semibold text-[#263e23]">Descanso semanal</h3>
                <p className="mt-0.5 text-sm text-[#3d5934]">Tocá un día para cambiar su disponibilidad.</p>
              </div>
              <ul className="divide-y divide-[#e9eee7] px-3 py-1">
                {DAYS_OF_WEEK.map(({ day, label }) => {
                  const closed = recurringClosures.some((closure) => closure.dayOfWeek === day);
                  return (
                    <li key={day}>
                      <button type="button" aria-label={`Cerrar los ${label.toLowerCase()}`} aria-pressed={closed} disabled={isPending} onClick={() => void store.dispatch(toggleRecurringDay(day))} className={`${agendaActionClass} w-full justify-between! px-2.5 text-left`}>
                        <span className="font-medium text-zinc-950">{label}</span>
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${closed ? "bg-amber-100 text-amber-950" : "bg-[#e7eee3] text-[#263e23]"}`}>{closed ? "Cerrado" : "Abierto"}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="overflow-hidden rounded-xl bg-white">
              <div className="bg-[#e7eee3] px-4 py-3">
                <h3 className="font-semibold text-[#263e23]">Fechas bloqueadas</h3>
                <p className="mt-0.5 text-sm text-[#3d5934]">Agregá cierres puntuales sin cambiar la semana.</p>
              </div>
              <form onSubmit={handleAddBlockedDate} className="space-y-3 p-4">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                  <ReservationField label="Fecha">
                    <input type="date" required value={newBlockedDate.date} onChange={(event) => setNewBlockedDate((previous) => ({ ...previous, date: event.target.value }))} className={`${reservationInputClass} w-full min-w-0`} />
                  </ReservationField>
                  <ReservationField label="Motivo (opcional)">
                    <input type="text" placeholder="Ej. Feriado nacional" value={newBlockedDate.reason} onChange={(event) => setNewBlockedDate((previous) => ({ ...previous, reason: event.target.value }))} className={`${reservationInputClass} w-full`} />
                  </ReservationField>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Feriado nacional", "Evento privado", "Mantenimiento", "Vacaciones"].map((reason) => (
                    <button key={reason} type="button" onClick={() => setNewBlockedDate((previous) => ({ ...previous, reason }))} className={`${agendaActionClass} bg-[#f3f6f1] text-xs`}>{reason}</button>
                  ))}
                </div>
                <button type="submit" disabled={isPending || !newBlockedDate.date} className={adminPrimaryButtonClass}><CalendarX2 size={16} aria-hidden="true" /> Bloquear fecha</button>
              </form>
              {blockedDates.length > 0 ? (
                <ul className="divide-y divide-[#e9eee7] border-t border-[#e9eee7] px-4" aria-label="Fechas bloqueadas">
                  {blockedDates.map((blocked) => (
                    <li key={blocked.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0 [overflow-wrap:anywhere]">
                        <time dateTime={blocked.date} className="block text-sm font-semibold text-zinc-950">{formatFriendlyDate(blocked.date)}</time>
                        {blocked.reason && <p className="text-sm text-zinc-600">{blocked.reason}</p>}
                      </div>
                      <button type="button" disabled={isPending} onClick={() => void store.dispatch(removeBlockedDate(blocked.id))} aria-label={`Desbloquear el ${formatFriendlyDate(blocked.date)}`} title="Desbloquear fecha" className={`${agendaActionClass} hover:bg-red-50 hover:text-red-800`}><Trash2 size={16} aria-hidden="true" /></button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 pb-4 text-sm text-zinc-600">No hay cierres puntuales registrados.</p>
              )}
            </div>
          </div>
        </section>
  );
}
