"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { FloorAssignmentPicker, FloorRoomSelector } from "@/modules/floor-management/ui";
import { restaurantToday, type FloorAssignmentInput } from "@/modules/floor-management/contracts";
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarDays,
  CalendarX2,
  Check,
  CheckCircle2,
  ChevronDown,
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
import { reservationSectorNotePrefix } from "../contracts";
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
  PENDING: "bg-amber-100 text-amber-950 border-amber-200 font-medium",
  CONFIRMED: "bg-[#e3eee0] text-[#294525] border-[#d6e5d3] font-medium",
  COMPLETED: "bg-zinc-100 text-zinc-700 border-zinc-200 font-medium",
  CANCELLED: "bg-red-50 text-red-800 border-red-200 font-medium",
  REJECTED: "bg-zinc-100 text-zinc-700 border-zinc-200 font-medium",
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Finalizada",
  CANCELLED: "Cancelada",
  REJECTED: "Rechazada",
};

const EVENT_STATUS_LABEL: Record<RestaurantEventView["status"], string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  CANCELLED: "Cancelado",
  COMPLETED: "Finalizado",
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

function preferredSectorLabel(reservation: Pick<ReservationView, "notes" | "adminNotes">): string {
  const firstLine = reservation.adminNotes.split(/\r?\n/, 1)[0] ?? "";
  if (firstLine.startsWith(reservationSectorNotePrefix)) return firstLine.slice(reservationSectorNotePrefix.length).trim();
  return /^\[Espacio:\s*([^\]]+)\]/.exec(reservation.notes)?.[1]?.trim() ?? "";
}

function PreferredSector({ label }: { label: string }) {
  if (!label) return null;
  return <p className="mb-1 flex flex-wrap items-baseline gap-x-1.5 text-xs text-zinc-700">
    <span>Sector preferido</span><strong className="break-words font-semibold text-zinc-950">{label}</strong>
  </p>;
}

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

const agendaActionClass = "inline-flex min-h-11 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm text-zinc-700 transition-colors hover:bg-[#edf2ea] hover:text-[#263e23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934] disabled:opacity-50";
const reservationInputClass = "min-h-11 rounded-lg border border-[#d7dfd4] bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-600 focus:border-[#3d5934] focus:ring-2 focus:ring-[#3d5934]/25 disabled:bg-zinc-100";

function reservationCountLabel(count: number) {
  return `${count} ${count === 1 ? "reserva" : "reservas"}`;
}

function ReservationSelect({ label, children, ...props }: React.ComponentProps<"select"> & { label: string }) {
  return (
    <span className="relative block min-w-0">
      <select {...props} aria-label={label} className={`${reservationInputClass} w-full min-w-0 pr-8`}>{children}</select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" aria-hidden="true" />
    </span>
  );
}

function ReservationField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 space-y-1.5"><span className="block text-sm font-medium text-zinc-800">{label}</span>{children}</label>;
}

