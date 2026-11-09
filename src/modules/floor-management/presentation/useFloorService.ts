"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ServiceAccountView, ServiceCommand, ServiceSnapshot } from "@/modules/reservation-management/contracts";

export type FloorServiceCommand = Extract<ServiceCommand, { action: "open" | "add-line" | "update-line" | "checkout" | "close-empty" }>;

async function serviceRequest<T>(restaurantId: string, { at, signal, command }: { at?: string; signal?: AbortSignal; command?: FloorServiceCommand }): Promise<T> {
  const params = at ? `?${new URLSearchParams({ at })}` : "";
  const response = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/service${params}`, {
    cache: "no-store", credentials: "same-origin", signal,
    ...(command ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "No se pudo consultar el servicio. Volvé a intentar.");
  return payload.data as T;
}

type ServiceResult = { key: string; snapshot: ServiceSnapshot | null; error: string | null };

export function useFloorService(restaurantId: string, active: boolean, at?: string) {
  const key = `${restaurantId}:${at ?? "live"}`;
  const [result, setResult] = useState<ServiceResult | null>(null);
  const [busy, setBusy] = useState(false);
  const read = useRef<AbortController | null>(null);
  const writing = useRef(false);

  const refresh = useCallback(async () => {
    if (!active || writing.current) return;
    read.current?.abort();
    const controller = new AbortController();
    read.current = controller;
    try {
      const snapshot = await serviceRequest<ServiceSnapshot>(restaurantId, { at, signal: controller.signal });
      if (!controller.signal.aborted) setResult({ key, snapshot, error: null });
    } catch (error) {
      if (!controller.signal.aborted) setResult((current) => ({
        key, snapshot: current?.key === key ? current.snapshot : null,
        error: error instanceof Error ? error.message : "No se pudo actualizar el servicio.",
      }));
    } finally {
      if (read.current === controller) read.current = null;
    }
  }, [active, at, key, restaurantId]);

  useEffect(() => {
    if (!active) return;
    const whenVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    const interval = at ? undefined : window.setInterval(whenVisible, 15_000);
    window.addEventListener("focus", whenVisible);
    document.addEventListener("visibilitychange", whenVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", whenVisible);
      document.removeEventListener("visibilitychange", whenVisible);
      read.current?.abort();
    };
  }, [active, at, refresh]);

  const mutate = async (command: FloorServiceCommand): Promise<ServiceAccountView> => {
    if (at || writing.current) throw new Error("Esperá a que termine la operación actual y volvé a intentar.");
    read.current?.abort();
    writing.current = true;
    setBusy(true);
    let failed = false;
    try {
      const account = await serviceRequest<ServiceAccountView>(restaurantId, { command });
      setResult((current) => {
        if (current?.key !== key || !current.snapshot) return current;
        const accounts = current.snapshot.accounts.filter(({ id }) => id !== account.id);
        const unserved = command.action === "close-empty" ? current.snapshot.unserved.filter((group) => group.allocationId !== command.allocationId || group.tableId !== command.tableId) : current.snapshot.unserved;
        return { key, snapshot: { ...current.snapshot, accounts: [account, ...accounts], unserved }, error: null };
      });
      return account;
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      writing.current = false;
      setBusy(false);
      if (failed || command.action === "checkout" || command.action === "close-empty") void refresh();
    }
  };

  const current = result?.key === key ? result : null;
  return { snapshot: current?.snapshot ?? null, error: current?.error ?? null, busy, refresh, mutate };
}
