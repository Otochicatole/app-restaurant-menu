"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarDays,
  CalendarX2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  Globe,
  Heart,
  LayoutGrid,
  Leaf,
  List,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Moon,
  Phone,
  Plus,
  Printer,
  Search,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  UserCheck,
  Users,
  Utensils,
  WheatOff,
  X,
} from "lucide-react";
import {
  AdminEmptyState,
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
type ViewMode = "cards" | "table";

const DAYS_OF_WEEK = [
  { day: 1, label: "Lunes", short: "Lun" },
  { day: 2, label: "Martes", short: "Mar" },
  { day: 3, label: "Miércoles", short: "Mié" },
  { day: 4, label: "Jueves", short: "Jue" },
  { day: 5, label: "Viernes", short: "Vie" },
  { day: 6, label: "Sábado", short: "Sáb" },
  { day: 0, label: "Domingo", short: "Dom" },
];

const STATUS_BADGE_CLASSES: Record<ReservationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-900 border-amber-200/90 font-semibold",
  CONFIRMED: "bg-emerald-50 text-emerald-900 border-emerald-200/90 font-semibold",
  COMPLETED: "bg-zinc-100 text-zinc-700 border-zinc-200 font-medium",
  CANCELLED: "bg-red-50 text-red-700 border-red-200/80 line-through font-medium",
  REJECTED: "bg-zinc-100 text-zinc-500 border-zinc-200 line-through font-medium",
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Asistió",
  CANCELLED: "Cancelada",
  REJECTED: "Rechazada",
};

const SPANISH_MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const SPANISH_DAYS_LONG = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function getTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, "0");
  const nextD = String(date.getDate()).padStart(2, "0");
  return `${nextY}-${nextM}-${nextD}`;
}

function formatFriendlyDate(isoDate: string): string {
  if (!isoDate || !isoDate.includes("-")) return isoDate;
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = SPANISH_DAYS_LONG[date.getDay()];
  const monthName = SPANISH_MONTHS[m - 1];
  return `${dayName}, ${d} de ${monthName}`;
}

function formatShortDate(isoDate: string): string {
  if (!isoDate || !isoDate.includes("-")) return isoDate;
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = SPANISH_DAYS_LONG[date.getDay()].slice(0, 3);
  return `${dayName} ${d}/${m}`;
}

