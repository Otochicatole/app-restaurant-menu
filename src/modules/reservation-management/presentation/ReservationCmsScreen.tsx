"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Clock,
  Edit2,
  Loader2,
  PartyPopper,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import {
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminStatCard,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/ui/admin/AdminPrimitives";
import { AdminConfirmModal, AdminModal } from "@/ui/admin/AdminUI";
import {
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
} from "./actions";
import type {
  AdminCreateReservationCommand,
  ReservationCmsData,
  ReservationStatus,
  ReservationView,
  RestaurantEventView,
  TimeSlotView,
  UpdateReservationCommand,
  UpsertRestaurantEventCommand,
  UpsertTimeSlotCommand,
} from "../contracts";

type CmsTab = "reservations" | "events" | "shifts" | "closures";

const DAYS_OF_WEEK = [
  { day: 1, label: "Lunes" },
  { day: 2, label: "Martes" },
  { day: 3, label: "Miércoles" },
  { day: 4, label: "Jueves" },
  { day: 5, label: "Viernes" },
  { day: 6, label: "Sábado" },
  { day: 0, label: "Domingo" },
];

const STATUS_BADGE_CLASSES: Record<ReservationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80 font-bold",
  CONFIRMED: "bg-emerald-50 text-emerald-800 border-emerald-200/80 font-bold",
  COMPLETED: "bg-zinc-100 text-zinc-700 border-zinc-200/80 font-medium",
  CANCELLED: "bg-red-50 text-red-700 border-red-200/80 line-through font-medium",
  REJECTED: "bg-zinc-100 text-zinc-500 border-zinc-200/80 line-through font-medium",
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Asistió",
  CANCELLED: "Cancelada",
  REJECTED: "Rechazada",
};

