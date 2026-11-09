import { reservationSectorNotePrefix, type ReservationStatus, type ReservationView, type RestaurantEventView } from "../contracts";

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Finalizada",
  CANCELLED: "Cancelada",
  REJECTED: "Rechazada",
};

export const EVENT_STATUS_LABEL: Record<RestaurantEventView["status"], string> = {
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

export function addDaysToIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, "0");
  const nextD = String(date.getDate()).padStart(2, "0");
  return `${nextY}-${nextM}-${nextD}`;
}

export function formatFriendlyDate(isoDate: string): string {
  if (!isoDate || !isoDate.includes("-")) return isoDate;
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = SPANISH_DAYS_LONG[date.getDay()];
  const monthName = SPANISH_MONTHS[m - 1];
  return `${dayName}, ${d} de ${monthName}`;
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate || !isoDate.includes("-")) return isoDate;
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = SPANISH_DAYS_LONG[date.getDay()].slice(0, 3);
  return `${dayName} ${d}/${m}`;
}

export function buildWhatsAppLink(
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

export function preferredSectorLabel(reservation: Pick<ReservationView, "notes" | "adminNotes">): string {
  const firstLine = reservation.adminNotes.split(/\r?\n/, 1)[0] ?? "";
  if (firstLine.startsWith(reservationSectorNotePrefix)) return firstLine.slice(reservationSectorNotePrefix.length).trim();
  return /^\[Espacio:\s*([^\]]+)\]/.exec(reservation.notes)?.[1]?.trim() ?? "";
}

export function reservationCountLabel(count: number) {
  return `${count} ${count === 1 ? "reserva" : "reservas"}`;
}
