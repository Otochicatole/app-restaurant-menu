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
  ): Promise<boolean> => {
    setBusy(operationKey, true);
    setNotice(null);

    try {
      const result = await action(formData);
      if (!result.success) {
        setNotice(result.error.message || "No se pudo completar la operación");
        return false;
      }

      if (result.data.temporaryPassword) {
        setTemporaryPassword({ value: result.data.temporaryPassword, tenantId });
      }
      router.refresh();
      return true;
    } catch {
      setNotice("No pudimos comunicarnos con el servidor. Revisá tu conexión e intentá nuevamente.");
      return false;
    } finally {
      setBusy(operationKey, false);
    }
  }, [router, setBusy]);

  const submitCreate = useCallback(
    (formData: FormData) => run("create", createTenant, formData),
    [createTenant, run],
  );

  const submitUpdate = useCallback(
    (tenantId: string, formData: FormData) => run(`update:${tenantId}`, updateTenant, formData),
    [run, updateTenant],
  );

  const confirmPendingAction = useCallback(async () => {
    if (!pendingConfirmation) return;
    const { type, tenant } = pendingConfirmation;
    const formData = new FormData();
    formData.set("id", tenant.id);

    let success = false;
    if (type === "toggle") {
      formData.set("status", tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
      success = await run(`toggle:${tenant.id}`, toggleTenant, formData);
    } else if (type === "reset") {
      success = await run(`reset:${tenant.id}`, resetPassword, formData, tenant.id);
    } else {
      formData.set("slug", tenant.slug);
      success = await run(`delete:${tenant.id}`, deleteTenant, formData);
    }

    if (success) setPendingConfirmation(null);
  }, [deleteTenant, pendingConfirmation, resetPassword, run, toggleTenant]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("ALL");
  }, []);

  const isBusy = useCallback((key: string) => busyKeys.has(key), [busyKeys]);
  const isTenantBusy = useCallback(
    (tenantId: string) => ["update", "toggle", "reset", "delete"].some((operation) => busyKeys.has(`${operation}:${tenantId}`)),
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
    requestConfirmation: setPendingConfirmation,
    closeConfirmation: () => setPendingConfirmation(null),
    confirmPendingAction,
    submitCreate,
    submitUpdate,
    isBusy,
    isTenantBusy,
  };
}

export type TenantManagerController = ReturnType<typeof useTenantManager>;