function buildWhatsAppLink(
  phone: string,
  customerName: string,
  restaurantName: string,
  date: string,
  time: string,
  code: string,
  partySize: number,
): string | null {
  const clean = phone.replace(/[^0-9]/g, "");
  if (!clean || clean.length < 8) return null;
  const friendly = formatFriendlyDate(date);
  const text = `Hola ${customerName}! Te escribimos desde *${restaurantName}* sobre tu reserva (${code}) para *${partySize} ${partySize === 1 ? "persona" : "personas"}* el día *${friendly}* a las *${time} hs*. ¿Nos confirmás tu asistencia? ¡Muchas gracias!`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

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

export function ReservationCmsScreen({
  initialData,
}: {
  initialData: ReservationCmsData;
}) {
  const [data, setData] = useState<ReservationCmsData>(initialData);
  const [activeTab, setActiveTab] = useState<CmsTab>("reservations");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [isPending, startTransition] = useTransition();

  // Feedback notification
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filters for reservations
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "TABLE" | "EVENT">("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Modals state
  const [previewReservation, setPreviewReservation] =
    useState<ReservationView | null>(null);
  const [isCreateResModalOpen, setIsCreateResModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] =
    useState<ReservationView | null>(null);
  const [deletingReservation, setDeletingReservation] =
    useState<ReservationView | null>(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<RestaurantEventView | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<RestaurantEventView | null>(null);
  const [viewingEventAttendees, setViewingEventAttendees] =
    useState<RestaurantEventView | null>(null);

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlotView | null>(null);

  // Form states
  const [resForm, setResForm] = useState<AdminCreateReservationCommand>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    partySize: 2,
    date: getTodayIso(),
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
    date: getTodayIso(),
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode((prev) => (prev === id ? null : prev)), 2000);
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
      date: dateFilter || getTodayIso(),
      time: data.timeSlots[0]?.time || "20:00",
      notes: "",
      adminNotes: "",
      status: "CONFIRMED",
      source: "ADMIN",
      eventId: null,
    });
    setEditingReservation(null);
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
        const res = await updateReservationAction(data.restaurantId, cmd);
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
        const res = await createAdminReservationAction(data.restaurantId, resForm);
        if (res.success) {
          setData((prev) => ({
            ...prev,
            reservations: [res.data, ...prev.reservations],
            summary: {
              ...prev.summary,
              totalReservationsToday:
                res.data.date === getTodayIso()
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
        data.restaurantId,
        reservationId,
        nextStatus,
      );
      if (res.success) {
        setData((prev) => ({
          ...prev,
          reservations: prev.reservations.map((r) =>
            r.id === reservationId ? res.data : r,
          ),
          summary: {
            ...prev.summary,
            pendingReservationsCount: prev.reservations.filter((r) =>
              r.id === reservationId ? nextStatus === "PENDING" : r.status === "PENDING",
            ).length,
            confirmedReservationsCount: prev.reservations.filter((r) =>
              r.id === reservationId ? nextStatus === "CONFIRMED" : r.status === "CONFIRMED",
            ).length,
          },
        }));
        showFeedback("success", `Estado actualizado a "${STATUS_LABEL[nextStatus]}"`);
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  const handleDeleteReservation = () => {
    if (!deletingReservation) return;
    startTransition(async () => {
      const res = await deleteReservationAction(
        data.restaurantId,
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
      const res = await upsertTimeSlotAction(data.restaurantId, cmd);
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
      const res = await upsertTimeSlotAction(data.restaurantId, {
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
      const res = await deleteTimeSlotAction(data.restaurantId, slotId);
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

      const res = await setRecurringClosuresAction(data.restaurantId, {
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
        showFeedback("success", "Días de descanso semanal actualizados.");
      } else {
        showFeedback("error", res.error.message);
      }
    });
  };

  const handleAddBlockedDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedDate.date) return;
    startTransition(async () => {
      const res = await addBlockedDateAction(data.restaurantId, newBlockedDate);
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
      const res = await removeBlockedDateAction(data.restaurantId, id);
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
      date: getTodayIso(),
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
      const res = await upsertRestaurantEventAction(data.restaurantId, cmd);
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
        data.restaurantId,
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
  // Computed & Filtered Data
  // ---------------------------------------------------------------------------
  const todayIso = useMemo(() => getTodayIso(), []);

  const filteredReservations = useMemo(() => {
    return data.reservations.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (typeFilter === "TABLE" && Boolean(r.eventId)) return false;
      if (typeFilter === "EVENT" && !r.eventId) return false;
      if (dateFilter && r.date !== dateFilter) return false;

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
  }, [data.reservations, statusFilter, typeFilter, dateFilter, searchQuery]);

  const todayStats = useMemo(() => {
    const todayRes = data.reservations.filter(
      (r) =>
        r.date === todayIso &&
        r.status !== "CANCELLED" &&
        r.status !== "REJECTED",
    );
    const totalDiners = todayRes.reduce((acc, r) => acc + r.partySize, 0);
    return {
      reservationsCount: todayRes.length,
      dinersCount: totalDiners,
    };
  }, [data.reservations, todayIso]);

  const { lunchSlots, dinnerSlots, otherSlots } = useMemo(() => {
    const lunch: TimeSlotView[] = [];
    const dinner: TimeSlotView[] = [];
    const others: TimeSlotView[] = [];

    data.timeSlots.forEach((slot) => {
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
  }, [data.timeSlots]);

  const isAnyFilterActive = Boolean(
    searchQuery || statusFilter !== "ALL" || dateFilter || typeFilter !== "ALL",
  );

  return (
    <div className="space-y-6 pb-12">
      {/* =================================================================== */}
      {/* 1. HEADER                                                           */}
      {/* =================================================================== */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            Gestión de Reservas y Mesas
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 max-w-2xl leading-relaxed">
            Supervisá comensales, turnos de servicio, confirmaciones instantáneas por WhatsApp y disponibilidad del salón en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {data.landingEnabled && (
            <a
              href={`/l/${data.restaurantSlug}`}
              target="_blank"
              rel="noreferrer"
              className={adminSecondaryButtonClass}
              title="Abrir página pública de reservas en una nueva pestaña"
            >
              <ExternalLink size={15} className="text-zinc-500" />
              <span>Ver Landing</span>
            </a>
          )}
          <button
            type="button"
            onClick={handleOpenCreateRes}
            className={adminPrimaryButtonClass}
          >
            <Plus size={16} />
            <span>Nueva Reserva</span>
          </button>
        </div>
      </header>

      {/* Feedback Toast */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-2xl p-4 text-sm font-medium transition-all shadow-xs ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-950 border border-emerald-300"
              : "bg-red-50 text-red-950 border border-red-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-red-700 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-zinc-500 hover:text-zinc-800 p-1 cursor-pointer"
            aria-label="Cerrar notificación"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. OPERATIONAL KPI STRIP                                            */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Servicio Hoy */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("reservations");
            setDateFilter(todayIso);
          }}
          className={`text-left rounded-2xl border p-4 sm:p-5 shadow-xs transition cursor-pointer ${
            dateFilter === todayIso
              ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/10"
              : "border-zinc-200/90 bg-white hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Servicio Hoy
            </span>
            <span className="h-7 w-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Utensils size={15} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-950 tabular-nums">
              {todayStats.dinersCount}
            </span>
            <span className="text-xs text-zinc-500 font-medium">comensales</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {todayStats.reservationsCount}{" "}
            {todayStats.reservationsCount === 1 ? "mesa reservada" : "mesas reservadas"} hoy
          </p>
        </button>

        {/* Card 2: Por Confirmar */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("reservations");
            setStatusFilter("PENDING");
          }}
          className={`text-left rounded-2xl border p-4 sm:p-5 shadow-xs transition cursor-pointer ${
            statusFilter === "PENDING"
              ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/15"
              : data.summary.pendingReservationsCount > 0
                ? "border-amber-200 bg-amber-50/30 hover:border-amber-300"
                : "border-zinc-200/90 bg-white hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Por Confirmar
            </span>
            <span
              className={`h-7 w-7 rounded-xl flex items-center justify-center ${
                data.summary.pendingReservationsCount > 0
                  ? "bg-amber-100 text-amber-800"
                  : "bg-zinc-100 text-zinc-500"
              }`}
            >
              <Clock size={15} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-950 tabular-nums">
              {data.summary.pendingReservationsCount}
            </span>
            <span className="text-xs text-zinc-500 font-medium">solicitudes</span>
          </div>
          <p className="mt-1 text-xs font-medium text-amber-800">
            {data.summary.pendingReservationsCount > 0
              ? "Requiere atención del host"
              : "Todo al día"}
          </p>
        </button>

        {/* Card 3: Confirmadas */}
        <button
          type="button"
          onClick={() => {
            setActiveTab("reservations");
            setStatusFilter("CONFIRMED");
          }}
          className={`text-left rounded-2xl border p-4 sm:p-5 shadow-xs transition cursor-pointer ${
            statusFilter === "CONFIRMED"
              ? "border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/10"
              : "border-zinc-200/90 bg-white hover:border-zinc-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Confirmadas
            </span>
            <span className="h-7 w-7 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-950 tabular-nums">
              {data.summary.confirmedReservationsCount}
            </span>
            <span className="text-xs text-zinc-500 font-medium">activas</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Listas para el salón</p>
        </button>

        {/* Card 4: Disponibilidad */}
        <button
          type="button"
          onClick={() => setActiveTab("shifts")}
          className="text-left rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-zinc-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Disponibilidad
            </span>
            <span className="h-7 w-7 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <CalendarDays size={15} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-zinc-950 tabular-nums">
              {data.summary.activeTimeSlotsCount}
            </span>
            <span className="text-xs text-zinc-500 font-medium">turnos activos</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {data.summary.activeEventsCount}{" "}
            {data.summary.activeEventsCount === 1 ? "evento publicado" : "eventos publicados"}
          </p>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 3. TABS DE NAVEGACIÓN MODULAR                                      */}
      {/* =================================================================== */}
      <nav
        aria-label="Pestañas de reservas"
        className="flex items-center gap-1.5 p-1.5 bg-zinc-200/60 rounded-2xl border border-zinc-200/70 overflow-x-auto scrollbar-none"
      >
        <button
          type="button"
          onClick={() => setActiveTab("reservations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === "reservations"
              ? "bg-[#182618] text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-950 hover:bg-white/60"
          }`}
        >
          <CalendarDays size={15} />
          <span>Reservas de Mesas</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeTab === "reservations"
                ? "bg-white/20 text-white"
                : "bg-zinc-300/70 text-zinc-700"
            }`}
          >
            {data.reservations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === "events"
              ? "bg-[#182618] text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-950 hover:bg-white/60"
          }`}
        >
          <Sparkles size={15} />
          <span>Eventos Especiales</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeTab === "events"
                ? "bg-white/20 text-white"
                : "bg-zinc-300/70 text-zinc-700"
            }`}
          >
            {data.events.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("shifts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === "shifts"
              ? "bg-[#182618] text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-950 hover:bg-white/60"
          }`}
        >
          <Clock size={15} />
          <span>Horarios y Turnos</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
              activeTab === "shifts"
                ? "bg-white/20 text-white"
                : "bg-zinc-300/70 text-zinc-700"
            }`}
          >
            {data.timeSlots.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("closures")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
            activeTab === "closures"
              ? "bg-[#182618] text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-950 hover:bg-white/60"
          }`}
        >
          <CalendarX2 size={15} />
          <span>Cierres y Descansos</span>
          {(data.recurringClosures.length > 0 || data.blockedDates.length > 0) && (
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                activeTab === "closures"
                  ? "bg-white/20 text-white"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {data.recurringClosures.length + data.blockedDates.length}
            </span>
          )}
        </button>
      </nav>

      {/* =================================================================== */}
      {/* TAB 1: RESERVAS                                                     */}
      {/* =================================================================== */}
      {activeTab === "reservations" && (
        <section aria-label="Listado de reservas" className="space-y-4">
          {/* Unified Command Toolbar */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
            {/* Main Control Row */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search box */}
              <div className="relative flex-1 min-w-[220px]">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Buscar por cliente, teléfono o código (ej. RES-)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618] transition text-zinc-800 placeholder:text-zinc-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 cursor-pointer p-0.5"
                    aria-label="Limpiar búsqueda"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Date Quick Selector */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="inline-flex rounded-xl bg-zinc-100 p-0.5 border border-zinc-200/80">
                  <button
                    type="button"
                    onClick={() => setDateFilter("")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      dateFilter === ""
                        ? "bg-white text-zinc-950 shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-950"
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter(todayIso)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      dateFilter === todayIso
                        ? "bg-white text-emerald-800 shadow-2xs font-bold"
                        : "text-zinc-600 hover:text-zinc-950"
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter(addDaysToIso(todayIso, 1))}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      dateFilter === addDaysToIso(todayIso, 1)
                        ? "bg-white text-emerald-800 shadow-2xs font-bold"
                        : "text-zinc-600 hover:text-zinc-950"
                    }`}
                  >
                    Mañana
                  </button>
                </div>

                {/* Day stepper with date input */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Día anterior"
                    onClick={() =>
                      setDateFilter((prev) => addDaysToIso(prev || todayIso, -1))
                    }
                    className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-medium bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:bg-white focus:outline-none focus:border-[#182618]"
                  />
                  <button
                    type="button"
                    title="Día siguiente"
                    onClick={() =>
                      setDateFilter((prev) => addDaysToIso(prev || todayIso, 1))
                    }
                    className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Status filter dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#182618] font-medium text-zinc-800 cursor-pointer"
              >
                <option value="ALL">Todos los estados</option>
                <option value="PENDING">Pendientes de confirmar</option>
                <option value="CONFIRMED">Confirmadas</option>
                <option value="COMPLETED">Asistieron</option>
                <option value="CANCELLED">Canceladas</option>
                <option value="REJECTED">Rechazadas</option>
              </select>

              {/* View mode toggle */}
              <div className="inline-flex items-center p-0.5 bg-zinc-100 rounded-xl border border-zinc-200/80 shrink-0">
                <button
                  type="button"
                  title="Vista tarjetas"
                  onClick={() => setViewMode("cards")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-white text-zinc-950 shadow-2xs font-bold"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  title="Vista tabla de servicio"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-zinc-950 shadow-2xs font-bold"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  <List size={15} />
                </button>
              </div>
            </div>

            {/* Sub-bar: Type Segments & Active Filter Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-zinc-100 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setTypeFilter("ALL")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                    typeFilter === "ALL"
                      ? "bg-[#182618] text-white"
                      : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Todas ({data.reservations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("TABLE")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                    typeFilter === "TABLE"
                      ? "bg-[#182618] text-white"
                      : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Utensils size={12} />
                  <span>Mesas</span>
                  <span className="opacity-80">
                    ({data.reservations.filter((r) => !r.eventId).length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("EVENT")}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                    typeFilter === "EVENT"
                      ? "bg-purple-900 text-white"
                      : "bg-purple-50 text-purple-900 hover:bg-purple-100"
                  }`}
                >
                  <Sparkles size={12} />
                  <span>Eventos</span>
                  <span className="opacity-80">
                    ({data.reservations.filter((r) => Boolean(r.eventId)).length})
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-3 justify-between sm:justify-end">
                {dateFilter ? (
                  <span className="text-zinc-600 font-medium">
                    {formatFriendlyDate(dateFilter)} ·{" "}
                    <strong className="text-zinc-950">
                      {filteredReservations.length} reservas
                    </strong>{" "}
                    ({filteredReservations.reduce((acc, r) => acc + r.partySize, 0)} pers.)
                  </span>
                ) : (
                  <span className="text-zinc-500 font-medium">
                    {filteredReservations.length} de {data.reservations.length} reservas
                  </span>
                )}

                {isAnyFilterActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("ALL");
                      setDateFilter("");
                      setTypeFilter("ALL");
                    }}
                    className="text-zinc-500 hover:text-red-700 font-medium transition cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Reservations Display: Empty State or Content */}
          {filteredReservations.length === 0 ? (
            <AdminEmptyState
              title="No se encontraron reservas"
              description={
                isAnyFilterActive
                  ? "No hay reservas que coincidan con los criterios de búsqueda o fecha seleccionados."
                  : "Tu restaurante aún no tiene reservas registradas. Podés agregar la primera manualmente."
              }
              action={
                <button
                  type="button"
                  onClick={handleOpenCreateRes}
                  className={adminSecondaryButtonClass}
                >
                  <Plus size={16} />
                  Nueva Reserva
                </button>
              }
            />
          ) : viewMode === "cards" ? (
            /* Cards View */
            <div className="space-y-3">
              {filteredReservations.map((res) => {
                const noteTags = extractNoteTags(res.notes);
                const waLink = buildWhatsAppLink(
                  res.customerPhone,
                  res.customerName,
                  data.restaurantName,
                  res.date,
                  res.time,
                  res.code,
                  res.partySize,
                );

                return (
                  <div
                    key={res.id}
                    className="rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-zinc-300 transition-all space-y-3.5"
                  >
                    {/* Header Row: Meta Badges + Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Left Block: Time Badge, Code, Status, Party */}
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {/* Time & Date Pill */}
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-950 text-white text-xs font-mono font-bold shadow-2xs">
                          <Clock size={12} className="text-zinc-300" />
                          <span>{res.time} hs</span>
                          <span className="opacity-50">•</span>
                          <span className="font-sans font-medium text-[11px] opacity-90">
                            {formatShortDate(res.date)}
                          </span>
                        </div>

                        {/* Party Size */}
                        <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-semibold">
                          <Users size={12} className="text-zinc-500" />
                          <span>
                            {res.partySize} {res.partySize === 1 ? "persona" : "personas"}
                          </span>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-xs px-2.5 py-1 rounded-xl border ${
                            STATUS_BADGE_CLASSES[res.status]
                          }`}
                        >
                          {STATUS_LABEL[res.status]}
                        </span>

                        {/* Event or Salon Tag */}
                        {res.eventId ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200/90">
                            <Sparkles size={11} className="text-purple-700" />
                            <span>{res.eventTitle || "Evento Especial"}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-600 bg-zinc-100 px-2 py-1 rounded-xl">
                            <Utensils size={11} className="text-zinc-400" />
                            <span>Salón</span>
                          </span>
                        )}

                        {/* Reservation Code with Fast Copy */}
                        <div className="flex items-center gap-1 pl-1">
                          <span className="font-mono text-xs font-bold text-zinc-500">
                            {res.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(res.code, res.id)}
                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                            title="Copiar código de reserva"
                          >
                            {copiedCode === res.id ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Right Block: Instant Operational Actions */}
                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        {/* Primary Workflow Status Actions */}
                        {res.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleQuickStatusChange(res.id, "CONFIRMED")}
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <Check size={13} />
                              <span>Confirmar</span>
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleQuickStatusChange(res.id, "REJECTED")}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
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
                              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#182618] hover:bg-[#101c10] text-white transition shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <Utensils size={12} />
                              <span>Asistió</span>
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleQuickStatusChange(res.id, "CANCELLED")}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </>
                        )}

                        {/* WhatsApp Direct Action */}
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300/80 hover:bg-emerald-100 transition shadow-2xs"
                            title="Abrir chat de WhatsApp con plantilla de confirmación"
                          >
                            <MessageCircle size={13} className="text-emerald-700" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {/* Preview Voucher Action */}
                        <button
                          type="button"
                          onClick={() => setPreviewReservation(res)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition shadow-2xs cursor-pointer"
                          title="Previsualizar comprobante y ticket oficial de la reserva"
                        >
                          <Eye size={13} className="text-zinc-600" />
                          <span>Comprobante</span>
                        </button>

                        {/* Secondary: Edit & Delete buttons */}
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
                            setIsCreateResModalOpen(true);
                          }}
                          className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition cursor-pointer"
                          title="Editar reserva"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingReservation(res)}
                          className="p-1.5 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Eliminar reserva"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Middle Block: Customer Identity, Contact, Channel */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                      <div className="flex items-center gap-3 flex-wrap">
                        <strong className="text-base font-bold text-zinc-950">
                          {res.customerName}
                        </strong>

                        <a
                          href={`tel:${res.customerPhone}`}
                          className="flex items-center gap-1 text-xs font-semibold text-zinc-800 hover:text-emerald-700 transition"
                        >
                          <Phone size={12} className="text-zinc-400" />
                          <span>{res.customerPhone}</span>
                        </a>

                        {res.customerEmail && (
                          <a
                            href={`mailto:${res.customerEmail}`}
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition"
                          >
                            <Mail size={12} className="text-zinc-400" />
                            <span>{res.customerEmail}</span>
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium">
                        {res.source === "LANDING" ? (
                          <span className="flex items-center gap-1">
                            <Globe size={11} className="text-zinc-400" />
                            <span>Landing web</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <UserCheck size={11} className="text-zinc-400" />
                            <span>Manual (Admin)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dietary & Preference Tags */}
                    {noteTags.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {noteTags.map((tag) => (
                          <span
                            key={tag.id}
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${tag.color}`}
                          >
                            {renderTagIcon(tag.iconType)}
                            <span>{tag.label}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Customer Notes */}
                    {res.notes && (
                      <div className="text-xs text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-200/80 leading-relaxed flex items-start gap-2">
                        <MessageSquare size={13} className="text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold text-zinc-900">Nota del comensal: </strong>
                          <span>{res.notes}</span>
                        </div>
                      </div>
                    )}

                    {/* Admin Internal Note */}
                    {res.adminNotes && (
                      <div className="text-xs text-blue-950 bg-blue-50/70 p-3 rounded-xl border border-blue-200/90 leading-relaxed flex items-start gap-2">
                        <Shield size={13} className="text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold text-blue-900">Nota interna: </strong>
                          <span>{res.adminNotes}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View (High Density Host Service Table) */
            <div className="rounded-2xl border border-zinc-200/90 bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[980px]">
                  <thead className="bg-zinc-50/90 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3">Hora</th>
                      <th className="py-3 px-2 text-center">Lugares</th>
                      <th className="py-3 px-3">Cliente</th>
                      <th className="py-3 px-3">Contacto</th>
                      <th className="py-3 px-2.5">Tipo</th>
                      <th className="py-3 px-3">Notas / Alergias</th>
                      <th className="py-3 px-2.5">Estado</th>
                      <th className="py-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-medium">
                    {filteredReservations.map((res) => {
                      const noteTags = extractNoteTags(res.notes);
                      const waLink = buildWhatsAppLink(
                        res.customerPhone,
                        res.customerName,
                        data.restaurantName,
                        res.date,
                        res.time,
                        res.code,
                        res.partySize,
                      );

                      return (
                        <tr
                          key={res.id}
                          className="hover:bg-zinc-50/80 transition-colors"
                        >
                          <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-zinc-950">
                            {res.time} hs
                            <span className="block text-[10px] font-sans font-normal text-zinc-500">
                              {formatShortDate(res.date)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded-md">
                              <Users size={11} className="text-zinc-500" />
                              <span>{res.partySize}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-zinc-950 truncate max-w-44">
                              {res.customerName}
                            </div>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {res.code}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="text-zinc-800 font-semibold">{res.customerPhone}</div>
                            {res.customerEmail && (
                              <div className="text-[10px] text-zinc-400 truncate max-w-36">
                                {res.customerEmail}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2.5 whitespace-nowrap">
                            {res.eventId ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                                <Sparkles size={11} className="text-purple-700" />
                                <span>{res.eventTitle || "Evento"}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-lg">
                                <Utensils size={10} className="text-zinc-400" />
                                <span>Salón</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            {noteTags.length > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                {noteTags.map((t) => (
                                  <span
                                    key={t.id}
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${t.color}`}
                                  >
                                    {t.label}
                                  </span>
                                ))}
                              </div>
                            ) : res.notes ? (
                              <span className="text-[11px] text-zinc-600 truncate block max-w-xs" title={res.notes}>
                                {res.notes}
                              </span>
                            ) : (
                              <span className="text-zinc-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-2.5 whitespace-nowrap">
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-full border ${
                                STATUS_BADGE_CLASSES[res.status]
                              }`}
                            >
                              {STATUS_LABEL[res.status]}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick status button */}
                              {res.status === "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(res.id, "CONFIRMED")}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                                >
                                  Confirmar
                                </button>
                              )}
                              {res.status === "CONFIRMED" && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickStatusChange(res.id, "COMPLETED")}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#182618] text-white hover:bg-[#101c10] transition cursor-pointer"
                                >
                                  Asistió
                                </button>
                              )}

                              {/* WhatsApp link */}
                              {waLink && (
                                <a
                                  href={waLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition"
                                  title="WhatsApp"
                                >
                                  <MessageCircle size={14} />
                                </a>
                              )}

                              {/* Preview Voucher */}
                              <button
                                type="button"
                                onClick={() => setPreviewReservation(res)}
                                className="p-1.5 rounded-lg text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition cursor-pointer"
                                title="Previsualizar comprobante oficial"
                              >
                                <Eye size={14} />
                              </button>

                              {/* Edit */}
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
                                  setIsCreateResModalOpen(true);
                                }}
                                className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =================================================================== */}
      {/* TAB 2: EVENTOS ESPECIALES                                           */}
      {/* =================================================================== */}
      {activeTab === "events" && (
        <section aria-label="Eventos especiales" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Cartelera de Eventos y Catas
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Publicá cenas temáticas, degustaciones o noches de autor con cupos limitados en tu landing page.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateEvent}
              className={adminPrimaryButtonClass}
            >
              <Plus size={16} />
              <span>Crear Evento</span>
            </button>
          </div>

          {data.events.length === 0 ? (
            <AdminEmptyState
              title="No hay eventos creados"
              description="Aprovechá las noches temáticas para llenar el restaurante con reservas anticipadas."
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
              {data.events.map((evt) => {
                const capacity = evt.capacity;
                const confirmedCount = capacity - (evt.remainingCapacity ?? capacity);
                const percent = Math.min(100, Math.round((confirmedCount / capacity) * 100));
                const isSoldOut = confirmedCount >= capacity;

                return (
                  <div
                    key={evt.id}
                    className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-zinc-300 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            evt.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-zinc-100 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          {evt.status === "PUBLISHED" ? "Publicado en Web" : evt.status}
                        </span>

                        {isSoldOut ? (
                          <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                            Agotado
                          </span>
                        ) : evt.blocksRegularReservations ? (
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            Salón Exclusivo
                          </span>
                        ) : null}
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-zinc-950">{evt.title}</h3>
                        {evt.description && (
                          <p className="mt-1 text-xs text-zinc-600 leading-relaxed line-clamp-3">
                            {evt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-100 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-zinc-900">
                          <Calendar size={13} className="text-[#3d5934]" />
                          <span>{formatFriendlyDate(evt.date)}</span>
                          <span className="text-zinc-400">•</span>
                          <span>{evt.startTime} hs {evt.endTime ? `- ${evt.endTime} hs` : ""}</span>
                        </span>
                        {evt.priceLabel && (
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            {evt.priceLabel}
                          </span>
                        )}
                      </div>

                      {/* Visual Capacity Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 font-medium">
                            Ocupación ({percent}%):
                          </span>
                          <span className="font-bold text-zinc-900">
                            {confirmedCount} / {capacity} lugares
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percent >= 100
                                ? "bg-red-500"
                                : percent >= 75
                                  ? "bg-amber-500"
                                  : "bg-emerald-600"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom Action Strip */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setViewingEventAttendees(evt)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Users size={13} />
                          <span>Lista de Inscriptos ({confirmedCount})</span>
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
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEvent(evt)}
                          className="p-1.5 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition cursor-pointer"
                          title="Eliminar evento"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* =================================================================== */}
      {/* TAB 3: HORARIOS DE ATENCIÓN (TURNOS)                                */}
      {/* =================================================================== */}
      {activeTab === "shifts" && (
        <section aria-label="Horarios de atención" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl border border-zinc-200/90 p-4 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Franjas Horarias Disponibles
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Definí los turnos en los que tu restaurante acepta reservas regulares. Los comensales elegirán entre estos horarios.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateSlot}
              className={adminPrimaryButtonClass}
            >
              <Plus size={16} />
              <span>Agregar Turno</span>
            </button>
          </div>

          {data.timeSlots.length === 0 ? (
            <AdminEmptyState
              title="No hay turnos configurados"
              description="Para que los comensales puedan reservar en la web, configurá tus horarios de servicio."
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
            <div className="space-y-6">
              {/* Turno Almuerzo / Mediodía */}
              {lunchSlots.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                      <Sun size={14} />
                    </span>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      Turno Mediodía / Almuerzo ({lunchSlots.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {lunchSlots.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        isPending={isPending}
                        onToggleActive={() => handleToggleSlotActive(slot)}
                        onEdit={() => {
                          setEditingSlot(slot);
                          setSlotForm({
                            time: slot.time,
                            label: slot.label,
                            active: slot.active,
                            sortOrder: slot.sortOrder,
                          });
                          setIsSlotModalOpen(true);
                        }}
                        onDelete={() => handleDeleteSlot(slot.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Turno Cena / Noche */}
              {dinnerSlots.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <Moon size={14} />
                    </span>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      Turno Noche / Cena ({dinnerSlots.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {dinnerSlots.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        isPending={isPending}
                        onToggleActive={() => handleToggleSlotActive(slot)}
                        onEdit={() => {
                          setEditingSlot(slot);
                          setSlotForm({
                            time: slot.time,
                            label: slot.label,
                            active: slot.active,
                            sortOrder: slot.sortOrder,
                          });
                          setIsSlotModalOpen(true);
                        }}
                        onDelete={() => handleDeleteSlot(slot.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Otros Horarios */}
              {otherSlots.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                    Otros Horarios ({otherSlots.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {otherSlots.map((slot) => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        isPending={isPending}
                        onToggleActive={() => handleToggleSlotActive(slot)}
                        onEdit={() => {
                          setEditingSlot(slot);
                          setSlotForm({
                            time: slot.time,
                            label: slot.label,
                            active: slot.active,
                            sortOrder: slot.sortOrder,
                          });
                          setIsSlotModalOpen(true);
                        }}
                        onDelete={() => handleDeleteSlot(slot.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* =================================================================== */}
      {/* TAB 4: CIERRES Y DESCANSOS                                          */}
      {/* =================================================================== */}
      {activeTab === "closures" && (
        <section aria-label="Cierres y descansos" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card A: Descanso Semanal Recurrente */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Días de Cierre Recurrente
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                Indicá qué días el restaurante descansa de forma fija semanal. El calendario de reservas bloqueará estos días automáticamente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
                    className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer text-left ${
                      isClosed
                        ? "bg-red-50/70 border-red-200 text-red-950"
                        : "bg-white border-zinc-200 hover:border-zinc-300 text-zinc-800"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-sm block">{label}</span>
                      <span className="text-[11px] text-zinc-400">
                        {isClosed ? "Descanso programado" : "Servicio normal"}
                      </span>
                    </div>

                    <span
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                        isClosed
                          ? "bg-red-100 text-red-800 border-red-200"
                          : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {isClosed ? "Cerrado" : "Abierto"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card B: Bloqueo de Fechas Específicas / Feriados */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-zinc-950">
                Bloquear Fecha Específica
              </h2>
              <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                Cerrá días puntuales (feriados, reformas, mantenimiento o eventos privados) sin modificar tu cronograma semanal.
              </p>
            </div>

            <form onSubmit={handleAddBlockedDate} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Fecha a Bloquear *
                </label>
                <input
                  type="date"
                  required
                  value={newBlockedDate.date}
                  onChange={(e) =>
                    setNewBlockedDate((prev) => ({ ...prev, date: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Motivo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Feriado Nacional, Evento Privado"
                  value={newBlockedDate.reason}
                  onChange={(e) =>
                    setNewBlockedDate((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
                />

                {/* Quick Presets for Reason */}
                <div className="flex items-center gap-1.5 flex-wrap pt-2">
                  <span className="text-[10px] text-zinc-400 font-medium">Motivos frecuentes:</span>
                  {[
                    "Feriado Nacional",
                    "Evento Privado",
                    "Mantenimiento",
                    "Vacaciones",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setNewBlockedDate((prev) => ({ ...prev, reason: preset }))
                      }
                      className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium transition cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending || !newBlockedDate.date}
                className={`w-full ${adminPrimaryButtonClass}`}
              >
                <CalendarX2 size={15} />
                <span>Bloquear Esta Fecha</span>
              </button>
            </form>

            <div className="pt-4 border-t border-zinc-100 space-y-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Fechas Bloqueadas Activas ({data.blockedDates.length})
              </h3>

              {data.blockedDates.length === 0 ? (
                <p className="text-xs text-zinc-400 italic">
                  No hay fechas específicas bloqueadas actualmente.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {data.blockedDates.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs hover:border-zinc-300 transition"
                    >
                      <div>
                        <span className="font-bold text-zinc-900 block text-sm">
                          {formatFriendlyDate(b.date)}
                        </span>
                        <span className="text-zinc-500">{b.reason}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlockedDate(b.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Desbloquear fecha"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* MODAL: PREVIEW DE RESERVA / COMPROBANTE OFICIAL                    */}
      {/* =================================================================== */}
      {previewReservation && (
        <AdminModal
          open={Boolean(previewReservation)}
          title="Comprobante de Reserva"
          description="Vista previa del ticket oficial de reserva y resumen operativo para el salón."
          onClose={() => setPreviewReservation(null)}
        >
          <div className="space-y-4">
            {/* Visual Ticket Voucher Card */}
            <div className="relative rounded-2xl border border-zinc-200 bg-linear-to-b from-zinc-50/70 to-white p-5 sm:p-6 shadow-xs overflow-hidden">
              {/* Header with Code and Status */}
              <div className="flex items-start justify-between gap-3 border-b border-zinc-200/80 pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-bold block mb-0.5">
                    {data.restaurantName || "Restaurante"} · Comprobante Oficial
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-zinc-950">
                      {previewReservation.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(previewReservation.code, "modal-preview-copy")}
                      className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
                      title="Copiar código de reserva"
                    >
                      {copiedCode === "modal-preview-copy" ? (
                        <Check size={14} className="text-emerald-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-xl border ${
                      STATUS_BADGE_CLASSES[previewReservation.status]
                    }`}
                  >
                    {STATUS_LABEL[previewReservation.status]}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                    {previewReservation.source === "LANDING" ? (
                      <>
                        <Globe size={10} className="text-zinc-400" />
                        <span>Landing pública</span>
                      </>
                    ) : (
                      <>
                        <Building2 size={10} className="text-zinc-400" />
                        <span>Registrada en Admin</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Structured Grid of Reservation Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 text-xs">
                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Calendar size={11} className="text-zinc-400" />
                    <span>Fecha</span>
                  </span>
                  <strong className="text-zinc-900 font-bold text-sm block">
                    {formatFriendlyDate(previewReservation.date)}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Clock size={11} className="text-zinc-400" />
                    <span>Turno / Hora</span>
                  </span>
                  <strong className="text-zinc-900 font-bold text-sm block">
                    {previewReservation.time} hs
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Users size={11} className="text-zinc-400" />
                    <span>Comensales</span>
                  </span>
                  <strong className="text-zinc-900 font-bold text-sm block">
                    {previewReservation.partySize} {previewReservation.partySize === 1 ? "persona" : "personas"}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <UserCheck size={11} className="text-zinc-400" />
                    <span>Titular</span>
                  </span>
                  <strong className="text-zinc-900 font-bold block truncate" title={previewReservation.customerName}>
                    {previewReservation.customerName}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Phone size={11} className="text-zinc-400" />
                    <span>Teléfono / WhatsApp</span>
                  </span>
                  <a
                    href={`tel:${previewReservation.customerPhone}`}
                    className="text-zinc-900 font-bold hover:text-emerald-700 block truncate"
                  >
                    {previewReservation.customerPhone}
                  </a>
                </div>

                <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1 mb-0.5">
                    <Mail size={11} className="text-zinc-400" />
                    <span>Email</span>
                  </span>
                  {previewReservation.customerEmail ? (
                    <a
                      href={`mailto:${previewReservation.customerEmail}`}
                      className="text-zinc-900 font-medium hover:text-blue-700 block truncate"
                      title={previewReservation.customerEmail}
                    >
                      {previewReservation.customerEmail}
                    </a>
                  ) : (
                    <span className="text-zinc-400 italic font-normal">No especificado</span>
                  )}
                </div>
              </div>

              {/* Event Banner if tied to an event */}
              {previewReservation.eventId && (
                <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center gap-2 text-xs text-purple-950">
                  <Sparkles size={15} className="text-purple-700 shrink-0" />
                  <div>
                    <span className="font-bold">Evento Especial: </span>
                    {previewReservation.eventTitle || "Evento Especial"}
                  </div>
                </div>
              )}

              {/* Customer Notes */}
              {previewReservation.notes && (
                <div className="mt-3 p-3 rounded-xl bg-zinc-50 border border-zinc-200/90 text-xs text-zinc-800 leading-relaxed">
                  <span className="font-bold text-zinc-900 block mb-0.5">Aclaraciones del comensal:</span>
                  {previewReservation.notes}
                </div>
              )}

              {/* Admin Internal Notes */}
              {previewReservation.adminNotes && (
                <div className="mt-3 p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-950 leading-relaxed">
                  <span className="font-bold text-blue-900 block mb-0.5">Nota interna del restaurante:</span>
                  {previewReservation.adminNotes}
                </div>
              )}
            </div>

            {/* Action Footer in Preview Modal */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                {previewReservation.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        await handleQuickStatusChange(previewReservation.id, "CONFIRMED");
                        setPreviewReservation((prev) => prev ? { ...prev, status: "CONFIRMED" } : null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Check size={14} />
                      <span>Confirmar</span>
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        await handleQuickStatusChange(previewReservation.id, "REJECTED");
                        setPreviewReservation((prev) => prev ? { ...prev, status: "REJECTED" } : null);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer"
                    >
                      Rechazar
                    </button>
                  </>
                )}

                {previewReservation.status === "CONFIRMED" && (
                  <>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        await handleQuickStatusChange(previewReservation.id, "COMPLETED");
                        setPreviewReservation((prev) => prev ? { ...prev, status: "COMPLETED" } : null);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#182618] hover:bg-[#101c10] text-white transition shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Utensils size={13} />
                      <span>Asistió</span>
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        await handleQuickStatusChange(previewReservation.id, "CANCELLED");
                        setPreviewReservation((prev) => prev ? { ...prev, status: "CANCELLED" } : null);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </>
                )}

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => {
                    const resToEdit = previewReservation;
                    setPreviewReservation(null);
                    setEditingReservation(resToEdit);
                    setResForm({
                      customerName: resToEdit.customerName,
                      customerEmail: resToEdit.customerEmail,
                      customerPhone: resToEdit.customerPhone,
                      partySize: resToEdit.partySize,
                      date: resToEdit.date,
                      time: resToEdit.time,
                      notes: resToEdit.notes,
                      adminNotes: resToEdit.adminNotes,
                      status: resToEdit.status,
                      source: resToEdit.source === "LANDING" ? "LANDING" : "ADMIN",
                      eventId: resToEdit.eventId,
                    });
                    setIsCreateResModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition cursor-pointer flex items-center gap-1"
                  title="Editar datos de esta reserva"
                >
                  <Edit2 size={13} />
                  <span>Editar</span>
                </button>

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition cursor-pointer flex items-center gap-1"
                  title="Imprimir ticket de reserva"
                >
                  <Printer size={13} />
                  <span>Imprimir</span>
                </button>
              </div>

              <div className="flex items-center gap-2 justify-end">
                {/* WhatsApp Action Button */}
                {(() => {
                  const link = buildWhatsAppLink(
                    previewReservation.customerPhone,
                    previewReservation.customerName,
                    data.restaurantName,
                    previewReservation.date,
                    previewReservation.time,
                    previewReservation.code,
                    previewReservation.partySize,
                  );
                  if (!link) return null;
                  return (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs flex items-center gap-1.5"
                      title="Abrir WhatsApp con datos de reserva"
                    >
                      <MessageCircle size={14} />
                      <span>WhatsApp</span>
                    </a>
                  );
                })()}

                <button
                  type="button"
                  className={adminSecondaryButtonClass}
                  onClick={() => setPreviewReservation(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </AdminModal>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREAR / EDITAR RESERVA                                      */}
      {/* =================================================================== */}
      <AdminModal
        open={isCreateResModalOpen || Boolean(editingReservation)}
        title={editingReservation ? "Modificar Reserva" : "Nueva Reserva Manual"}
        description={
          editingReservation
            ? `Editando los datos de la reserva ${editingReservation.code}`
            : "Registrá una reserva telefónica o presencial directamente en el sistema."
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
              placeholder="Ej. Martín Pérez"
              value={resForm.customerName}
              onChange={(e) =>
                setResForm((prev) => ({ ...prev, customerName: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
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
                placeholder="Ej. +54 9 11 1234-5678"
                value={resForm.customerPhone}
                onChange={(e) =>
                  setResForm((prev) => ({ ...prev, customerPhone: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
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
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Email (opcional)
            </label>
            <input
              type="email"
              placeholder="ejemplo@correo.com"
              value={resForm.customerEmail || ""}
              onChange={(e) =>
                setResForm((prev) => ({ ...prev, customerEmail: e.target.value }))
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
                value={resForm.date}
                onChange={(e) =>
                  setResForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
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
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#182618]"
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
              Tipo de Reserva / Evento
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
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#182618] font-medium"
            >
              <option value="">Mesa Regular en Salón</option>
              {data.events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  Evento: {ev.title} ({formatShortDate(ev.date)} - {ev.startTime} hs)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Estado Inicial
            </label>
            <select
              value={resForm.status}
              onChange={(e) =>
                setResForm((prev) => ({
                  ...prev,
                  status: e.target.value as ReservationStatus,
                }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#182618] font-medium"
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
              Notas del Cliente (Alergias, cumpleaños, preferencias)
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Celíaco, festejan aniversario, mesa afuera..."
              value={resForm.notes || ""}
              onChange={(e) =>
                setResForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Nota Interna del Administrador
            </label>
            <input
              type="text"
              placeholder="Ej. Mesa 4 asignada, cliente frecuente"
              value={resForm.adminNotes || ""}
              onChange={(e) =>
                setResForm((prev) => ({ ...prev, adminNotes: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#182618]/10 focus:border-[#182618]"
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
              <span>{editingReservation ? "Guardar Cambios" : "Crear Reserva"}</span>
            </button>
          </div>
        </form>
      </AdminModal>

      {/* =================================================================== */}
      {/* MODAL: CREAR / EDITAR EVENTO                                       */}
      {/* =================================================================== */}
      <AdminModal
        open={isEventModalOpen}
        title={editingEvent ? "Modificar Evento" : "Crear Evento Especial"}
        description="Publicá una experiencia especial con aforo limitado en tu menú y landing page."
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
              <span>{editingEvent ? "Guardar Evento" : "Crear Evento"}</span>
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
        title={
          viewingEventAttendees
            ? `Inscriptos: ${viewingEventAttendees.title}`
            : "Inscriptos al Evento"
        }
        description={
          viewingEventAttendees
            ? `Fecha: ${formatFriendlyDate(viewingEventAttendees.date)} • ${viewingEventAttendees.startTime} hs | Capacidad: ${viewingEventAttendees.capacity} cupos`
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
                  <div className="py-10 text-center text-zinc-500 text-sm">
                    No hay personas inscriptas para este evento todavía.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                    <span>
                      Total ocupado:{" "}
                      <strong className="text-zinc-950 font-mono text-sm">
                        {totalConfirmedSpots}
                      </strong>{" "}
                      de {viewingEventAttendees.capacity} lugares
                    </span>
                    <span>
                      Restantes:{" "}
                      <strong className="text-emerald-700 font-mono text-sm">
                        {Math.max(0, viewingEventAttendees.capacity - totalConfirmedSpots)}
                      </strong>
                    </span>
                  </div>

                  <div className="divide-y divide-zinc-100 max-h-[60vh] overflow-y-auto pr-1">
                    {attendees.map((att) => {
                      const waLink = buildWhatsAppLink(
                        att.customerPhone,
                        att.customerName,
                        data.restaurantName,
                        att.date,
                        att.time,
                        att.code,
                        att.partySize,
                      );

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
                              <span className="font-medium text-zinc-700 flex items-center gap-1">
                                <Phone size={11} className="text-zinc-400" />
                                <span>{att.customerPhone}</span>
                              </span>
                              {att.customerEmail && (
                                <span className="flex items-center gap-1">
                                  <Mail size={11} className="text-zinc-400" />
                                  <span>{att.customerEmail}</span>
                                </span>
                              )}
                              <span className="font-mono text-[11px] text-zinc-400">
                                ({att.code})
                              </span>
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
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1"
                              >
                                <MessageCircle size={13} className="text-emerald-700" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setViewingEventAttendees(null);
                                setPreviewReservation(att);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition cursor-pointer flex items-center gap-1"
                            >
                              <Eye size={13} />
                              <span>Comprobante</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  const targetEvt = viewingEventAttendees;
                  setViewingEventAttendees(null);
                  setResForm({
                    customerName: "",
                    customerEmail: "",
                    customerPhone: "",
                    partySize: 2,
                    date: targetEvt.date,
                    time: targetEvt.startTime,
                    notes: "",
                    adminNotes: "",
                    status: "CONFIRMED",
                    source: "ADMIN",
                    eventId: targetEvt.id,
                  });
                  setIsCreateResModalOpen(true);
                }}
                className={adminSecondaryButtonClass}
              >
                <Plus size={15} />
                <span>Agregar Inscripción Manual</span>
              </button>

              <button
                type="button"
                className={adminSecondaryButtonClass}
                onClick={() => setViewingEventAttendees(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </AdminModal>

      {/* =================================================================== */}
      {/* MODAL: CREAR / EDITAR TURNO (SLOT)                                 */}
      {/* =================================================================== */}
      <AdminModal
        open={isSlotModalOpen}
        title={editingSlot ? "Editar Turno" : "Nuevo Turno de Reserva"}
        description="Configurá las horas en las que los comensales pueden reservar mesas."
        onClose={() => {
          setIsSlotModalOpen(false);
          setEditingSlot(null);
        }}
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
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
              <span>{editingSlot ? "Guardar Turno" : "Crear Turno"}</span>
            </button>
          </div>
        </form>
      </AdminModal>

      {/* Confirm Delete Modals */}
      <AdminConfirmModal
        open={Boolean(deletingReservation)}
        title="¿Eliminar esta reserva?"
        description={
          deletingReservation
            ? `Se eliminará la reserva ${deletingReservation.code} a nombre de ${deletingReservation.customerName}. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar Reserva"
        onConfirm={handleDeleteReservation}
        onClose={() => setDeletingReservation(null)}
      />

      <AdminConfirmModal
        open={Boolean(deletingEvent)}
        title="¿Eliminar este evento?"
        description={
          deletingEvent
            ? `Se eliminará "${deletingEvent.title}". No afectará a las reservas que ya fueron confirmadas.`
            : ""
        }
        confirmLabel="Eliminar Evento"
        onConfirm={handleDeleteEvent}
        onClose={() => setDeletingEvent(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: SlotCard
// ---------------------------------------------------------------------------
function SlotCard({
  slot,
  isPending,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  slot: TimeSlotView;
  isPending: boolean;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
        slot.active
          ? "border-zinc-200/90 bg-white hover:border-zinc-300"
          : "border-zinc-200/50 bg-zinc-50/70 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Clock size={15} className="text-[#3d5934]" />
            <span className="text-xl font-bold font-mono text-zinc-950">
              {slot.time} hs
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-zinc-500">
            {slot.label || "Sin etiqueta"}
          </p>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={onToggleActive}
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition cursor-pointer ${
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
          onClick={onEdit}
          className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
          title="Editar"
        >
          <Edit2 size={13} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 text-zinc-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition cursor-pointer"
          title="Eliminar"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