function ReservationSectionHeader({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#182618] sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
      </div>
      {action && <button type="button" onClick={onAction} className={adminPrimaryButtonClass}><Plus size={16} aria-hidden="true" />{action}</button>}
    </div>
  );
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

function ReservationStatusLabel({ status }: { status: ReservationStatus }) {
  return <span className={`inline-flex w-fit items-center rounded-md px-2 py-1 text-xs ${STATUS_BADGE_CLASSES[status]}`}>{STATUS_LABEL[status]}</span>;
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


export function ReservationCmsScreen({
  initialData,
}: {
  initialData: ReservationCmsData;
}) {
  const [data, setData] = useState<ReservationCmsData>(initialData);
  const today = restaurantToday(data.timeZone ?? "America/Argentina/Buenos_Aires");
  const [resAssignment, setResAssignment] = useState<FloorAssignmentInput | null>(null);
  const [optionalAssignment, setOptionalAssignment] = useState(false);
  const [quickAssignment, setQuickAssignment] = useState<FloorAssignmentInput | null>(null);
  const [assigningReservation, setAssigningReservation] = useState<ReservationView | null>(null);
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
  const reservationFormId = useId();
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
    date: today,
    time: data.timeSlots[0]?.time || "20:00",
    notes: "",
    adminNotes: "",
    status: "CONFIRMED",
    source: "ADMIN",
    eventId: null,
  });
  const resAssignmentTooSmall = resForm.status === "CONFIRMED" && resAssignment?.capacity !== undefined && resAssignment.capacity < resForm.partySize;
  const quickAssignmentTooSmall = Boolean(assigningReservation && quickAssignment?.capacity !== undefined && quickAssignment.capacity < assigningReservation.partySize);

  const [eventForm, setEventForm] = useState<UpsertRestaurantEventCommand>({
    title: "",
    description: "",
    date: today,
    startTime: "21:00",
    endTime: "",
    capacity: 20,
    priceLabel: "",
    imageUrl: "",
    blocksRegularReservations: false,
    roomIds: [],
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
    setFeedback(null);
    setResAssignment(null);
    setOptionalAssignment(false);
    setResForm({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      partySize: 2,
      date: dateFilter || today,
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

  const handleOpenEditRes = (reservation: ReservationView) => {
    setFeedback(null);
    setResAssignment(null);
    setOptionalAssignment(false);
    setEditingReservation(reservation);
    setResForm({
      customerName: reservation.customerName,
      customerEmail: reservation.customerEmail,
      customerPhone: reservation.customerPhone,
      partySize: reservation.partySize,
      date: reservation.date,
      time: reservation.time,
      notes: reservation.notes,
      adminNotes: reservation.adminNotes,
      status: reservation.status,
      source: reservation.source === "LANDING" ? "LANDING" : "ADMIN",
      eventId: reservation.eventId,
    });
    setIsCreateResModalOpen(true);
  };

  const handleSaveReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.floorManagementEnabled && resForm.status === "CONFIRMED" && !resAssignment) {
      showFeedback("error", "Seleccioná y ubicá las mesas antes de confirmar la reserva.");
      return;
    }
    if (resAssignmentTooSmall) {
      showFeedback("error", "El armado necesita más lugares útiles para esta reserva.");
      return;
    }
    startTransition(async () => {
      if (editingReservation) {
        const cmd: UpdateReservationCommand = {
          id: editingReservation.id,
          expectedRevision: editingReservation.revision,
          ...(resForm.status === "CONFIRMED" && resAssignment ? { assignment: resAssignment } : {}),
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
          setIsCreateResModalOpen(false);
          setResAssignment(null);
          showFeedback("success", "Reserva actualizada con éxito.");
        } else {
          showFeedback("error", res.error.message);
        }
      } else {
        const res = await createAdminReservationAction(data.restaurantId, { ...resForm, ...(resForm.status === "CONFIRMED" && resAssignment ? { assignment: resAssignment } : {}) });
        if (res.success) {
          setData((prev) => ({
            ...prev,
            reservations: [res.data, ...prev.reservations],
            summary: {
              ...prev.summary,
              totalReservationsToday:
                res.data.date === today
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
          setResAssignment(null);
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
    assignment?: FloorAssignmentInput,
  ) => {
    const current = data.reservations.find((reservation) => reservation.id === reservationId);
    if (nextStatus === "CONFIRMED" && data.floorManagementEnabled && !assignment && current) {
      setFeedback(null);
      setQuickAssignment(null);
      setAssigningReservation(current);
      setPreviewReservation(null);
      return;
    }
    startTransition(async () => {
      const res = await updateReservationStatusAction(
        data.restaurantId,
        reservationId,
        nextStatus,
        { expectedRevision: current?.revision, ...(assignment ? { assignment } : {}) },
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
        setAssigningReservation(null);
        setPreviewReservation((previous) => previous?.id === reservationId ? res.data : previous);
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
      date: today,
      startTime: "21:00",
      endTime: "",
      capacity: 20,
      priceLabel: "",
      imageUrl: "",
      blocksRegularReservations: false,
      roomIds: [],
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
  const todayIso = today;

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

  const isAnyFilterActive = Boolean(searchQuery || statusFilter !== "ALL" || dateFilter || typeFilter !== "ALL");
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setDateFilter("");
    setTypeFilter("ALL");
  };
  const openAgenda = ({ status = "ALL", date = "" }: { status?: ReservationStatus | "ALL"; date?: string }) => {
    clearFilters();
    setStatusFilter(status);
    setDateFilter(date);
    setActiveTab("reservations");
  };
  const sections = [
    { id: "reservations", label: "Agenda", icon: CalendarDays },
    { id: "events", label: "Eventos", icon: Calendar },
    { id: "shifts", label: "Horarios", icon: Clock },
    { id: "closures", label: "Cierres", icon: CalendarX2 },
  ] as const;
  const agendaTitle = dateFilter === todayIso ? "Agenda de hoy" : dateFilter ? formatFriendlyDate(dateFilter) : "Agenda de reservas";
  const pendingCount = data.reservations.filter((reservation) => reservation.status === "PENDING").length;
  const confirmedCount = data.reservations.filter((reservation) => reservation.status === "CONFIRMED").length;

  return (
    <div className="min-w-0 space-y-4 pb-10 sm:space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#182618] sm:text-4xl">Reservas</h1>
          <p className="mt-1 hidden text-sm leading-6 text-zinc-600 sm:block">Organizá los turnos y las reservas del restaurante.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleOpenCreateRes} className={adminPrimaryButtonClass}>
            <Plus size={17} aria-hidden="true" /> Nueva reserva
          </button>
          {data.landingEnabled && (
            <a href={`/l/${data.restaurantSlug}`} target="_blank" rel="noreferrer" className={`${agendaActionClass} px-3`} title="Abrir la página pública en una nueva pestaña">
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
          <button type="button" onClick={() => setFeedback(null)} className={agendaActionClass} aria-label="Cerrar notificación"><X size={16} /></button>
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

      {activeTab === "reservations" && (
        <section aria-label="Listado de reservas" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-[#182618] sm:text-2xl">{agendaTitle}</h2>
              <p aria-live="polite" aria-atomic="true" className="mt-0.5 text-sm text-zinc-600">
                {reservationCountLabel(filteredReservations.length)}
                {isAnyFilterActive && ` de ${data.reservations.length}`}
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
              <ReservationSelect label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
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
              <button type="button" onClick={isAnyFilterActive ? clearFilters : handleOpenCreateRes} className={`${adminSecondaryButtonClass} mt-4`}>{isAnyFilterActive ? "Limpiar filtros" : "Crear primera reserva"}</button>
            </div>
          ) : (
            <ReservationList
              reservations={filteredReservations}
              mode={viewMode}
              restaurantName={data.restaurantName}
              floorEnabled={data.floorManagementEnabled}
              busy={isPending}
              copiedCode={copiedCode}
              onCopy={copyToClipboard}
              onStatus={handleQuickStatusChange}
              onPreview={setPreviewReservation}
              onEdit={handleOpenEditRes}
              onDelete={setDeletingReservation}
            />
          )}
        </section>
      )}

      {activeTab === "events" && (
        <section aria-label="Eventos especiales" className="space-y-4">
          <ReservationSectionHeader title="Eventos" description="Publicá experiencias con cupos limitados y revisá sus inscripciones." action="Crear evento" onAction={handleOpenCreateEvent} />
          {data.events.length === 0 ? (
            <AdminEmptyState title="Todavía no hay eventos" description="Creá un evento para abrir inscripciones en la página pública." />
          ) : (
            <div className="divide-y divide-[#e9eee7] overflow-hidden rounded-xl bg-white">
              {data.events.map((event) => {
                const occupied = event.capacity - (event.remainingCapacity ?? event.capacity);
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
                        <button type="button" onClick={() => setViewingEventAttendees(event)} className={`${agendaActionClass} bg-[#e7eee3] font-semibold text-[#263e23]`}><Users size={16} aria-hidden="true" /> Ver inscriptos</button>
                        <button type="button" onClick={() => {
                          setEditingEvent(event);
                          setEventForm({
                            title: event.title, description: event.description, date: event.date, startTime: event.startTime,
                            endTime: event.endTime, capacity: event.capacity, priceLabel: event.priceLabel, imageUrl: event.imageUrl,
                            blocksRegularReservations: event.blocksRegularReservations, roomIds: event.roomIds ?? [], status: event.status,
                          });
                          setIsEventModalOpen(true);
                        }} aria-label="Editar evento" title="Editar evento" className={agendaActionClass}><Edit2 size={16} aria-hidden="true" /></button>
                        <button type="button" onClick={() => setDeletingEvent(event)} aria-label="Eliminar evento" title="Eliminar evento" className={`${agendaActionClass} hover:bg-red-50 hover:text-red-800`}><Trash2 size={16} aria-hidden="true" /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "shifts" && (
        <section aria-label="Horarios de atención" className="space-y-4">
          <ReservationSectionHeader title="Horarios de atención" description="Definí los turnos que pueden elegir los comensales." action="Agregar turno" onAction={handleOpenCreateSlot} />
          {data.timeSlots.length === 0 ? (
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
                          <button type="button" aria-label={`Turno ${slot.time} activo`} aria-pressed={slot.active} disabled={isPending} onClick={() => handleToggleSlotActive(slot)} className={`${agendaActionClass} px-2.5 font-medium ${slot.active ? "bg-[#e7eee3] text-[#263e23]" : "bg-zinc-100"}`}>{slot.active ? "Activo" : "Pausado"}</button>
                          <button type="button" aria-label={`Editar turno de las ${slot.time}`} title="Editar turno" onClick={() => {
                            setEditingSlot(slot);
                            setSlotForm({ time: slot.time, label: slot.label, active: slot.active, sortOrder: slot.sortOrder });
                            setIsSlotModalOpen(true);
                          }} className={agendaActionClass}><Edit2 size={16} aria-hidden="true" /></button>
                          <button type="button" aria-label={`Eliminar turno de las ${slot.time}`} title="Eliminar turno" onClick={() => handleDeleteSlot(slot.id)} className={`${agendaActionClass} hover:bg-red-50 hover:text-red-800`}><Trash2 size={16} aria-hidden="true" /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "closures" && (
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
                  const closed = data.recurringClosures.some((closure) => closure.dayOfWeek === day);
                  return (
                    <li key={day}>
                      <button type="button" aria-label={`Cerrar los ${label.toLowerCase()}`} aria-pressed={closed} disabled={isPending} onClick={() => handleToggleRecurringDay(day)} className={`${agendaActionClass} w-full justify-between! px-2.5 text-left`}>
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
              {data.blockedDates.length > 0 ? (
                <ul className="divide-y divide-[#e9eee7] border-t border-[#e9eee7] px-4" aria-label="Fechas bloqueadas">
                  {data.blockedDates.map((blocked) => (
                    <li key={blocked.id} className="flex items-center justify-between gap-2 py-2">
                      <div className="min-w-0 [overflow-wrap:anywhere]">
                        <time dateTime={blocked.date} className="block text-sm font-semibold text-zinc-950">{formatFriendlyDate(blocked.date)}</time>
                        {blocked.reason && <p className="text-sm text-zinc-600">{blocked.reason}</p>}
                      </div>
                      <button type="button" disabled={isPending} onClick={() => handleRemoveBlockedDate(blocked.id)} aria-label={`Desbloquear el ${formatFriendlyDate(blocked.date)}`} title="Desbloquear fecha" className={`${agendaActionClass} hover:bg-red-50 hover:text-red-800`}><Trash2 size={16} aria-hidden="true" /></button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 pb-4 text-sm text-zinc-600">No hay cierres puntuales registrados.</p>
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
                        <span>{previewReservation.source === "WALK_IN" ? "Llegada sin reserva" : "Registrada en Admin"}</span>
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
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#182618] hover:bg-[#101c10] text-white transition shadow-2xs cursor-pointer flex items-center gap-1"
                    >
                      <Utensils size={13} />
                      <span>{data.floorManagementEnabled ? "Finalizar y liberar" : "Asistió"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        await handleQuickStatusChange(previewReservation.id, "CANCELLED");
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
                    setPreviewReservation(null);
                    handleOpenEditRes(previewReservation);
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
      {assigningReservation && <AdminModal open title={`Confirmar reserva ${assigningReservation.code}`} description={`${assigningReservation.customerName} · ${assigningReservation.partySize} personas · ${assigningReservation.date} ${assigningReservation.time}`} wide onClose={() => { if (!isPending) setAssigningReservation(null); }}>
        <div className="space-y-4">
          {feedback?.type === "error" && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{feedback.message}</p>}
          <PreferredSector label={preferredSectorLabel(assigningReservation)} />
          <FloorAssignmentPicker restaurantId={data.restaurantId} query={{ date: assigningReservation.date, time: assigningReservation.time, partySize: assigningReservation.partySize, eventId: assigningReservation.eventId, excludeReservationId: assigningReservation.id }} value={quickAssignment} onChange={setQuickAssignment} />
          <div className="flex justify-end gap-2"><button type="button" className={adminSecondaryButtonClass} onClick={() => setAssigningReservation(null)} disabled={isPending}>Cancelar</button><button type="button" className={adminPrimaryButtonClass} disabled={isPending || !quickAssignment || quickAssignmentTooSmall} onClick={() => { if (quickAssignment && !quickAssignmentTooSmall) handleQuickStatusChange(assigningReservation.id, "CONFIRMED", quickAssignment); }}>{isPending && <Loader2 size={15} className="animate-spin" />}Confirmar y asignar mesas</button></div>
        </div>
      </AdminModal>}

      {/* MODAL: CREAR / EDITAR RESERVA                                      */}
      {/* =================================================================== */}
      <AdminModal
        open={isCreateResModalOpen || Boolean(editingReservation)}
        title={editingReservation ? "Modificar Reserva" : "Nueva Reserva Manual"}
        wide={Boolean(data.floorManagementEnabled)}
        description={
          editingReservation
            ? `Editando los datos de la reserva ${editingReservation.code}`
            : "Registrá una reserva telefónica o presencial directamente en el sistema."
        }
        onClose={() => {
          if (isPending) return;
          setIsCreateResModalOpen(false);
          setEditingReservation(null);
        }}
        footer={
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[#e9eee7] bg-white px-6 py-3 sm:px-8">
            <button type="button" className={adminSecondaryButtonClass} disabled={isPending} onClick={() => {
              setIsCreateResModalOpen(false);
              setEditingReservation(null);
            }}>Cancelar</button>
            <button type="submit" form={reservationFormId} disabled={isPending || resAssignmentTooSmall || (data.floorManagementEnabled && resForm.status === "CONFIRMED" && !resAssignment)} className={adminPrimaryButtonClass}>
              {isPending && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {editingReservation ? "Guardar cambios" : "Crear reserva"}
            </button>
          </div>
        }
      >
        <form id={reservationFormId} onSubmit={handleSaveReservation} className="space-y-5">
          {feedback?.type === "error" && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{feedback.message}</p>}

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
                  {resForm.time && !data.timeSlots.some((slot) => slot.time === resForm.time) && <option value={resForm.time}>{resForm.time} hs</option>}
                  {data.timeSlots.map((slot) => <option key={slot.id} value={slot.time}>{slot.time} hs{slot.label && ` · ${slot.label}`}</option>)}
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
                  const selected = data.events.find((item) => item.id === eventId);
                  setResForm((previous) => ({ ...previous, eventId, date: selected?.date ?? previous.date, time: selected?.startTime ?? previous.time }));
                }}>
                  <option value="">Mesa en salón</option>
                  {data.events.map((event) => <option key={event.id} value={event.id}>{event.title} · {formatShortDate(event.date)}</option>)}
                </ReservationSelect>
              </ReservationField>
              <ReservationField label="Estado">
                <ReservationSelect label="Estado" value={resForm.status} onChange={(event) => setResForm((previous) => ({ ...previous, status: event.target.value as ReservationStatus }))}>
                  {Object.entries(STATUS_LABEL).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
                </ReservationSelect>
              </ReservationField>
            </div>
          </fieldset>

          {!data.floorManagementEnabled && resForm.status === "CONFIRMED" && !optionalAssignment && (
            <button type="button" className={adminSecondaryButtonClass} onClick={() => setOptionalAssignment(true)}><LayoutGrid size={15} />Asignar mesas antes de activar salones</button>
          )}
          {(data.floorManagementEnabled || optionalAssignment) && resForm.status === "CONFIRMED" && (
            <div className="space-y-2">
              {editingReservation && <PreferredSector label={preferredSectorLabel(resForm)} />}
              <FloorAssignmentPicker
                key={editingReservation?.id ?? "new-reservation"}
                restaurantId={data.restaurantId}
                query={{ date: resForm.date, time: resForm.time, partySize: resForm.partySize, eventId: resForm.eventId, ...(editingReservation ? { excludeReservationId: editingReservation.id } : {}) }}
                value={resAssignment}
                onChange={setResAssignment}
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
          {feedback?.type === "error" && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{feedback.message}</p>}
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

          {data.floorManagementEnabled && <FloorRoomSelector restaurantId={data.restaurantId} value={eventForm.roomIds ?? []} onChange={(roomIds) => setEventForm((previous) => ({ ...previous, roomIds }))} />}

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
                  setResAssignment(null);
                  setOptionalAssignment(false);
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
