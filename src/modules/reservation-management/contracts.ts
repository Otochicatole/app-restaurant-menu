import { z } from "zod";

export const reservationStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
]);
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

export const restaurantEventStatusSchema = z.enum([
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "COMPLETED",
]);
export type RestaurantEventStatus = z.infer<typeof restaurantEventStatusSchema>;

export const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
export const timeStringRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

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
  tenantId: string;
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
  tenantId: string;
  dayOfWeek: number;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Bloqueo de Fechas Específicas
// ---------------------------------------------------------------------------
export const addBlockedDateSchema = z.object({
  date: z
    .string()
    .trim()
    .regex(isoDateRegex, "La fecha debe tener formato YYYY-MM-DD"),
  reason: z.string().trim().max(160).default("Cerrado por fecha especial"),
});
export type AddBlockedDateCommand = z.infer<typeof addBlockedDateSchema>;

export type BlockedDateView = {
  id: string;
  tenantId: string;
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
  date: z.string().trim().regex(isoDateRegex, "Fecha inválida (YYYY-MM-DD)"),
  startTime: z
    .string()
    .trim()
    .regex(timeStringRegex, "Horario de inicio inválido (HH:mm)"),
  endTime: z.string().trim().max(10).default(""),
  capacity: z.coerce.number().int().min(1, "El cupo mínimo es 1").max(500).default(20),
  priceLabel: z.string().trim().max(80).default(""),
  imageUrl: z.string().trim().max(500).default(""),
  blocksRegularReservations: z.boolean().default(false),
  status: restaurantEventStatusSchema.default("PUBLISHED"),
});
export type UpsertRestaurantEventCommand = z.infer<typeof upsertRestaurantEventSchema>;

export type RestaurantEventView = {
  id: string;
  tenantId: string;
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
  date: z.string().trim().regex(isoDateRegex, "Fecha inválida (YYYY-MM-DD)"),
  time: z.string().trim().regex(timeStringRegex, "Horario inválido (HH:mm)"),
  notes: z.string().trim().max(500).optional().default(""),
  eventId: z.string().trim().nullable().optional(),
});
export type PublicCreateReservationCommand = z.infer<typeof publicCreateReservationSchema>;

export const publicCreateTableReservationSchema = z.object({
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
  date: z.string().trim().regex(isoDateRegex, "Fecha inválida (YYYY-MM-DD)"),
  time: z.string().trim().regex(timeStringRegex, "Horario inválido (HH:mm)"),
  notes: z.string().trim().max(500).optional().default(""),
});
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

export const adminCreateReservationSchema = publicCreateReservationSchema.extend({
  adminNotes: z.string().trim().max(500).optional().default(""),
  status: reservationStatusSchema.default("CONFIRMED"),
  source: z.enum(["ADMIN", "LANDING"]).default("ADMIN"),
});
export type AdminCreateReservationCommand = z.infer<typeof adminCreateReservationSchema>;

export const updateReservationSchema = z.object({
  id: z.string().min(1),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().trim().max(120).default(""),
  customerPhone: z.string().trim().min(6).max(40),
  partySize: z.coerce.number().int().min(1).max(40),
  date: z.string().trim().regex(isoDateRegex),
  time: z.string().trim().regex(timeStringRegex),
  notes: z.string().trim().max(500).default(""),
  adminNotes: z.string().trim().max(500).default(""),
  status: reservationStatusSchema,
});
export type UpdateReservationCommand = z.infer<typeof updateReservationSchema>;

export type ReservationView = {
  id: string;
  tenantId: string;
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
};

// ---------------------------------------------------------------------------
// Consultas de Disponibilidad
// ---------------------------------------------------------------------------
export const publicAvailabilityQuerySchema = z.object({
  from: z.string().trim().regex(isoDateRegex).optional(),
  to: z.string().trim().regex(isoDateRegex).optional(),
  date: z.string().trim().regex(isoDateRegex).optional(),
});
export type PublicAvailabilityQuery = z.infer<typeof publicAvailabilityQuerySchema>;

// ---------------------------------------------------------------------------
// Vista Completa del CMS (Panel Admin)
// ---------------------------------------------------------------------------
export type ReservationCmsData = {
  tenantId: string;
  restaurantName: string;
  restaurantSlug: string;
  landingEnabled: boolean;
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
