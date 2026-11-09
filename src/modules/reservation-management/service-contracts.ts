import { z } from "zod";

export const servicePaymentMethodSchema = z.enum(["CASH", "CARD", "TRANSFER_QR"]);
export type ServicePaymentMethod = z.infer<typeof servicePaymentMethodSchema>;

const id = z.string().min(1).max(128);
const revision = z.number().int().nonnegative();
const name = z.string().trim().min(1).max(120);
const unitPriceCents = z.number().int().min(1).max(2_147_483_647);
const date = z.iso.date();

export const serviceCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("open"), allocationId: id, tableId: id, expectedAllocationVersion: revision }),
  z.object({ action: z.literal("close-empty"), allocationId: id, tableId: id, expectedAllocationVersion: revision }),
  z.object({
    action: z.literal("add-line"), accountId: id, expectedVersion: revision, quantity: z.number().int().min(1).max(99),
    productId: id.optional(), name: name.optional(), unitPriceCents: unitPriceCents.optional(),
  }).refine((command) => command.productId !== undefined
    ? command.name === undefined && command.unitPriceCents === undefined
    : command.name !== undefined && command.unitPriceCents !== undefined, "Elegí un producto o ingresá nombre y precio."),
  z.object({ action: z.literal("update-line"), accountId: id, expectedVersion: revision, lineId: id,
    deliveredQuantity: z.number().int().min(0).max(99), cancelledQuantity: z.number().int().min(0).max(99),
  }),
  z.object({ action: z.literal("checkout"), accountId: id, expectedVersion: revision, paymentMethod: servicePaymentMethodSchema.optional() }),
  z.object({ action: z.literal("save-product"), id: id.optional(), name, unitPriceCents }),
  z.object({ action: z.literal("archive-product"), id }),
  z.object({ action: z.literal("close-day"), date }),
  z.object({ action: z.literal("reopen-day"), date, reason: z.string().trim().min(1).max(500) }),
]);

export const serviceCashRangeSchema = z.object({ from: date, to: date })
  .refine(({ from, to }) => from <= to, "El inicio del período debe ser anterior o igual al fin.");

export type ServiceCommand = z.infer<typeof serviceCommandSchema>;
export type ServiceProductView = { id: string; name: string; unitPriceCents: number; active: boolean };
export type ServiceOrderLineView = {
  id: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  deliveredQuantity: number;
  cancelledQuantity: number;
};
export type ServiceAccountView = {
  id: string;
  allocationId: string;
  reservationId: string;
  roomId: string;
  roomName: string;
  reservationCode: string;
  customerName: string;
  version: number;
  openedAt: string;
  closedAt: string | null;
  businessDate: string | null;
  paymentMethod: ServicePaymentMethod | null;
  totalCents: number | null;
  receiptNumber: string | null;
  tableIds: string[];
  tableLabels: string[];
  lines: ServiceOrderLineView[];
  orderedCents: number;
  deliveredCents: number;
  pendingQuantity: number;
};
export type ServiceCashTotals = {
  cashCents: number;
  cardCents: number;
  transferCents: number;
  receiptCount: number;
  totalCents: number;
};
export type ServiceCashEventView = Omit<ServiceCashTotals, "totalCents"> & {
  id: string;
  restaurantId: string;
  businessDate: string;
  revision: number;
  kind: "CLOSE" | "REOPEN";
  actorId: string;
  reason: string | null;
  createdAt: string;
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
export type ServiceSnapshot = { accounts: ServiceAccountView[]; products: ServiceProductView[]; cashClosed: boolean; unserved: ServiceUnservedGroup[] };
export type ServiceCashReport = {
  today: string;
  from: string;
  to: string;
  receipts: ServiceAccountView[];
  totals: ServiceCashTotals;
  days: ServiceCashEventView[];
};
export type ServiceCommandResult = ServiceAccountView | ServiceProductView | ServiceCashEventView;
