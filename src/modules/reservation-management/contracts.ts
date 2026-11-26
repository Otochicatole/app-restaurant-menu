import { z } from "zod";
import { floorAssignmentSchema, type FloorAssignmentInput } from "@/modules/floor-management/contracts";

export * from "./service-contracts";

export const reservationStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "NO_SHOW",
]);
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

export const walkInDurationSchema = z.coerce.number().int().min(15).max(720).default(120);
export const createWalkInSchema = z.object({
  customerName: z.string().trim().min(1).max(100).default("Sin reserva"),
  partySize: z.number().int().min(1).max(40),
  notes: z.string().trim().max(500).default(""),
  durationMinutes: walkInDurationSchema,
  assignment: floorAssignmentSchema,
});
export type CreateWalkInCommand = z.infer<typeof createWalkInSchema>;

export const restaurantEventStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "COMPLETED",
]);
export type RestaurantEventStatus = z.infer<typeof restaurantEventStatusSchema>;

export const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
export const timeStringRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const isoDateSchema = z.string().trim().regex(isoDateRegex, "Fecha inválida (YYYY-MM-DD)")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    if (year < 1) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }, "La fecha no existe en el calendario");

// ---------------------------------------------------------------------------
// Turnos / Horarios de Atención
// ---------------------------------------------------------------------------
export const upsertTimeSlotSchema = z.object({
  id: z.string().optional(),
  time: z
    .string()
    .trim()
    .regex(timeStringRegex, "El horario debe tener formato HH:mm (ej. 20:30)"),
  label: z.string().trim().max(80).default(""),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});
export type UpsertTimeSlotCommand = z.infer<typeof upsertTimeSlotSchema>;

export type TimeSlotView = {
  id: string;
  restaurantId: string;
  time: string;
  label: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Días de Cierre Recurrentes
// ---------------------------------------------------------------------------
export const recurringClosureItemSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  reason: z.string().trim().max(160).default("Cerrado por descanso semanal"),
});

export const setRecurringClosuresSchema = z.object({
  closures: z.array(recurringClosureItemSchema).max(7),
});
export type SetRecurringClosuresCommand = z.infer<typeof setRecurringClosuresSchema>;

export type RecurringClosureView = {
  id: string;
  restaurantId: string;
  dayOfWeek: number;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Bloqueo de Fechas Específicas
// ---------------------------------------------------------------------------
export const addBlockedDateSchema = z.object({
  date: isoDateSchema,
  reason: z.string().trim().max(160).default("Cerrado por fecha especial"),
});
export type AddBlockedDateCommand = z.infer<typeof addBlockedDateSchema>;

export type BlockedDateView = {
  id: string;
  restaurantId: string;
  date: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Eventos Especiales
// ---------------------------------------------------------------------------
export const upsertRestaurantEventSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "El título del evento es obligatorio").max(120),
  description: z.string().trim().max(1000).default(""),
  date: isoDateSchema,
  startTime: z
    .string()
    .trim()
    .regex(timeStringRegex, "Horario de inicio inválido (HH:mm)"),
  endTime: z.string().trim().refine((value) => value === "" || timeStringRegex.test(value), "Horario de fin inválido (HH:mm)").default(""),
  capacity: z.coerce.number().int().min(1, "El cupo mínimo es 1").max(500).default(20),
  priceLabel: z.string().trim().max(80).default(""),
  imageUrl: z.string().trim().max(1000).default(""),
  blocksRegularReservations: z.boolean().default(false),
  status: restaurantEventStatusSchema.default("PUBLISHED"),
  roomIds: z.array(z.string().min(1)).max(200).optional(),
});
export type UpsertRestaurantEventCommand = z.infer<typeof upsertRestaurantEventSchema>;

export type RestaurantEventView = {
  id: string;
  restaurantId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  priceLabel: string;
  imageUrl: string;
  blocksRegularReservations: boolean;
  status: RestaurantEventStatus;
  confirmedReservationsCount?: number;
  remainingCapacity?: number;
  createdAt: string;
  updatedAt: string;
  roomIds?: string[];
};

