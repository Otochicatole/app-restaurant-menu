import { useEffect, useState } from "react";
import type { ServiceCommand, ServiceCommandResult } from "../contracts";

export function serviceAdminUrl(restaurantId: string, query?: Record<string, string>) {
  const path = `/api/restaurants/${encodeURIComponent(restaurantId)}/service`;
  return query ? `${path}?${new URLSearchParams(query)}` : path;
}

export async function requestServiceAdmin<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const payload = await response.json().catch(() => null) as
    | { success: true; data: T }
    | { success: false; error: { message: string } }
    | null;
  if (payload?.success === false) throw new Error(payload.error.message);
  if (!response.ok || !payload?.success) throw new Error("No se pudo completar la operación. Volvé a intentar.");
  return payload.data;
}

export function sendServiceAdmin(restaurantId: string, command: ServiceCommand) {
  return requestServiceAdmin<ServiceCommandResult>(serviceAdminUrl(restaurantId), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command),
  });
}

type QueryState<T> = { key: string } & ({ data: T; error?: never } | { data?: never; error: string });

export function useServiceAdminQuery<T>(url: string) {
  const [attempt, setAttempt] = useState(0);
  const key = `${attempt}:${url}`;
  const [state, setState] = useState<QueryState<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    requestServiceAdmin<T>(url, { signal: controller.signal }).then(
      (data) => { if (!controller.signal.aborted) setState({ key, data }); },
      (error: unknown) => { if (!controller.signal.aborted) setState({ key, error: serviceAdminError(error) }); },
    );
    return () => controller.abort();
  }, [key, url]);

  return { result: state?.key === key ? state : null, refresh: () => setAttempt((value) => value + 1) };
}

export function serviceAdminError(error: unknown) {
  if (error instanceof TypeError) return "No se pudo conectar con Caja. Volvé a intentar.";
  return error instanceof Error ? error.message : "No se pudo completar la operación. Volvé a intentar.";
}

const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });

export const servicePaymentLabels = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER_QR: "Transferencia / QR" } as const;

export function formatServiceDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export function formatServiceMoney(cents: number) {
  return ars.format(cents / 100);
}

export function parseServicePrice(text: string) {
  const match = /^(\d+)(?:[,.](\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 2_147_483_647 ? cents : null;
}
