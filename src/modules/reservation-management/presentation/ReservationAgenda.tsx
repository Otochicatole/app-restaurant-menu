import { CalendarX2, Check, ChevronLeft, ChevronRight, Copy, Edit2, Eye, Heart, LayoutGrid, Leaf, List, Mail, MessageCircle, Phone, Search, Shield, Sun, Trash2, WheatOff, X } from "lucide-react";
import { adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { reservationSectorNotePrefix, type ReservationStatus, type ReservationView } from "../contracts";
import { agendaOpened, filtersChanged, reservationWorkspace, selectFilteredReservations, dialogOpened } from "./reservation-workspace";
import { openManualReservation, requestReservationStatus } from "./reservation-commands";
import { addDaysToIso, formatFriendlyDate, buildWhatsAppLink, preferredSectorLabel, reservationCountLabel } from "./reservation-labels";
import { PreferredSector, agendaActionClass, reservationInputClass, ReservationSelect, ReservationStatusLabel, useReservationClipboard } from "./ReservationUi";

type ViewMode = "cards" | "table";

type NoteTag = {
  id: string;
  label: string;
  iconType: "wheat" | "leaf" | "heart" | "sun" | "users" | "shield";
  color: string;
};

function extractNoteTags(notes: string): NoteTag[] {
  if (!notes) return [];
  const lower = notes.toLowerCase();
  const tags: NoteTag[] = [];

  if (
    lower.includes("celiac") ||
    lower.includes("celíac") ||
    lower.includes("sin tacc") ||
    lower.includes("gluten")
  ) {
    tags.push({
      id: "celiac",
      label: "Sin TACC / Celíaco",
      iconType: "wheat",
      color: "bg-amber-50 text-amber-900 border-amber-200/90",
    });
  }
  if (lower.includes("vegan") || lower.includes("vegetar")) {
    tags.push({
      id: "veg",
      label: "Veg / Vegetariano",
      iconType: "leaf",
      color: "bg-emerald-50 text-emerald-900 border-emerald-200/90",
    });
  }
  if (
    lower.includes("cumple") ||
    lower.includes("aniversario") ||
    lower.includes("festejo") ||
    lower.includes("romant")
  ) {
    tags.push({
      id: "celebration",
      label: "Celebración especial",
      iconType: "heart",
      color: "bg-rose-50 text-rose-900 border-rose-200/90",
    });
  }
  if (
    lower.includes("terraza") ||
    lower.includes("exterior") ||
    lower.includes("afuera") ||
    lower.includes("patio")
  ) {
    tags.push({
      id: "patio",
      label: "Mesa en Exterior / Terraza",
      iconType: "sun",
      color: "bg-sky-50 text-sky-900 border-sky-200/90",
    });
  }
  if (lower.includes("vip") || lower.includes("urgente") || lower.includes("importante")) {
    tags.push({
      id: "vip",
      label: "Atención prioritaria",
      iconType: "shield",
      color: "bg-indigo-50 text-indigo-900 border-indigo-200/90",
    });
  }

  return tags;
}

function renderTagIcon(type: NoteTag["iconType"]) {
  switch (type) {
    case "wheat":
      return <WheatOff size={11} className="shrink-0" />;
    case "leaf":
      return <Leaf size={11} className="shrink-0" />;
    case "heart":
      return <Heart size={11} className="shrink-0" />;
    case "sun":
      return <Sun size={11} className="shrink-0" />;
    case "shield":
      return <Shield size={11} className="shrink-0" />;
    default:
      return null;
  }
}

type ReservationRowActions = {
  restaurantName: string;
  floorEnabled: boolean;
  busy: boolean;
  onStatus: (id: string, status: ReservationStatus) => void;
  onPreview: (reservation: ReservationView) => void;
  onEdit: (reservation: ReservationView) => void;
  onDelete: (reservation: ReservationView) => void;
};

function ReservationActions({ reservation, compact, restaurantName, floorEnabled, busy, onStatus, onPreview, onEdit, onDelete }: ReservationRowActions & { reservation: ReservationView; compact?: boolean }) {
  const { id, status, customerPhone, customerName, date, time, code, partySize } = reservation;
  const whatsapp = buildWhatsAppLink(customerPhone, customerName, restaurantName, date, time, code, partySize);
  const primaryStatus = status === "PENDING" ? "CONFIRMED" : status === "CONFIRMED" ? "COMPLETED" : null;
  const primaryLabel = status === "PENDING" ? "Confirmar" : floorEnabled ? "Finalizar y liberar" : "Asistió";

  return (
    <div className={`flex flex-wrap items-center gap-x-1 gap-y-0.5 ${compact ? "justify-end" : ""}`}>
      {primaryStatus && (
        <button type="button" disabled={busy} onClick={() => onStatus(id, primaryStatus)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#243723] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#30492e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934] disabled:opacity-50">
          <Check size={15} aria-hidden="true" />{primaryLabel}
        </button>
      )}
      {status === "PENDING" && <button type="button" disabled={busy} className={agendaActionClass} onClick={() => onStatus(id, "REJECTED")}>Rechazar</button>}
      {status === "CONFIRMED" && <button type="button" disabled={busy} className={agendaActionClass} onClick={() => onStatus(id, "CANCELLED")}>Cancelar</button>}
      {whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="WhatsApp" className={agendaActionClass}><MessageCircle size={16} aria-hidden="true" /><span className={compact ? "sr-only" : "hidden sm:inline"}>WhatsApp</span></a>}
      <button type="button" aria-label="Comprobante" title="Comprobante" onClick={() => onPreview(reservation)} className={agendaActionClass}><Eye size={16} aria-hidden="true" /><span className={compact ? "sr-only" : "hidden sm:inline"}>Comprobante</span></button>
      <button type="button" aria-label="Editar reserva" title="Editar reserva" onClick={() => onEdit(reservation)} className={agendaActionClass}><Edit2 size={16} aria-hidden="true" /></button>
      <button type="button" aria-label="Eliminar reserva" title="Eliminar reserva" onClick={() => onDelete(reservation)} className={`${agendaActionClass} hover:bg-red-50 hover:text-red-800`}><Trash2 size={16} aria-hidden="true" /></button>
    </div>
  );
}

function ReservationList({
  reservations,
  mode,
  copiedCode,
  onCopy,
  ...actions
}: ReservationRowActions & {
  reservations: ReservationView[];
  mode: ViewMode;
  copiedCode: string | null;
  onCopy: (code: string, id: string) => void;
}) {
  const days = new Map<string, ReservationView[]>();
  const sorted = [...reservations].sort((first, second) => second.date.localeCompare(first.date) || first.time.localeCompare(second.time));
  for (const reservation of sorted) {
    const day = days.get(reservation.date);
    if (day) day.push(reservation);
    else days.set(reservation.date, [reservation]);
  }

  if (mode === "table") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-zinc-600 lg:hidden">Deslizá la tabla para ver todas las columnas.</p>
        <div role="region" aria-label="Tabla de reservas desplazable" tabIndex={0} className="relative max-w-full overflow-x-auto rounded-xl bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934]">
          <table className="w-full min-w-[46rem] table-fixed text-left text-sm">
            <caption className="sr-only">Reservas por fecha y horario</caption>
            <thead className="bg-[#e7eee3] text-[#263e23]">
              <tr>
                <th scope="col" className="w-[15%] px-4 py-3 font-semibold">Horario</th>
                <th scope="col" className="w-[30%] px-3 py-3 font-semibold">Reserva y contacto</th>
                <th scope="col" className="w-[20%] px-3 py-3 font-semibold">Sector y notas</th>
                <th scope="col" className="w-[12%] px-3 py-3 font-semibold">Estado</th>
                <th scope="col" className="w-[23%] px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            {Array.from(days, ([date, entries]) => (
              <tbody key={date} className="divide-y divide-[#e9eee7]">
                <tr><th scope="rowgroup" colSpan={5} className="bg-[#f5f8f3] px-4 py-2 text-sm font-medium text-[#3d5934]"><time dateTime={date}>{formatFriendlyDate(date)}</time></th></tr>
                {entries.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-[#fafcf9]">
                    <td className="px-4 py-3 align-top tabular-nums">
                      <time dateTime={`${date}T${reservation.time}`} className="block font-semibold text-[#182618]">{reservation.time}</time>
                      <span className="text-xs text-zinc-600">{reservation.partySize} {reservation.partySize === 1 ? "persona" : "personas"}</span>
                    </td>
                    <th scope="row" className="px-3 py-3 align-top font-normal [overflow-wrap:anywhere]">
                      <span className="block font-semibold text-zinc-950">{reservation.customerName}</span>
                      <span className="block text-xs text-zinc-600">{reservation.code}{reservation.eventId && ` · ${reservation.eventTitle || "Evento"}`}</span>
                      {reservation.customerPhone && <a href={`tel:${reservation.customerPhone}`} className="block text-xs text-zinc-700 hover:underline">{reservation.customerPhone}</a>}
                      {reservation.customerEmail && <a href={`mailto:${reservation.customerEmail}`} className="block text-xs text-zinc-700 hover:underline">{reservation.customerEmail}</a>}
                    </th>
                    <td className="px-3 py-3 align-top [overflow-wrap:anywhere]">
                      <PreferredSector label={preferredSectorLabel(reservation)} />
                      {reservation.notes && <span className="line-clamp-2 text-xs text-zinc-600" title={reservation.notes}>{reservation.notes}</span>}
                    </td>
                    <td className="px-3 py-3 align-top"><ReservationStatusLabel status={reservation.status} /></td>
                    <td className="px-4 py-2 align-top"><ReservationActions reservation={reservation} compact {...actions} /></td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {Array.from(days, ([date, entries]) => (
        <section key={date} aria-label={formatFriendlyDate(date)} className="overflow-hidden rounded-xl bg-white">
          <div className="flex flex-wrap items-center justify-between gap-1 bg-[#e7eee3] px-3 py-2.5 text-[#263e23] sm:px-5">
            <h3 className="text-sm font-semibold"><time dateTime={date}>{formatFriendlyDate(date)}</time></h3>
            <p className="text-xs text-[#3d5934]">{reservationCountLabel(entries.length)}</p>
          </div>
          <div className="divide-y divide-[#e9eee7]">
            {entries.map((reservation) => {
              const { id, code, time, customerName, partySize, customerPhone, customerEmail, eventId, eventTitle, notes, adminNotes, source, status } = reservation;
              const sector = preferredSectorLabel(reservation);
              const internalNote = adminNotes.startsWith(reservationSectorNotePrefix) ? adminNotes.split(/\r?\n/).slice(1).join("\n").trim() : adminNotes;
              return (
                <article key={id} className="grid grid-cols-[3.6rem_minmax(0,1fr)] gap-x-2.5 gap-y-2 px-3 py-3 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-x-5 sm:px-5 sm:py-4">
                  <div>
                    <time dateTime={`${date}T${time}`} className="block text-lg font-semibold tracking-tight text-[#182618] tabular-nums sm:text-xl">{time}</time>
                    <p className="text-xs text-zinc-600">{partySize} {partySize === 1 ? "persona" : "personas"}</p>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h4 className="min-w-0 text-base font-semibold text-zinc-950 [overflow-wrap:anywhere] sm:text-lg">{customerName}</h4>
                      <ReservationStatusLabel status={status} />
                    </div>
                    <p className="text-sm text-zinc-600 [overflow-wrap:anywhere]">{eventId ? eventTitle || "Evento" : "Mesa en salón"} <span aria-hidden="true">·</span> {source === "LANDING" ? "Web" : source === "WALK_IN" ? "Llegada sin reserva" : "Manual"}</p>
                    <PreferredSector label={sector} />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-zinc-700">
                      {customerPhone && <a href={`tel:${customerPhone}`} className="inline-flex min-h-8 items-center gap-1.5 hover:underline"><Phone size={13} aria-hidden="true" />{customerPhone}</a>}
                      {customerEmail && <a href={`mailto:${customerEmail}`} className="inline-flex min-h-8 min-w-0 items-center gap-1.5 [overflow-wrap:anywhere] hover:underline"><Mail size={13} className="shrink-0" aria-hidden="true" /><span className="min-w-0">{customerEmail}</span></a>}
                      <button type="button" aria-label={`Copiar código ${code}`} title="Copiar código de reserva" onClick={() => onCopy(code, id)} className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-1.5 text-zinc-600 hover:bg-[#edf2ea] focus-visible:outline-2 focus-visible:outline-[#3d5934]">
                        {code}{copiedCode === id ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                  {(notes || internalNote) && (
                    <div className="col-span-2 min-w-0 space-y-1 rounded-lg bg-[#f3f6f1] px-3 py-2 text-sm leading-relaxed text-zinc-700 [overflow-wrap:anywhere] sm:col-span-1 sm:col-start-2">
                      {extractNoteTags(notes).map((tag) => <span key={tag.id} className={`mr-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${tag.color}`}>{renderTagIcon(tag.iconType)}{tag.label}</span>)}
                      {notes && <p className="whitespace-pre-wrap"><strong className="font-semibold text-zinc-900">Del comensal</strong> · {notes}</p>}
                      {internalNote && <p className="whitespace-pre-wrap"><strong className="font-semibold text-zinc-900">Nota interna</strong> · {internalNote}</p>}
                    </div>
                  )}
                  <div className="col-span-2 sm:col-span-1 sm:col-start-2"><ReservationActions reservation={reservation} {...actions} /></div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export function ReservationAgenda({ today: todayIso }: { today: string }) {
  const reservations = reservationWorkspace.useSelector((state) => state.data.reservations);
  const restaurantName = reservationWorkspace.useSelector((state) => state.data.restaurantName);
  const floorManagementEnabled = reservationWorkspace.useSelector((state) => state.data.floorManagementEnabled);
  const store = reservationWorkspace.useStore();
  const [viewMode, setViewMode] = reservationWorkspace.useField("viewMode");
  const isPending = reservationWorkspace.useSelector((state) => state.write !== null);
  const filteredReservations = reservationWorkspace.useSelector(selectFilteredReservations);
  const { searchQuery, statusFilter, typeFilter, dateFilter } = reservationWorkspace.useSelector((state) => state.filters);
  const setSearchQuery = (searchQuery: string) => store.dispatch(filtersChanged({ searchQuery }));
  const setStatusFilter = (statusFilter: ReservationStatus | "ALL") => store.dispatch(filtersChanged({ statusFilter }));
  const setTypeFilter = (typeFilter: "ALL" | "TABLE" | "EVENT") => store.dispatch(filtersChanged({ typeFilter }));
  const setDateFilter = (update: string | ((previous: string) => string)) => {
    store.dispatch(filtersChanged({ dateFilter: typeof update === "function" ? update(store.getState().filters.dateFilter) : update }));
  };
  const isAnyFilterActive = Boolean(searchQuery || statusFilter !== "ALL" || dateFilter || typeFilter !== "ALL");
  const clearFilters = () => store.dispatch(agendaOpened(undefined));
  const agendaTitle = dateFilter === todayIso ? "Agenda de hoy" : dateFilter ? formatFriendlyDate(dateFilter) : "Agenda de reservas";
  const { copiedCode, copyToClipboard } = useReservationClipboard();
  return (
    <section aria-label="Listado de reservas" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[#182618] sm:text-2xl">{agendaTitle}</h2>
              <p aria-live="polite" aria-atomic="true" className="mt-0.5 text-sm text-zinc-600">
                {reservationCountLabel(filteredReservations.length)}
                {isAnyFilterActive && ` de ${reservations.length}`}
              </p>
            </div>
            <div role="group" aria-label="Vista de reservas" className="flex gap-0.5 rounded-lg bg-[#e7eee3] p-0.5">
              {([{ mode: "cards", label: "Agenda", icon: LayoutGrid }, { mode: "table", label: "Tabla", icon: List }] as const).map(({ mode, label, icon: Icon }) => (
                <button key={mode} type="button" aria-label={`Vista ${label.toLowerCase()}`} title={`Vista ${label.toLowerCase()}`} aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)} className={`${agendaActionClass} px-2.5 ${viewMode === mode ? "bg-white font-semibold text-[#263e23]" : "text-zinc-600"}`}>
                  <Icon size={16} aria-hidden="true" /><span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div role="group" aria-label="Filtros de reservas" className="grid gap-3 rounded-xl bg-[#edf2ea] p-3 sm:p-4">
            <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-[minmax(12rem,1fr)_minmax(10rem,0.35fr)_minmax(10rem,0.35fr)]">
              <div className="relative col-span-2 min-w-0 lg:col-span-1">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" aria-hidden="true" />
                <input type="search" aria-label="Buscar reservas" placeholder="Cliente, teléfono o código" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className={`${reservationInputClass} w-full pl-9 [&::-webkit-search-cancel-button]:appearance-none ${searchQuery ? "pr-11" : ""}`} />
                {searchQuery && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setSearchQuery("")} className={`${agendaActionClass} absolute inset-y-0 right-0`}><X size={16} /></button>}
              </div>
              <ReservationSelect label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReservationStatus | "ALL")}>
                <option value="ALL">Todos los estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="CONFIRMED">Confirmadas</option>
                <option value="COMPLETED">Finalizadas</option>
                <option value="CANCELLED">Canceladas</option>
                <option value="REJECTED">Rechazadas</option>
              </ReservationSelect>
              <ReservationSelect label="Tipo de reserva" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
                <option value="ALL">Todos los tipos</option>
                <option value="TABLE">Mesas</option>
                <option value="EVENT">Eventos</option>
              </ReservationSelect>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-2" role="group" aria-label="Fecha de reserva">
                <div className="flex items-center gap-0.5">
                  {[{ label: "Todas", value: "" }, { label: "Hoy", value: todayIso }, { label: "Mañana", value: addDaysToIso(todayIso, 1) }].map(({ label, value }) => (
                    <button key={label} type="button" aria-pressed={dateFilter === value} onClick={() => setDateFilter(value)} className={`${agendaActionClass} px-1.5! sm:px-2.5! ${dateFilter === value ? "bg-[#dce8d8] font-semibold text-[#263e23]" : "text-zinc-700"}`}>{label}</button>
                  ))}
                </div>
                <div className="flex min-w-0 items-center gap-0.5">
                  <button type="button" aria-label="Día anterior" onClick={() => setDateFilter((previous) => addDaysToIso(previous || todayIso, -1))} className={`${agendaActionClass} max-sm:min-w-7! max-sm:px-1!`}><ChevronLeft size={16} /></button>
                  <input aria-label="Elegir fecha" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className={`${reservationInputClass} w-auto min-w-0 max-sm:w-[7.75rem] max-sm:px-1.5!`} />
                  <button type="button" aria-label="Día siguiente" onClick={() => setDateFilter((previous) => addDaysToIso(previous || todayIso, 1))} className={`${agendaActionClass} max-sm:min-w-7! max-sm:px-1!`}><ChevronRight size={16} /></button>
                </div>
              </div>
              {isAnyFilterActive && <button type="button" onClick={clearFilters} className={`${agendaActionClass} px-2.5 font-medium`}><X size={15} aria-hidden="true" /> Limpiar filtros</button>}
            </div>
          </div>

          {filteredReservations.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl bg-white p-6 text-center">
              <CalendarX2 size={26} className="mb-3 text-[#3d5934]" aria-hidden="true" />
              <h3 className="font-semibold text-[#182618]">{isAnyFilterActive ? "Sin coincidencias" : "Todavía no hay reservas"}</h3>
              <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-600">{isAnyFilterActive ? "Probá otra fecha, cambiá la búsqueda o quitá los filtros." : "Registrá la primera reserva para empezar a organizar el servicio."}</p>
              <button type="button" onClick={isAnyFilterActive ? clearFilters : () => store.dispatch(openManualReservation(todayIso))} className={`${adminSecondaryButtonClass} mt-4`}>{isAnyFilterActive ? "Limpiar filtros" : "Crear primera reserva"}</button>
            </div>
          ) : (
            <ReservationList
              reservations={filteredReservations}
              mode={viewMode}
              restaurantName={restaurantName}
              floorEnabled={floorManagementEnabled}
              busy={isPending}
              copiedCode={copiedCode}
              onCopy={copyToClipboard}
              onStatus={(id, status) => void store.dispatch(requestReservationStatus(id, status))}
              onPreview={({ id }) => store.dispatch(dialogOpened({ kind: "receipt", reservationId: id }))}
              onEdit={(reservation) => store.dispatch(dialogOpened({ kind: "reservation", editing: reservation, date: reservation.date, time: reservation.time }))}
              onDelete={({ id }) => store.dispatch(dialogOpened({ kind: "deleteReservation", reservationId: id }))}
            />
          )}
        </section>
  );
}