// ---------------------------------------------------------------------------
// Reservas de Mesas y Eventos
// ---------------------------------------------------------------------------
export const publicCreateReservationSchema = z.object({
  customerName: z.string().trim().min(2, "Ingresá tu nombre y apellido").max(100),
  customerEmail: z
    .string()
    .trim()
    .max(120)
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Correo electrónico inválido",
    )
    .optional()
    .default(""),
  customerPhone: z
    .string()
    .trim()
    .min(6, "Ingresá un número de teléfono o WhatsApp válido")
    .max(40),
  partySize: z.coerce.number().int().min(1, "Mínimo 1 persona").max(40, "Máximo 40 personas").default(2),
  date: isoDateSchema,
  time: z.string().trim().regex(timeStringRegex, "Horario inválido (HH:mm)"),
  notes: z.string().trim().max(500).optional().default(""),
  eventId: z.string().trim().nullable().optional(),
  preferredSectorId: z.string().trim().min(1).optional(),
});
export type PublicCreateReservationCommand = z.infer<typeof publicCreateReservationSchema>;

export const publicCreateTableReservationSchema = publicCreateReservationSchema.omit({ eventId: true });
export type PublicCreateTableReservationCommand = z.infer<typeof publicCreateTableReservationSchema>;

export const publicCreateEventReservationSchema = z.object({
  eventId: z.string().trim().min(1, "El ID del evento es obligatorio"),
  customerName: z.string().trim().min(2, "Ingresá tu nombre y apellido").max(100),
  customerEmail: z
    .string()
    .trim()
    .max(120)
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Correo electrónico inválido",
    )
    .optional()
    .default(""),
  customerPhone: z
    .string()
    .trim()
    .min(6, "Ingresá un número de WhatsApp de contacto")
    .max(40),
  partySize: z.coerce.number().int().min(1, "Mínimo 1 lugar").max(20, "Máximo 20 lugares").default(1),
  notes: z.string().trim().max(500).optional().default(""),
});
export type PublicCreateEventReservationCommand = z.infer<typeof publicCreateEventReservationSchema>;

export const adminCreateReservationSchema = publicCreateReservationSchema.omit({ preferredSectorId: true }).extend({
  adminNotes: z.string().trim().max(500).optional().default(""),
  status: reservationStatusSchema.default("CONFIRMED"),
  source: z.enum(["ADMIN", "LANDING"]).default("ADMIN"),
  assignment: floorAssignmentSchema.optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
});
export type AdminCreateReservationCommand = z.infer<typeof adminCreateReservationSchema>;

export const updateReservationSchema = z.object({
  id: z.string().min(1),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().max(120).default(""),
  customerPhone: z.string().trim().max(40).refine((value) => value === "" || value.length >= 6, "Teléfono inválido"),
  partySize: z.coerce.number().int().min(1).max(40),
  date: isoDateSchema,
  time: z.string().trim().regex(timeStringRegex),
  notes: z.string().trim().max(500).default(""),
  adminNotes: z.string().trim().max(500).default(""),
  status: reservationStatusSchema,
  assignment: floorAssignmentSchema.optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
});
export type UpdateReservationCommand = z.infer<typeof updateReservationSchema>;
export const floorReservationStatusOptionsSchema = z.object({
  assignment: floorAssignmentSchema.optional(), expectedRevision: z.number().int().nonnegative().optional(),
});
export type ReservationStatusOptions = { assignment?: FloorAssignmentInput; expectedRevision?: number };

export const reservationSectorNotePrefix = "Sector preferido: ";

export type ReservationView = {
  id: string;
  restaurantId: string;
  code: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  partySize: number;
  date: string;
  time: string;
  notes: string;
  adminNotes: string;
  status: ReservationStatus;
  source: "ADMIN" | "LANDING" | string;
  eventId: string | null;
  eventTitle?: string | null;
  createdAt: string;
  updatedAt: string;
  revision: number;
};

// ---------------------------------------------------------------------------
// Consultas de Disponibilidad
// ---------------------------------------------------------------------------
export const publicAvailabilityQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  date: isoDateSchema.optional(),
  partySize: z.coerce.number().int().min(1).max(40).optional(),
});
export type PublicAvailabilityQuery = z.infer<typeof publicAvailabilityQuerySchema>;

export type PublicReservationSectorView = { id: string; name: string; roomName: string };

// ---------------------------------------------------------------------------
// Vista Completa del CMS (Panel Admin)
// ---------------------------------------------------------------------------
export type ReservationCmsData = {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  landingEnabled: boolean;
  floorManagementEnabled: boolean;
  timeZone: string;
  timeSlots: TimeSlotView[];
  recurringClosures: RecurringClosureView[];
  blockedDates: BlockedDateView[];
  events: RestaurantEventView[];
  reservations: ReservationView[];
  summary: {
    totalReservationsToday: number;
    pendingReservationsCount: number;
    confirmedReservationsCount: number;
    activeEventsCount: number;
    activeTimeSlotsCount: number;
  };
};

export * from "./service-contracts";
