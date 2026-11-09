"use client";

import { restaurantToday } from "@/modules/floor-management/contracts";
import { AlertCircle, Calendar, CalendarDays, CalendarX2, CheckCircle2, ChevronRight, Clock, ExternalLink, Plus, X } from "lucide-react";
import { adminPrimaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { type ReservationCmsData, type ReservationStatus } from "../contracts";
import { agendaOpened, reservationSeed, reservationWorkspace, selectReservationCounts, feedbackChanged } from "./reservation-workspace";
import { useEffect } from "react";
import { openManualReservation } from "./reservation-commands";
import { formatFriendlyDate, reservationCountLabel } from "./reservation-labels";
import { agendaActionClass } from "./ReservationUi";
import { ReservationAgenda } from "./ReservationAgenda";
import { ReservationEvents, ReservationShifts, ReservationClosures } from "./ReservationScheduleSections";
import { ReservationDialogs } from "./ReservationDialogs";

export function ReservationCmsScreen({ initialData, today = restaurantToday(initialData.timeZone) }: { initialData: ReservationCmsData; today?: string }) {
  return (
    <reservationWorkspace.Provider key={initialData.restaurantId} seed={reservationSeed(initialData)}>
      <ReservationCmsContent today={today} />
    </reservationWorkspace.Provider>
  );
}

function ReservationCmsContent({ today }: { today: string }) {
  const activeTab = reservationWorkspace.useSelector((state) => state.activeTab);
  return (
    <div className="min-w-0 space-y-4 pb-10 sm:space-y-5">
      <ReservationHeader today={today} />
      {activeTab === "reservations" && <ReservationAgenda today={today} />}
      {activeTab === "events" && <ReservationEvents today={today} />}
      {activeTab === "shifts" && <ReservationShifts />}
      {activeTab === "closures" && <ReservationClosures />}
      <ReservationDialogs today={today} />
    </div>
  );
}

function ReservationHeader({ today: todayIso }: { today: string }) {
  const landingEnabled = reservationWorkspace.useSelector((state) => state.data.landingEnabled);
  const restaurantSlug = reservationWorkspace.useSelector((state) => state.data.restaurantSlug);
  const store = reservationWorkspace.useStore();
  const [activeTab, setActiveTab] = reservationWorkspace.useField("activeTab");
  const feedback = reservationWorkspace.useSelector(({ feedback }) =>
    feedback?.type === "error" && feedback.dialogId !== null ? null : feedback);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => store.dispatch(feedbackChanged(null)), 4500);
    return () => clearTimeout(timer);
  }, [feedback, store]);
  const { pendingCount, confirmedCount, ...todayStats } = reservationWorkspace.useSelector((state) => selectReservationCounts(state, todayIso));
  const openAgenda = ({ status = "ALL", date = "" }: { status?: ReservationStatus | "ALL"; date?: string }) => {
    store.dispatch(agendaOpened({ statusFilter: status, dateFilter: date }));
  };
  const sections = [
    { id: "reservations", label: "Agenda", icon: CalendarDays },
    { id: "events", label: "Eventos", icon: Calendar },
    { id: "shifts", label: "Horarios", icon: Clock },
    { id: "closures", label: "Cierres", icon: CalendarX2 },
  ] as const;
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#182618] sm:text-4xl">Reservas</h1>
          <p className="mt-1 hidden text-sm leading-6 text-zinc-600 sm:block">Organizá los turnos y las reservas del restaurante.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => store.dispatch(openManualReservation(todayIso))} className={adminPrimaryButtonClass}>
            <Plus size={17} aria-hidden="true" /> Nueva reserva
          </button>
          {landingEnabled && (
            <a href={`/l/${restaurantSlug}`} target="_blank" rel="noreferrer" className={`${agendaActionClass} px-3`} title="Abrir la página pública en una nueva pestaña">
              Página pública <ExternalLink size={15} aria-hidden="true" />
            </a>
          )}
        </div>
      </header>

      {feedback && (
        <div role="status" className={`flex items-center justify-between gap-3 rounded-xl px-4 py-2 text-sm ${feedback.type === "success" ? "bg-[#e8efe6] text-[#263e23]" : "bg-red-50 text-red-900"}`}>
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 size={17} className="shrink-0" /> : <AlertCircle size={17} className="shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button type="button" onClick={() => store.dispatch(feedbackChanged(null))} className={agendaActionClass} aria-label="Cerrar notificación"><X size={16} /></button>
        </div>
      )}

      <section aria-label="Resumen del servicio" className="grid overflow-hidden rounded-2xl bg-[#e7eee3] sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <button
          type="button"
          aria-label={`Servicio de hoy, ${todayStats.dinersCount} comensales y ${todayStats.reservationsCount} reservas`}
          onClick={() => openAgenda({ date: todayIso })}
          className="flex min-w-0 items-center gap-3 bg-[#243723] px-3 py-3 text-left text-white transition-colors hover:bg-[#30492e] focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white sm:gap-4 sm:px-5 sm:py-4"
        >
          <CalendarDays size={21} className="hidden shrink-0 text-[#c8d8c2] sm:block" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Servicio de hoy</span>
            <time dateTime={todayIso} className="block text-xs text-[#d0dfcb]">{formatFriendlyDate(todayIso)}</time>
          </span>
          <span className="min-w-0 text-right">
            <span className="block text-base font-semibold tabular-nums sm:text-lg">{todayStats.dinersCount} comensales</span>
            <span className="block text-xs text-[#d0dfcb]">{reservationCountLabel(todayStats.reservationsCount)}</span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-[#d0dfcb]" aria-hidden="true" />
        </button>
        <div className="grid grid-cols-2">
          {([{ status: "PENDING", label: "Pendientes", count: pendingCount, color: "bg-amber-600" }, { status: "CONFIRMED", label: "Confirmadas", count: confirmedCount, color: "bg-[#3d5934]" }] as const).map(({ status, label, count, color }) => (
            <button
              key={status}
              type="button"
              onClick={() => openAgenda({ status })}
              className="flex min-h-11 items-center justify-between gap-1.5 px-3 py-2 text-left text-[#263e23] transition-colors hover:bg-[#dbe7d7] focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#3d5934] sm:px-4"
            >
              <span className="flex items-center gap-2 text-sm font-medium"><span className={`size-2 shrink-0 rounded-full ${color}`} aria-hidden="true" />{label}</span>
              <span className="text-base font-semibold tabular-nums sm:text-lg">{count}</span>
            </button>
          ))}
        </div>
      </section>

      <nav aria-label="Secciones de reservas" className="grid grid-cols-4 gap-1 border-b border-[#dce4d9] sm:flex sm:gap-5">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={activeTab === id ? "true" : undefined}
            onClick={() => setActiveTab(id)}
            className={`flex min-h-11 items-center justify-center gap-1.5 border-b-2 px-1 text-sm font-semibold transition-colors focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-[#3d5934] sm:px-2 ${activeTab === id ? "border-[#3d5934] text-[#263e23]" : "border-transparent text-zinc-600 hover:border-[#cbd8c7] hover:text-[#263e23]"}`}
          >
            <Icon size={16} className="hidden shrink-0 min-[410px]:block" aria-hidden="true" />{label}
          </button>
        ))}
      </nav>
    </>
  );
}
