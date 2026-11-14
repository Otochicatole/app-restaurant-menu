import { z } from "zod";

export const servicePaymentMethodSchema = z.enum(["CASH", "CARD", "TRANSFER_QR", "SPLIT"]);
export type ServicePaymentMethod = z.infer<typeof servicePaymentMethodSchema>;

export const kitchenStatusSchema = z.enum(["PENDING", "IN_PREP", "READY", "SERVED", "CANCELLED"]);
export type KitchenStatus = z.infer<typeof kitchenStatusSchema>;

export const kitchenStationSchema = z.enum(["KITCHEN", "BAR"]);
export type KitchenStation = z.infer<typeof kitchenStationSchema>;

export const staffRoleSchema = z.enum(["WAITER", "KITCHEN", "BAR", "CASHIER", "HOST", "MANAGER", "OTHER"]);
export type StaffRole = z.infer<typeof staffRoleSchema>;

export const staffRoleLabels: Record<StaffRole, string> = {
  WAITER: "Camarero/a",
  KITCHEN: "Cocina",
  BAR: "Barra",
  CASHIER: "Caja",
  HOST: "Recepción",
  MANAGER: "Encargado/a",
  OTHER: "General",
};

const id = z.string().min(1).max(128);
const revision = z.number().int().nonnegative();
const name = z.string().trim().min(1).max(120);
const unitPriceCents = z.number().int().min(1).max(2_147_483_647);
const nonNegativeCents = z.number().int().min(0).max(2_147_483_647);
const date = z.iso.date();

export const serviceCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), allocationId: id, tableId: id, expectedAllocationVersion: revision, waiterId: id }),
  z.object({ action: z.literal("assign-waiter"), accountId: id, expectedVersion: revision, waiterId: id }),
  z.object({ action: z.literal("close-empty"), allocationId: id, tableId: id, expectedAllocationVersion: revision }),
  z.object({
    action: z.literal("add-line"),
    accountId: id,
    expectedVersion: revision,
    quantity: z.number().int().min(1).max(99),
    productId: id.optional(),
    name: name.optional(),
    unitPriceCents: unitPriceCents.optional(),
    notes: z.string().trim().max(200).optional(),
    station: kitchenStationSchema.optional(),
  }).refine((command) => command.productId !== undefined
    ? command.name === undefined && command.unitPriceCents === undefined
    : command.name !== undefined && command.unitPriceCents !== undefined, "Elegí un producto o ingresá nombre y precio."),
  z.object({
    action: z.literal("update-line"),
    accountId: id,
    expectedVersion: revision,
    lineId: id,
    deliveredQuantity: z.number().int().min(0).max(99),
    cancelledQuantity: z.number().int().min(0).max(99),
  }),
  z.object({
    action: z.literal("deliver-all"),
    accountId: id,
    expectedVersion: revision,
  }),
  z.object({
    action: z.literal("march-round"),
    accountId: id,
    expectedVersion: revision,
  }),
  z.object({
    action: z.literal("update-kitchen-status"),
    lineId: id,
    status: kitchenStatusSchema,
  }),
  z.object({
    action: z.literal("checkout"),
    accountId: id,
    expectedVersion: revision,
    paymentMethod: servicePaymentMethodSchema.optional(),
    tipCents: nonNegativeCents.optional(),
    discountCents: nonNegativeCents.optional(),
    discountReason: z.string().trim().max(100).optional(),
    cashCents: nonNegativeCents.optional(),
    cardCents: nonNegativeCents.optional(),
    transferCents: nonNegativeCents.optional(),
  }),
  z.object({ action: z.literal("save-product"), id: id.optional(), name, unitPriceCents }),
  z.object({ action: z.literal("archive-product"), id }),
  z.object({
    action: z.literal("save-staff"),
    id: id.optional(),
    name: z.string().trim().min(1).max(100),
    role: staffRoleSchema,
    phone: z.string().trim().max(40).default(""),
    notes: z.string().trim().max(200).default(""),
    active: z.boolean().default(true),
  }),
  z.object({ action: z.literal("set-staff-active"), id, active: z.boolean() }),
  z.object({ action: z.literal("close-day"), date }),
  z.object({ action: z.literal("reopen-day"), date, reason: z.string().trim().min(1).max(500) }),
]);

