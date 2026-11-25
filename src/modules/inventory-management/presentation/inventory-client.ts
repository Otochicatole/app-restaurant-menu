import type { InventoryCommand, InventorySnapshot, StockWarningView } from "../contracts";

export type InventoryCommandResponse = {
  snapshot: InventorySnapshot;
  warnings: StockWarningView[];
};

const moneyFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export function formatInventoryMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

export function parseInventoryMoneyCents(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 2_147_483_647) return null;
  return cents;
}

export function parseInventoryDecimal(raw: string, allowNegative = false): number | null {
  const normalized = raw.trim().replace(",", ".");
  const pattern = allowNegative ? /^-?\d+(?:\.\d{1,3})?$/ : /^\d+(?:\.\d{1,3})?$/;
  if (!pattern.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function inventoryUrl(restaurantId: string): string {
  return `/api/restaurants/${encodeURIComponent(restaurantId)}/inventory`;
}

export async function fetchInventorySnapshot(restaurantId: string): Promise<InventorySnapshot> {
  const response = await fetch(inventoryUrl(restaurantId), { cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? "No se pudo cargar el módulo de inventario.");
  }
  return payload.data as InventorySnapshot;
}

export async function sendInventoryCommand(
  restaurantId: string,
  command: InventoryCommand,
): Promise<InventoryCommandResponse> {
  const response = await fetch(inventoryUrl(restaurantId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error?.message ?? "No se pudo guardar la operación de inventario.");
  }
  return payload.data as InventoryCommandResponse;
}
