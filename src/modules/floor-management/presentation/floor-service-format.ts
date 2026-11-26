import type {
  KitchenStation,
  KitchenStatus,
  ServicePaymentMethod,
  ServiceSplitMode,
} from "@/modules/reservation-management/contracts";

export type DraftOrderItem = {
  key: string;
  productId?: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  notes: string;
  station: KitchenStation;
};

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export const amount = (cents: number) => money.format(cents / 100);
export const formatEditableDecimal = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
export const quantityLabel = (quantity: number, label: string) => `${quantity} ${label}${quantity === 1 ? "" : "s"}`;

export function parsePrice(value: string) {
  const match = /^(\d+)(?:[,.](\d{1,2}))?$/.exec(value.trim());
  if (!match) return 0;
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

export const paymentLabels: Record<ServicePaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER_QR: "Transferencia o QR",
  SPLIT: "Pago Dividido / Mixto",
};

export const splitModeLabels: Record<ServiceSplitMode, string> = {
  FULL: "Cuenta completa",
  BY_ITEMS: "Por productos",
  BY_PEOPLE: "Por personas",
  CUSTOM_AMOUNT: "Monto parcial",
};

export const kitchenStatusBadge: Record<KitchenStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendiente", className: "bg-zinc-100 text-zinc-700" },
  IN_PREP: { label: "En preparación", className: "bg-amber-100 text-amber-900 font-semibold animate-pulse" },
  READY: { label: "¡Listo para servir!", className: "bg-emerald-100 text-emerald-800 font-bold" },
  SERVED: { label: "Entregado", className: "bg-zinc-100 text-zinc-600" },
  CANCELLED: { label: "Anulado", className: "bg-zinc-100 text-zinc-500" },
};
