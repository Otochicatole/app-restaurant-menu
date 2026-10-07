"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { filterTenantRows, type TenantStatusFilter } from "./tenant-filter";
import type {
  PendingTenantConfirmation,
  TenantFormAction,
  TenantManagerProps,
} from "./tenant-manager.types";

type TemporaryPassword = { value: string; tenantId?: string };

export function useTenantManager({
  tenants,
  createTenant,
  updateTenant,
  toggleTenant,
  toggleMultiMenu,
  setMaxMenus,
  resetPassword,
  deleteTenant,
}: TenantManagerProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<TemporaryPassword | null>(null);
  const [busyKeys, setBusyKeys] = useState<ReadonlySet<string>>(() => new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenantStatusFilter>("ALL");
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingTenantConfirmation | null>(null);
  const [maxMenusDraft, setMaxMenusDraft] = useState("1");
  const [confirmationError, setConfirmationError] = useState<string | null>(null);

  const filteredTenants = useMemo(
    () => filterTenantRows(tenants, search, statusFilter),
    [search, statusFilter, tenants],
  );

  const setBusy = useCallback((key: string, busy: boolean) => {
    setBusyKeys((current) => {
      const next = new Set(current);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const run = useCallback(async (
    operationKey: string,
    action: TenantFormAction,
    formData: FormData,
    tenantId?: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> => {
    setBusy(operationKey, true);
    setNotice(null);

    try {
      const result = await action(formData);
      if (!result.success) {
        const message = result.error.message || "No se pudo completar la operación";
        setNotice(message);
        return { ok: false, message };
      }

      if (result.data.temporaryPassword) {
        setTemporaryPassword({ value: result.data.temporaryPassword, tenantId });
      }
      router.refresh();
      return { ok: true };
    } catch {
      const message = "No pudimos comunicarnos con el servidor. Revisá tu conexión e intentá nuevamente.";
      setNotice(message);
      return { ok: false, message };
    } finally {
      setBusy(operationKey, false);
    }
  }, [router, setBusy]);

  const submitCreate = useCallback(
    async (formData: FormData) => {
      await run("create", createTenant, formData);
    },
    [createTenant, run],
  );

  const submitUpdate = useCallback(
    async (tenantId: string, formData: FormData) => {
      await run(`update:${tenantId}`, updateTenant, formData);
    },
    [run, updateTenant],
  );

  const requestConfirmation = useCallback((pending: PendingTenantConfirmation) => {
    setConfirmationError(null);
    if (pending.type === "multiMenu" && !pending.tenant.multiMenuEnabled) {
      setMaxMenusDraft(String(Math.max(1, pending.tenant.maxMenus || 1)));
    }
    if (pending.type === "maxMenus") {
      setMaxMenusDraft(String(Math.max(1, pending.tenant.maxMenus || 1)));
    }
    setPendingConfirmation(pending);
  }, []);

  const confirmPendingAction = useCallback(async () => {
    if (!pendingConfirmation) return;
    const { type, tenant } = pendingConfirmation;
    const formData = new FormData();
    formData.set("id", tenant.id);
    setConfirmationError(null);

    if ((type === "multiMenu" && !tenant.multiMenuEnabled) || type === "maxMenus") {
      const parsed = Number(maxMenusDraft);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
        setConfirmationError("Indicá un cupo entero entre 1 y 50.");
        return;
      }
      formData.set("maxMenus", String(parsed));
    }

    let outcome: { ok: true } | { ok: false; message: string };
    if (type === "toggle") {
      formData.set("status", tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
      outcome = await run(`toggle:${tenant.id}`, toggleTenant, formData);
    } else if (type === "multiMenu") {
      const enabling = !tenant.multiMenuEnabled;
      formData.set("multiMenuEnabled", enabling ? "true" : "false");
      outcome = await run(`multiMenu:${tenant.id}`, toggleMultiMenu, formData);
    } else if (type === "maxMenus") {
      outcome = await run(`maxMenus:${tenant.id}`, setMaxMenus, formData);
    } else if (type === "reset") {
      outcome = await run(`reset:${tenant.id}`, resetPassword, formData, tenant.id);
    } else {
      formData.set("slug", tenant.slug);
      outcome = await run(`delete:${tenant.id}`, deleteTenant, formData);
    }

    if (outcome.ok) {
      setPendingConfirmation(null);
      setConfirmationError(null);
    } else {
      setConfirmationError(outcome.message);
    }
  }, [deleteTenant, maxMenusDraft, pendingConfirmation, resetPassword, run, setMaxMenus, toggleMultiMenu, toggleTenant]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("ALL");
  }, []);

  const isBusy = useCallback((key: string) => busyKeys.has(key), [busyKeys]);
  const isTenantBusy = useCallback(
    (tenantId: string) => ["update", "toggle", "multiMenu", "maxMenus", "reset", "delete"].some((operation) => busyKeys.has(`${operation}:${tenantId}`)),
    [busyKeys],
  );

  return {
    tenants,
    filteredTenants,
    activeCount: tenants.filter((tenant) => tenant.status === "ACTIVE").length,
    suspendedCount: tenants.filter((tenant) => tenant.status === "SUSPENDED").length,
    notice,
    dismissNotice: () => setNotice(null),
    temporaryPassword,
    dismissTemporaryPassword: () => setTemporaryPassword(null),
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    clearFilters,
    hasActiveFilters: Boolean(search.trim()) || statusFilter !== "ALL",
    pendingConfirmation,
    requestConfirmation,
    closeConfirmation: () => {
      setPendingConfirmation(null);
      setConfirmationError(null);
    },
    confirmPendingAction,
    maxMenusDraft,
    setMaxMenusDraft,
    confirmationError,
    submitCreate,
    submitUpdate,
    isBusy,
    isTenantBusy,
  };
}

export type TenantManagerController = ReturnType<typeof useTenantManager>;