export const serviceCashRangeSchema = z.object({ from: date, to: date })
  .refine(({ from, to }) => from <= to, "El inicio del período debe ser anterior o igual al fin.");

export type ServiceCommand = z.infer<typeof serviceCommandSchema>;
export type ServiceProductView = { id: string; name: string; unitPriceCents: number; active: boolean };

export type StaffMemberView = {
  id: string;
  name: string;
  role: StaffRole;
  phone: string;
  notes: string;
  active: boolean;
  createdAt: string;
};

export type ServiceOrderLineView = {
  id: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  deliveredQuantity: number;
  cancelledQuantity: number;
  notes: string;
  kitchenStatus: KitchenStatus;
  round: number;
  station: KitchenStation;
  createdAt: string;
};

export type ServiceAccountView = {
  id: string;
  allocationId: string;
  reservationId: string;
  roomId: string;
  roomName: string;
  reservationCode: string;
  customerName: string;
  assignedWaiterId: string | null;
  assignedWaiterName: string | null;
  version: number;
  openedAt: string;
  closedAt: string | null;
  businessDate: string | null;
  paymentMethod: ServicePaymentMethod | null;
  totalCents: number | null;
  receiptNumber: string | null;
  tipCents: number;
  discountCents: number;
  discountReason: string | null;
  cashCents: number;
  cardCents: number;
  transferCents: number;
  tableIds: string[];
  tableLabels: string[];
  lines: ServiceOrderLineView[];
  orderedCents: number;
  deliveredCents: number;
  pendingQuantity: number;
  readyQuantity: number;
};

export type ServiceCashTotals = {
  cashCents: number;
  cardCents: number;
  transferCents: number;
  tipCents: number;
  discountCents: number;
  receiptCount: number;
  totalCents: number;
};

export type ServiceCashEventView = {
  id: string;
  restaurantId: string;
  businessDate: string;
  revision: number;
  kind: "CLOSE" | "REOPEN";
  actorId: string;
  reason: string | null;
  createdAt: string;
  cashCents: number;
  cardCents: number;
  transferCents: number;
  receiptCount: number;
};

export type ServiceUnservedGroup = {
  allocationId: string;
  expectedAllocationVersion: number;
  tableId: string;
  tableLabels: string[];
  reservationCode: string;
  customerName: string;
  roomName: string;
};

export type ServiceSnapshot = {
  accounts: ServiceAccountView[];
  products: ServiceProductView[];
  waiters: StaffMemberView[];
  cashClosed: boolean;
  unserved: ServiceUnservedGroup[];
};

export type KitchenTicketLine = {
  id: string;
  name: string;
  quantity: number;
  deliveredQuantity: number;
  cancelledQuantity: number;
  notes: string;
  kitchenStatus: KitchenStatus;
  station: KitchenStation;
  createdAt: string;
};

export type KitchenTicketView = {
  id: string; // accountId + "-" + round
  accountId: string;
  round: number;
  roomName: string;
  tableLabels: string[];
  customerName: string;
  reservationCode: string;
  openedAt: string;
  createdAt: string;
  allReady: boolean;
  lines: KitchenTicketLine[];
};

export type KitchenSnapshot = {
  restaurantName: string;
  timeZone: string;
  tickets: KitchenTicketView[];
};

export type ServiceCashReport = {
  today: string;
  from: string;
  to: string;
  receipts: ServiceAccountView[];
  totals: ServiceCashTotals;
  days: ServiceCashEventView[];
};

export type ServiceCommandResult = ServiceAccountView | ServiceProductView | ServiceCashEventView | StaffMemberView | { updated: boolean };