export function ReservationCmsScreen({
  initialData,
}: {
  initialData: ReservationCmsData;
}) {
  const [data, setData] = useState<ReservationCmsData>(initialData);
  const [activeTab, setActiveTab] = useState<CmsTab>("reservations");
  const [isPending, startTransition] = useTransition();

  // Feedback banner
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filter states for reservations
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "TABLE" | "EVENT">("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Modals state
  const [isCreateResModalOpen, setIsCreateResModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<ReservationView | null>(null);
  const [deletingReservation, setDeletingReservation] = useState<ReservationView | null>(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RestaurantEventView | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<RestaurantEventView | null>(null);
  const [viewingEventAttendees, setViewingEventAttendees] = useState<RestaurantEventView | null>(null);

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlotView | null>(null);

  // Form states
  const [resForm, setResForm] = useState<AdminCreateReservationCommand>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    partySize: 2,
    date: new Date().toISOString().split("T")[0],
    time: data.timeSlots[0]?.time || "20:00",
    notes: "",
    adminNotes: "",
    status: "CONFIRMED",
    source: "ADMIN",
    eventId: null,
  });

  const [eventForm, setEventForm] = useState<UpsertRestaurantEventCommand>({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "21:00",
    endTime: "",
    capacity: 20,
    priceLabel: "",
    imageUrl: "",
    blocksRegularReservations: false,
    status: "PUBLISHED",
  });

  const [slotForm, setSlotForm] = useState<UpsertTimeSlotCommand>({
    time: "20:00",
    label: "Cena",
    active: true,
    sortOrder: 0,
  });

  const [newBlockedDate, setNewBlockedDate] = useState({
    date: "",
    reason: "Feriado / Cierre especial",
  });

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // ---------------------------------------------------------------------------
  // Handlers: Reservas
  // ---------------------------------------------------------------------------

  const handleOpenCreateRes = () => {
    setResForm({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      partySize: 2,
      date: new Date().toISOString().split("T")[0],
      time: data.timeSlots[0]?.time || "20:00",
      notes: "",
      adminNotes: "",
      status: "CONFIRMED",
      source: "ADMIN",
      eventId: null,
    });
    setIsCreateResModalOpen(true);
  };

  const handleSaveReservation = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (editingReservation) {
        const cmd: UpdateReservationCommand = {
          id: editingReservation.id,
          customerName: resForm.customerName,
          customerEmail: resForm.customerEmail || "",
          customerPhone: resForm.customerPhone,
          partySize: resForm.partySize,
          date: resForm.date,
          time: resForm.time,
          notes: resForm.notes || "",
          adminNotes: resForm.adminNotes || "",
          status: resForm.status,
        };
        const res = await updateReservationAction(data.tenantId, cmd);
        if (res.success) {
          setData((prev) => ({
            ...prev,
            reservations: prev.reservations.map((r) =>
              r.id === res.data.id ? res.data : r,
            ),
          }));
          setEditingReservation(null);
          showFeedback("success", "Reserva actualizada con éxito.");
        } else {
          showFeedback("error", res.error.message);
        }
      } else {
        const res = await createAdminReservationAction(data.tenantId, resForm);
        if (res.success) {
          setData((prev) => ({
            ...prev,
            reservations: [res.data, ...prev.reservations],
            summary: {
              ...prev.summary,
              totalReservationsToday:
                res.data.date === new Date().toISOString().split("T")[0]
                  ? prev.summary.totalReservationsToday + 1
                  : prev.summary.totalReservationsToday,
              confirmedReservationsCount:
                res.data.status === "CONFIRMED"
                  ? prev.summary.confirmedReservationsCount + 1
                  : prev.summary.confirmedReservationsCount,
              pendingReservationsCount:
                res.data.status === "PENDING"
                  ? prev.summary.pendingReservationsCount + 1
                  : prev.summary.pendingReservationsCount,
            },
          }));
          setIsCreateResModalOpen(false);
          showFeedback("success", `Reserva creada con código ${res.data.code}`);
        } else {
          showFeedback("error", res.error.message);
        }
      }
    });
  };

  const handleQuickStatusChange = (
    reservationId: string,
    nextStatus: ReservationStatus,
  ) => {
    startTransition(async () => {
      const res = await updateReservationStatusAction(
        data.tenantId,
        reservationId,
        nextStatus,
      );
      if (res.success) {
        setData((prev) => ({
          ...prev,
          reservations: prev.reservations.map((r) =>
            r.id === reservationId ? res.data : r,
          ),
        }));
        showFeedback("success", `Estado actualizado a ${nextStatus}`);
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  const handleDeleteReservation = () => {
    if (!deletingReservation) return;
    startTransition(async () => {
      const res = await deleteReservationAction(
        data.tenantId,
        deletingReservation.id,
      );
      if (res.success) {
        setData((prev) => ({
          ...prev,
          reservations: prev.reservations.filter(
            (r) => r.id !== deletingReservation.id,
          ),
        }));
        setDeletingReservation(null);
        showFeedback("success", "Reserva eliminada.");
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Handlers: Turnos (Shifts)
  // ---------------------------------------------------------------------------

  const handleOpenCreateSlot = () => {
    setSlotForm({
      time: "20:00",
      label: "Cena",
      active: true,
      sortOrder: data.timeSlots.length,
    });
    setEditingSlot(null);
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const cmd: UpsertTimeSlotCommand = {
        ...slotForm,
        id: editingSlot?.id,
      };
      const res = await upsertTimeSlotAction(data.tenantId, cmd);
      if (res.success) {
        setData((prev) => {
          const exists = prev.timeSlots.some((s) => s.id === res.data.id);
          const nextSlots = exists
            ? prev.timeSlots.map((s) => (s.id === res.data.id ? res.data : s))
            : [...prev.timeSlots, res.data];
          return {
            ...prev,
            timeSlots: nextSlots.sort((a, b) => a.time.localeCompare(b.time)),
          };
        });
        setIsSlotModalOpen(false);
        setEditingSlot(null);
        showFeedback("success", "Turno guardado con éxito.");
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  const handleToggleSlotActive = (slot: TimeSlotView) => {
    startTransition(async () => {
      const res = await upsertTimeSlotAction(data.tenantId, {
        id: slot.id,
        time: slot.time,
        label: slot.label,
        active: !slot.active,
        sortOrder: slot.sortOrder,
      });
      if (res.success) {
        setData((prev) => ({
          ...prev,
          timeSlots: prev.timeSlots.map((s) =>
            s.id === slot.id ? res.data : s,
          ),
        }));
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  const handleDeleteSlot = (slotId: string) => {
    startTransition(async () => {
      const res = await deleteTimeSlotAction(data.tenantId, slotId);
      if (res.success) {
        setData((prev) => ({
          ...prev,
          timeSlots: prev.timeSlots.filter((s) => s.id !== slotId),
        }));
        showFeedback("success", "Turno eliminado.");
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Handlers: Cierres y Excepciones
  // ---------------------------------------------------------------------------

  const handleToggleRecurringDay = (dayOfWeek: number) => {
    startTransition(async () => {
      const exists = data.recurringClosures.some(
        (c) => c.dayOfWeek === dayOfWeek,
      );
      const nextClosures = exists
        ? data.recurringClosures.filter((c) => c.dayOfWeek !== dayOfWeek)
        : [
            ...data.recurringClosures,
            { dayOfWeek, reason: "Cerrado por descanso semanal" },
          ];

      const res = await setRecurringClosuresAction(data.tenantId, {
        closures: nextClosures.map((c) => ({
          dayOfWeek: c.dayOfWeek,
          reason: c.reason,
        })),
      });

      if (res.success) {
        setData((prev) => ({
          ...prev,
          recurringClosures: res.data,
        }));
        showFeedback("success", "Días de cierre semanal actualizados.");
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  const handleAddBlockedDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedDate.date) return;
    startTransition(async () => {
      const res = await addBlockedDateAction(data.tenantId, newBlockedDate);
      if (res.success) {
        setData((prev) => {
          const exists = prev.blockedDates.some(
            (b) => b.id === res.data.id || b.date === res.data.date,
          );
          const next = exists
            ? prev.blockedDates.map((b) =>
                b.date === res.data.date ? res.data : b,
              )
            : [...prev.blockedDates, res.data];
          return {
            ...prev,
            blockedDates: next.sort((a, b) => a.date.localeCompare(b.date)),
          };
        });
        setNewBlockedDate({ date: "", reason: "Feriado / Cierre especial" });
        showFeedback("success", "Fecha bloqueada con éxito.");
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  const handleRemoveBlockedDate = (id: string) => {
    startTransition(async () => {
      const res = await removeBlockedDateAction(data.tenantId, id);
      if (res.success) {
        setData((prev) => ({
          ...prev,
          blockedDates: prev.blockedDates.filter((b) => b.id !== id),
        }));
        showFeedback("success", "Fecha desbloqueada.");
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Handlers: Eventos
  // ---------------------------------------------------------------------------

  const handleOpenCreateEvent = () => {
    setEventForm({
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "21:00",
      endTime: "",
      capacity: 20,
      priceLabel: "",
      imageUrl: "",
      blocksRegularReservations: false,
      status: "PUBLISHED",
    });
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const cmd: UpsertRestaurantEventCommand = {
        ...eventForm,
        id: editingEvent?.id,
      };
      const res = await upsertRestaurantEventAction(data.tenantId, cmd);
      if (res.success) {
        setData((prev) => {
          const exists = prev.events.some((ev) => ev.id === res.data.id);
          const next = exists
            ? prev.events.map((ev) => (ev.id === res.data.id ? res.data : ev))
            : [...prev.events, res.data];
          return {
            ...prev,
            events: next.sort((a, b) => a.date.localeCompare(b.date)),
          };
        });
        setIsEventModalOpen(false);
        setEditingEvent(null);
        showFeedback("success", "Evento guardado.");
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  const handleDeleteEvent = () => {
    if (!deletingEvent) return;
    startTransition(async () => {
      const res = await deleteRestaurantEventAction(
        data.tenantId,
        deletingEvent.id,
      );
      if (res.success) {
        setData((prev) => ({
          ...prev,
          events: prev.events.filter((ev) => ev.id !== deletingEvent.id),
        }));
        setDeletingEvent(null);
        showFeedback("success", "Evento eliminado.");
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Filtered reservations
  // ---------------------------------------------------------------------------
  const filteredReservations = data.reservations.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (dateFilter && r.date !== dateFilter) return false;
    if (typeFilter === "TABLE" && r.eventId) return false;
    if (typeFilter === "EVENT" && !r.eventId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = r.customerName.toLowerCase().includes(q);
      const matchPhone = r.customerPhone.toLowerCase().includes(q);
      const matchCode = r.code.toLowerCase().includes(q);
      const matchEvent = r.eventTitle?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchCode && !matchEvent) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        eyebrow="Gestión del Restaurante"
        title="Reservas de Mesas y Eventos"
        description="Administrá tus reservas entrantes, eventos especiales, horarios de atención por turno y cierres automáticos del calendario."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreateRes}
              className={adminPrimaryButtonClass}
            >
              <Plus size={16} />
              Nueva Reserva
            </button>
          </div>
        }
      />

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-3 rounded-xl p-4 text-sm font-medium transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-red-50 text-red-900 border border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <AdminStatCard
          label="Reservas Hoy"
          value={data.summary.totalReservationsToday}
          detail="Mesas para la fecha actual"
          href="#reservas"
          accent="emerald"
        />
        <AdminStatCard
          label="Pendientes"
          value={data.summary.pendingReservationsCount}
          detail="Requieren confirmación"
          href="#reservas"
          accent="amber"
        />
        <AdminStatCard
          label="Eventos Activos"
          value={data.summary.activeEventsCount}
          detail="Visibles en la landing"
          href="#eventos"
          accent="terracotta"
        />
        <AdminStatCard
          label="Turnos Activos"
          value={data.summary.activeTimeSlotsCount}
          detail="Horarios configurados"
          href="#turnos"
          accent="emerald"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-zinc-200 bg-white rounded-2xl shadow-2xs p-1 flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("reservations")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === "reservations"
              ? "bg-[#182618] text-white shadow-2xs"
              : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
          }`}
        >
          <CalendarDays size={16} />
          Reservas
          <span
            className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === "reservations"
                ? "bg-white/20 text-white"
                : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {data.reservations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === "events"
              ? "bg-[#182618] text-white shadow-2xs"
              : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
          }`}
        >
          <PartyPopper size={16} />
          Eventos Especiales
          <span
            className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === "events"
                ? "bg-white/20 text-white"
                : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {data.events.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shifts")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === "shifts"
              ? "bg-[#182618] text-white shadow-2xs"
              : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
          }`}
        >
          <Clock size={16} />
          Horarios de Atención
          <span
            className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              activeTab === "shifts"
                ? "bg-white/20 text-white"
                : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {data.timeSlots.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("closures")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === "closures"
              ? "bg-[#182618] text-white shadow-2xs"
              : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100"
          }`}
        >
          <CalendarX2 size={16} />
          Cierres y Excepciones
          {(data.recurringClosures.length > 0 ||
            data.blockedDates.length > 0) && (
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === "closures"
                  ? "bg-white/20 text-white"
                  : "bg-zinc-200 text-zinc-700"
              }`}
            >
              {data.recurringClosures.length + data.blockedDates.length}
            </span>
          )}
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: RESERVAS                                                     */}
      {/* =================================================================== */}
      {activeTab === "reservations" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <AdminCard className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Buscar por cliente, teléfono o código (ej. RES-)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20 transition"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter("")}
                    className="text-xs text-zinc-500 hover:text-zinc-800 underline cursor-pointer"
                  >
                    Ver todas las fechas
                  </button>
                )}

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20 font-medium"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="CONFIRMED">Confirmadas</option>
                  <option value="COMPLETED">Finalizadas</option>
                  <option value="CANCELLED">Canceladas</option>
                  <option value="REJECTED">Rechazadas</option>
                </select>
              </div>
            </div>

            {/* Separación y Filtro por Tipo de Reserva: Mesas vs Eventos */}
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setTypeFilter("ALL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                  typeFilter === "ALL"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Todas ({data.reservations.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("TABLE")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                  typeFilter === "TABLE"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <span>🍽️</span> Solo Mesas ({data.reservations.filter((r) => !r.eventId).length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter("EVENT")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                  typeFilter === "EVENT"
                    ? "bg-white text-zinc-950 shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <PartyPopper size={13} className="text-purple-600" />
                Solo Eventos ({data.reservations.filter((r) => Boolean(r.eventId)).length})
              </button>
            </div>
          </AdminCard>

          {/* Reservations List */}
          {filteredReservations.length === 0 ? (
            <AdminEmptyState
              title="No se encontraron reservas"
              description="No hay reservas que coincidan con los filtros seleccionados."
              action={
                <button
                  type="button"
                  onClick={handleOpenCreateRes}
                  className={adminSecondaryButtonClass}
                >
                  <Plus size={16} />
                  Crear primera reserva
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredReservations.map((res) => {
                return (
                  <AdminCard key={res.id} className="p-4 sm:p-5 transition hover:border-zinc-300">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Code, Client info */}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200">
                            {res.code}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full border ${
                              STATUS_BADGE_CLASSES[res.status]
                            }`}
                          >
                            {STATUS_LABEL[res.status]}
                          </span>
                          {res.eventId ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold flex items-center gap-1">
                              <PartyPopper size={12} />
                              {res.eventTitle || "Evento Especial"}
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium flex items-center gap-1">
                              🍽️ Mesa regular
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-400">
                            {res.source === "LANDING" ? "Web" : "Admin"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-zinc-950 truncate">
                            {res.customerName}
                          </h3>
                          <span className="text-xs text-zinc-500 font-medium flex items-center gap-1">
                            <Users size={14} className="text-zinc-400" />
                            {res.partySize} {res.partySize === 1 ? "persona" : "personas"}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                          <span className="font-medium text-zinc-800">
                            📞 {res.customerPhone}
                          </span>
                          {res.customerEmail && (
                            <span className="truncate">✉️ {res.customerEmail}</span>
                          )}
                        </div>

                        {res.notes && (
                          <p className="text-xs text-zinc-600 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                            <span className="font-semibold text-zinc-700">Nota del cliente: </span>
                            {res.notes}
                          </p>
                        )}
                        {res.adminNotes && (
                          <p className="text-xs text-blue-900 bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                            <span className="font-semibold text-blue-800">Nota interna: </span>
                            {res.adminNotes}
                          </p>
                        )}
                      </div>

                      {/* Right: Date, Time & Actions */}
                      <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0">
                        <div className="flex sm:flex-col items-center sm:items-end gap-1.5 sm:gap-0.5">
                          <div className="flex items-center gap-1 text-sm font-bold text-zinc-950">
                            <Calendar size={15} className="text-[#3d5934]" />
                            <span>{res.date}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm font-bold text-[#2b4226]">
                            <Clock size={15} />
                            <span>{res.time} hs</span>
                          </div>
                        </div>

                        {/* Status buttons & actions */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {res.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleQuickStatusChange(res.id, "CONFIRMED")}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleQuickStatusChange(res.id, "REJECTED")}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </>
                          )}

                          {res.status === "CONFIRMED" && (
                            <>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleQuickStatusChange(res.id, "COMPLETED")}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#182618] hover:bg-[#101c10] text-white transition shadow-2xs cursor-pointer"
                              >
                                Asistió
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleQuickStatusChange(res.id, "CANCELLED")}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingReservation(res);
                              setResForm({
                                customerName: res.customerName,
                                customerEmail: res.customerEmail,
                                customerPhone: res.customerPhone,
                                partySize: res.partySize,
                                date: res.date,
                                time: res.time,
                                notes: res.notes,
                                adminNotes: res.adminNotes,
                                status: res.status,
                                source: res.source === "LANDING" ? "LANDING" : "ADMIN",
                                eventId: res.eventId,
                              });
                            }}
                            className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition cursor-pointer"
                            title="Editar reserva"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingReservation(res)}
                            className="p-1.5 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Eliminar reserva"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </AdminCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: EVENTOS ESPECIALES                                           */}
      {/* =================================================================== */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Creá cenas temáticas, noches de música o degustaciones especiales para tu landing page.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateEvent}
              className={adminPrimaryButtonClass}
            >
              <Plus size={16} />
              Crear Evento
            </button>
          </div>

          {data.events.length === 0 ? (
            <AdminEmptyState
              title="No hay eventos especiales creados"
              description="Podés publicar catas de vino, cenas show o festejos especiales con cupos limitados."
              action={
                <button
                  type="button"
                  onClick={handleOpenCreateEvent}
                  className={adminSecondaryButtonClass}
                >
                  <Plus size={16} />
                  Crear mi primer evento
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.events.map((evt) => (
                <AdminCard key={evt.id} className="p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                          evt.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-zinc-100 text-zinc-600 border-zinc-200"
                        }`}
                      >
                        {evt.status === "PUBLISHED" ? "Publicado" : evt.status}
                      </span>
                      {evt.blocksRegularReservations && (
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Bloquea turnos regulares
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-zinc-950">{evt.title}</h3>
                    {evt.description && (
                      <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
                        {evt.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-100 space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-600">
                      <span className="flex items-center gap-1 font-semibold text-zinc-800">
                        <Calendar size={14} className="text-[#3d5934]" />
                        {evt.date} • {evt.startTime} hs {evt.endTime ? `- ${evt.endTime} hs` : ""}
                      </span>
                      {evt.priceLabel && (
                        <span className="font-bold text-emerald-700">
                          {evt.priceLabel}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>
                        Cupo: <strong>{evt.confirmedReservationsCount ?? 0}</strong> / {evt.capacity} reservados
                      </span>
                      <span className="font-semibold text-zinc-700">
                        Disponibles: {evt.remainingCapacity ?? evt.capacity}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setViewingEventAttendees(evt)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Users size={14} />
                        Inscriptos ({data.reservations.filter((r) => r.eventId === evt.id && r.status !== "CANCELLED" && r.status !== "REJECTED").reduce((acc, curr) => acc + curr.partySize, 0)})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEvent(evt);
                          setEventForm({
                            title: evt.title,
                            description: evt.description,
                            date: evt.date,
                            startTime: evt.startTime,
                            endTime: evt.endTime,
                            capacity: evt.capacity,
                            priceLabel: evt.priceLabel,
                            imageUrl: evt.imageUrl,
                            blocksRegularReservations: evt.blocksRegularReservations,
                            status: evt.status,
                          });
                          setIsEventModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEvent(evt)}
                        className="p-1.5 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Eliminar evento"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </AdminCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: HORARIOS DE ATENCIÓN (TURNOS)                                */}
      {/* =================================================================== */}
      {activeTab === "shifts" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Turnos disponibles por día
              </h2>
              <p className="text-xs text-zinc-500">
                Los clientes podrán elegir entre estos horarios para reservar una mesa. Al ocuparse un horario en una fecha, se bloquea automáticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateSlot}
              className={adminPrimaryButtonClass}
            >
              <Plus size={16} />
              Agregar Turno
            </button>
          </div>

          {data.timeSlots.length === 0 ? (
            <AdminEmptyState
              title="No hay turnos configurados"
              description="Agregá los horarios en los que tu restaurante acepta reservas de mesas."
              action={
                <button
                  type="button"
                  onClick={handleOpenCreateSlot}
                  className={adminSecondaryButtonClass}
                >
                  <Plus size={16} />
                  Crear primer turno
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.timeSlots.map((slot) => (
                <AdminCard
                  key={slot.id}
                  className={`p-4 transition ${
                    slot.active
                      ? "border-zinc-200"
                      : "border-zinc-200/50 bg-zinc-50/70 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={16} className="text-[#3d5934]" />
                        <span className="text-xl font-bold font-mono text-zinc-950">
                          {slot.time}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-zinc-500">
                        {slot.label || "Sin etiqueta"}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleSlotActive(slot)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition cursor-pointer ${
                        slot.active
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-zinc-200 text-zinc-600 border-zinc-300"
                      }`}
                    >
                      {slot.active ? "Activo" : "Pausado"}
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSlot(slot);
                        setSlotForm({
                          time: slot.time,
                          label: slot.label,
                          active: slot.active,
                          sortOrder: slot.sortOrder,
                        });
                        setIsSlotModalOpen(true);
                      }}
                      className="p-1 text-zinc-500 hover:text-zinc-900 rounded hover:bg-zinc-100 cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-1 text-zinc-400 hover:text-red-700 rounded hover:bg-red-50 cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </AdminCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: CIERRES Y EXCEPCIONES                                        */}
      {/* =================================================================== */}
      {activeTab === "closures" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section A: Recurring Weekly Closures */}
          <AdminCard className="p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Días de Cierre Semanal Recurrente
              </h2>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                Marcá los días fijos de la semana en los que el restaurante está cerrado de forma permanente. El calendario de la landing bloqueará automáticamente estos días.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {DAYS_OF_WEEK.map(({ day, label }) => {
                const isClosed = data.recurringClosures.some(
                  (c) => c.dayOfWeek === day,
                );
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleToggleRecurringDay(day)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                      isClosed
                        ? "bg-red-50/70 text-red-900 border-red-200"
                        : "bg-white text-zinc-800 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span>{label}</span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        isClosed
                          ? "bg-red-200/80 text-red-900"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isClosed ? "Cerrado fijo" : "Abierto"}
                    </span>
                  </button>
                );
              })}
            </div>
          </AdminCard>

          {/* Section B: Blocked Dates Exceptions */}
          <AdminCard className="p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Bloqueo de Fechas Específicas
              </h2>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                Baneá fechas puntuales (feriados, eventos privados o refacciones) sin alterar los días de cierre semanal.
              </p>
            </div>

            <form onSubmit={handleAddBlockedDate} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Seleccionar Fecha a Bloquear
                </label>
                <input
                  type="date"
                  required
                  value={newBlockedDate.date}
                  onChange={(e) =>
                    setNewBlockedDate((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Motivo del Cierre
                </label>
                <input
                  type="text"
                  placeholder="Ej. Feriado Nacional, Evento Privado"
                  value={newBlockedDate.reason}
                  onChange={(e) =>
                    setNewBlockedDate((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
                />
              </div>

              <button
                type="submit"
                disabled={isPending || !newBlockedDate.date}
                className={`w-full ${adminSecondaryButtonClass}`}
              >
                <CalendarX2 size={16} />
                Bloquear Fecha
              </button>
            </form>

            <div className="pt-4 border-t border-zinc-100 space-y-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Fechas Bloqueadas ({data.blockedDates.length})
              </h3>
              {data.blockedDates.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">
                  No hay fechas específicas bloqueadas.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {data.blockedDates.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs"
                    >
                      <div>
                        <span className="font-bold text-zinc-900 block">
                          {b.date}
                        </span>
                        <span className="text-zinc-500">{b.reason}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlockedDate(b.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 cursor-pointer"
                        title="Desbloquear fecha"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AdminCard>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREAR / EDITAR RESERVA                                      */}
      {/* =================================================================== */}
      <AdminModal
        open={isCreateResModalOpen || Boolean(editingReservation)}
        title={editingReservation ? "Editar Reserva" : "Nueva Reserva"}
        description={
          editingReservation
            ? `Modificá los datos de la reserva ${editingReservation.code}`
            : "Creá una reserva manual directamente desde el panel."
        }
        onClose={() => {
          setIsCreateResModalOpen(false);
          setEditingReservation(null);
        }}
      >
        <form onSubmit={handleSaveReservation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Nombre y Apellido del Cliente *
            </label>
            <input
              type="text"
              required
              value={resForm.customerName}
              onChange={(e) =>
                setResForm((prev) => ({ ...prev, customerName: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={resForm.customerPhone}
                onChange={(e) =>
                  setResForm((prev) => ({ ...prev, customerPhone: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Comensales *
              </label>
              <input
                type="number"
                min={1}
                max={40}
                required
                value={resForm.partySize}
                onChange={(e) =>
                  setResForm((prev) => ({
                    ...prev,
                    partySize: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Correo Electrónico (opcional)
            </label>
            <input
              type="email"
              value={resForm.customerEmail || ""}
              onChange={(e) =>
                setResForm((prev) => ({ ...prev, customerEmail: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
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
                value={resForm.date}
                onChange={(e) =>
                  setResForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Horario (Turno) *
              </label>
              <select
                required
                value={resForm.time}
                onChange={(e) =>
                  setResForm((prev) => ({ ...prev, time: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
              >
                {data.timeSlots.map((slot) => (
                  <option key={slot.id} value={slot.time}>
                    {slot.time} hs {slot.label ? `(${slot.label})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Tipo de Reserva / Evento Asociado
            </label>
            <select
              value={resForm.eventId || ""}
              onChange={(e) => {
                const selectedId = e.target.value || null;
                const targetEvt = data.events.find((ev) => ev.id === selectedId);
                setResForm((prev) => ({
                  ...prev,
                  eventId: selectedId,
                  date: targetEvt ? targetEvt.date : prev.date,
                  time: targetEvt ? targetEvt.startTime : prev.time,
                }));
              }}
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20 font-medium"
            >
              <option value="">🍽️ Mesa regular (sin evento)</option>
              {data.events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  🎉 Evento: {ev.title} ({ev.date} - {ev.startTime} hs)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Estado de la Reserva
            </label>
            <select
              value={resForm.status}
              onChange={(e) =>
                setResForm((prev) => ({
                  ...prev,
                  status: e.target.value as ReservationStatus,
                }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20 font-medium"
            >
              <option value="CONFIRMED">Confirmada</option>
              <option value="PENDING">Pendiente</option>
              <option value="COMPLETED">Asistió</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="REJECTED">Rechazada</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Notas del Cliente (Alergias, preferencia de mesa)
            </label>
            <textarea
              rows={2}
              value={resForm.notes || ""}
              onChange={(e) =>
                setResForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Nota Interna del Administrador
            </label>
            <input
              type="text"
              placeholder="Ej. Mesa 4 asignada, cliente VIP"
              value={resForm.adminNotes || ""}
              onChange={(e) =>
                setResForm((prev) => ({ ...prev, adminNotes: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              className={adminSecondaryButtonClass}
              onClick={() => {
                setIsCreateResModalOpen(false);
                setEditingReservation(null);
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={adminPrimaryButtonClass}
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              {editingReservation ? "Guardar Cambios" : "Crear Reserva"}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* =================================================================== */}
      {/* MODAL: CREAR / EDITAR EVENTO                                       */}
      {/* =================================================================== */}
      <AdminModal
        open={isEventModalOpen}
        title={editingEvent ? "Editar Evento" : "Nuevo Evento Especial"}
        description="Configurá las fechas, horarios y cupos de tu evento especial."
        onClose={() => {
          setIsEventModalOpen(false);
          setEditingEvent(null);
        }}
      >
        <form onSubmit={handleSaveEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Título del Evento *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Noche de Jazz & Vino"
              value={eventForm.title}
              onChange={(e) =>
                setEventForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={3}
              placeholder="Detalles del menú, artistas invitados o información relevante..."
              value={eventForm.description}
              onChange={(e) =>
                setEventForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
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
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Inicio (HH:mm) *
              </label>
              <input
                type="text"
                required
                placeholder="21:00"
                value={eventForm.startTime}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, startTime: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Fin (opcional)
              </label>
              <input
                type="text"
                placeholder="23:30"
                value={eventForm.endTime}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, endTime: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Cupo Máximo *
              </label>
              <input
                type="number"
                min={1}
                max={500}
                required
                value={eventForm.capacity}
                onChange={(e) =>
                  setEventForm((prev) => ({
                    ...prev,
                    capacity: Number(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Precio o Entrada
              </label>
              <input
                type="text"
                placeholder="Ej. $25.000 / Entrada libre"
                value={eventForm.priceLabel}
                onChange={(e) =>
                  setEventForm((prev) => ({ ...prev, priceLabel: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
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
              className="rounded text-[#182618] focus:ring-[#182618]/20 h-4 w-4"
            />
            <label htmlFor="blocksRegular" className="text-xs text-amber-900 font-medium">
              Bloquear reservas regulares este día (el restaurante solo funcionará para el evento)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              className={adminSecondaryButtonClass}
              onClick={() => {
                setIsEventModalOpen(false);
                setEditingEvent(null);
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={adminPrimaryButtonClass}
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              {editingEvent ? "Guardar Cambios" : "Publicar Evento"}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* =================================================================== */}
      {/* MODAL: VER INSCRIPTOS A UN EVENTO                                   */}
      {/* =================================================================== */}
      <AdminModal
        open={Boolean(viewingEventAttendees)}
        onClose={() => setViewingEventAttendees(null)}
        title={viewingEventAttendees ? `Inscriptos: ${viewingEventAttendees.title}` : "Inscriptos al Evento"}
        description={
          viewingEventAttendees
            ? `Fecha: ${viewingEventAttendees.date} • ${viewingEventAttendees.startTime} hs | Capacidad: ${viewingEventAttendees.capacity} cupos`
            : ""
        }
        wide
      >
        {viewingEventAttendees && (
          <div className="space-y-4 py-2">
            {(() => {
              const attendees = data.reservations.filter(
                (r) => r.eventId === viewingEventAttendees.id,
              );
              const totalConfirmedSpots = attendees
                .filter((r) => r.status !== "CANCELLED" && r.status !== "REJECTED")
                .reduce((acc, r) => acc + r.partySize, 0);

              if (attendees.length === 0) {
                return (
                  <div className="py-8 text-center text-zinc-500 text-sm">
                    No hay personas inscriptas registradas para este evento todavía.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                    <span>
                      Total cupos ocupados: <strong className="text-zinc-950">{totalConfirmedSpots}</strong> de {viewingEventAttendees.capacity}
                    </span>
                    <span>
                      Cupos restantes: <strong className="text-emerald-700">{Math.max(0, viewingEventAttendees.capacity - totalConfirmedSpots)}</strong>
                    </span>
                  </div>

                  <div className="divide-y divide-zinc-100 max-h-[60vh] overflow-y-auto pr-1">
                    {attendees.map((att) => {
                      const cleanPhone = att.customerPhone.replace(/[^0-9]/g, "");
                      const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

                      return (
                        <div
                          key={att.id}
                          className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-zinc-950">
                                {att.customerName}
                              </span>
                              <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-100 rounded-md text-zinc-700 flex items-center gap-1">
                                <Users size={12} className="text-zinc-500" />
                                {att.partySize} {att.partySize === 1 ? "lugar" : "lugares"}
                              </span>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                                  STATUS_BADGE_CLASSES[att.status]
                                }`}
                              >
                                {STATUS_LABEL[att.status]}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
                              <span className="font-medium text-zinc-700">📞 {att.customerPhone}</span>
                              {att.customerEmail && <span>✉️ {att.customerEmail}</span>}
                              <span className="font-mono text-[11px] text-zinc-400">({att.code})</span>
                            </div>

                            {att.notes && (
                              <p className="text-xs text-zinc-600 bg-zinc-50 p-1.5 rounded-lg border border-zinc-100">
                                <span className="font-medium text-zinc-700">Nota: </span>
                                {att.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition"
                              >
                                WhatsApp
                              </a>
                            )}
                            {att.status === "PENDING" && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleQuickStatusChange(att.id, "CONFIRMED")}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                              >
                                Confirmar
                              </button>
                            )}
                            {att.status === "CONFIRMED" && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleQuickStatusChange(att.id, "COMPLETED")}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#182618] text-white hover:bg-[#101c10] transition"
                              >
                                Asistió
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingReservation(att);
                                setResForm({
                                  customerName: att.customerName,
                                  customerEmail: att.customerEmail,
                                  customerPhone: att.customerPhone,
                                  partySize: att.partySize,
                                  date: att.date,
                                  time: att.time,
                                  notes: att.notes,
                                  adminNotes: att.adminNotes,
                                  status: att.status,
                                  source: att.source === "LANDING" ? "LANDING" : "ADMIN",
                                  eventId: att.eventId,
                                });
                              }}
                              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition"
                              title="Editar reserva"
                            >
                              <Edit2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </AdminModal>

      {/* =================================================================== */}
      {/* MODAL: CREAR / EDITAR TURNO (SLOT)                                 */}
      {/* =================================================================== */}
      <AdminModal
        open={isSlotModalOpen}
        title={editingSlot ? "Editar Turno" : "Nuevo Turno de Atención"}
        description="Definí el horario disponible para que los clientes puedan reservar."
        onClose={() => {
          setIsSlotModalOpen(false);
          setEditingSlot(null);
        }}
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Horario (HH:mm) *
            </label>
            <input
              type="text"
              required
              placeholder="20:30"
              value={slotForm.time}
              onChange={(e) =>
                setSlotForm((prev) => ({ ...prev, time: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20 font-mono text-base font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Etiqueta descriptiva (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Almuerzo, Cena 1° Turno, Terraza"
              value={slotForm.label}
              onChange={(e) =>
                setSlotForm((prev) => ({ ...prev, label: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/20"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="activeSlot"
              checked={slotForm.active}
              onChange={(e) =>
                setSlotForm((prev) => ({ ...prev, active: e.target.checked }))
              }
              className="rounded text-[#182618] focus:ring-[#182618]/20 h-4 w-4"
            />
            <label htmlFor="activeSlot" className="text-xs text-zinc-700 font-medium">
              Turno activo (disponible para ser seleccionado en reservas)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              className={adminSecondaryButtonClass}
              onClick={() => {
                setIsSlotModalOpen(false);
                setEditingSlot(null);
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={adminPrimaryButtonClass}
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              Guardar Turno
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Confirm Modals */}
      <AdminConfirmModal
        open={Boolean(deletingReservation)}
        title="Eliminar Reserva"
        description={`¿Estás seguro de que querés eliminar la reserva de ${deletingReservation?.customerName} (${deletingReservation?.code})?`}
        onClose={() => setDeletingReservation(null)}
        onConfirm={handleDeleteReservation}
        loading={isPending}
        confirmLabel="Eliminar Reserva"
      />

      <AdminConfirmModal
        open={Boolean(deletingEvent)}
        title="Eliminar Evento"
        description={`¿Estás seguro de que querés eliminar el evento "${deletingEvent?.title}"?`}
        onClose={() => setDeletingEvent(null)}
        onConfirm={handleDeleteEvent}
        loading={isPending}
        confirmLabel="Eliminar Evento"
      />
    </div>
  );
}
