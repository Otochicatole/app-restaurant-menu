"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  KeyRound,
  Layers3,
  MoreHorizontal,
  PauseCircle,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AdminConfirmModal, AdminModal } from "@/ui/admin/AdminUI";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import type { TenantManagerController } from "./use-tenant-manager";
import type { PendingTenantConfirmation, TenantRow } from "./tenant-manager.types";

type Props = { controller: TenantManagerController };

const fieldClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100";

function confirmationCopy(pending: PendingTenantConfirmation | null) {
  if (!pending) return null;
  if (pending.type === "toggle") {
    return pending.tenant.status === "ACTIVE"
      ? {
          title: `¿Suspender ${pending.tenant.name}?`,
          description: "La cuenta perderá el acceso al panel y su menú público dejará de estar disponible hasta que la reactives.",
          confirmLabel: "Suspender cuenta",
          loadingLabel: "Suspendiendo...",
          danger: true,
        }
      : {
          title: `¿Reactivar ${pending.tenant.name}?`,
          description: "La cuenta volverá a tener acceso al panel de administración.",
          confirmLabel: "Reactivar cuenta",
          loadingLabel: "Reactivando...",
          danger: false,
        };
  }
  if (pending.type === "multiMenu") {
    return pending.tenant.multiMenuEnabled
      ? {
          title: `¿Quitar varios menús a ${pending.tenant.name}?`,
          description: "La cuenta volverá a trabajar solo con el menú principal. Los menús extra se conservan.",
          confirmLabel: "Quitar varios menús",
          loadingLabel: "Actualizando...",
          danger: false,
        }
      : {
          title: `¿Habilitar varios menús para ${pending.tenant.name}?`,
          description: "La cuenta podrá crear lienzos adicionales con su propio slug público.",
          confirmLabel: "Habilitar",
          loadingLabel: "Actualizando...",
          danger: false,
        };
  }
  if (pending.type === "maxMenus") {
    return {
      title: `Cupo de menús · ${pending.tenant.name}`,
      description: "Si bajás el cupo por debajo de los menús actuales, elegí cuáles conservar; el resto se elimina.",
      confirmLabel: "Guardar cupo",
      loadingLabel: "Guardando...",
      danger: false,
    };
  }
  if (pending.type === "deleteMenus") {
    const count = pending.projectIds.length;
    return {
      title: count === 1 ? "¿Eliminar este menú?" : `¿Eliminar ${count} menús?`,
      description: "Se eliminarán de forma definitiva. Esta acción no se puede deshacer.",
      confirmLabel: count === 1 ? "Eliminar menú" : "Eliminar menús",
      loadingLabel: "Eliminando...",
      danger: true,
    };
  }
  if (pending.type === "reset") {
    return {
      title: `¿Restablecer la clave de ${pending.tenant.name}?`,
      description: "Se generará una nueva contraseña temporal y la actual dejará de funcionar.",
      confirmLabel: "Restablecer clave",
      loadingLabel: "Restableciendo...",
      danger: false,
    };
  }
  return {
    title: `¿Borrar ${pending.tenant.name}?`,
    description: "Se eliminará la cuenta, sus menús y archivos. No se puede deshacer.",
    confirmLabel: "Borrar cuenta",
    loadingLabel: "Borrando...",
    danger: true,
  };
}

function operationKey(pending: PendingTenantConfirmation | null): string | null {
  if (!pending) return null;
  return `${pending.type}:${pending.tenant.id}`;
}

export function TenantManagerScreen({ controller }: Props) {
  const copy = confirmationCopy(controller.pendingConfirmation);
  const pendingKey = operationKey(controller.pendingConfirmation);
  const pendingMaxMenus =
    controller.pendingConfirmation?.type === "maxMenus" ? Number(controller.maxMenusDraft) : null;
  const needsKeepSelection =
    controller.pendingConfirmation?.type === "maxMenus" &&
    Number.isInteger(pendingMaxMenus) &&
    (pendingMaxMenus ?? 0) >= 1 &&
    controller.pendingConfirmation.tenant.menus.length > (pendingMaxMenus ?? 0);

  return (
    <div className="space-y-6">
      {controller.notice && (
        <div role="alert" className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{controller.notice}</span>
          <button type="button" onClick={controller.dismissNotice} className="shrink-0 rounded-lg p-1 text-red-400 transition hover:bg-red-100 hover:text-red-700" aria-label="Cerrar aviso">
            <X size={16} />
          </button>
        </div>
      )}

      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Clientes</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">Cuentas</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-zinc-500">
            Accesos, estados y menús de cada restaurante.
          </p>
        </div>
        <button type="button" onClick={controller.openCreateModal} className={`${adminPrimaryButtonClass} shrink-0`}>
          <Plus size={16} />
          Nuevo cliente
        </button>
      </header>

      <section aria-label="Resumen" className="grid grid-cols-3 gap-3">
        <StatPill label="Total" value={controller.tenants.length} />
        <StatPill label="Activos" value={controller.activeCount} />
        <StatPill label="Suspendidos" value={controller.suspendedCount} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm focus-within:border-zinc-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-zinc-100">
            <Search size={16} className="shrink-0 text-zinc-400" />
            <label htmlFor="tenant-search" className="sr-only">Buscar clientes</label>
            <input
              id="tenant-search"
              type="search"
              value={controller.search}
              onChange={(event) => controller.setSearch(event.target.value)}
              placeholder="Buscar por nombre, email o slug"
              className="min-w-0 w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400"
            />
            {controller.search && (
              <button type="button" onClick={() => controller.setSearch("")} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Limpiar búsqueda">
                <X size={14} />
              </button>
            )}
          </div>
          <select
            value={controller.statusFilter}
            onChange={(event) => controller.setStatusFilter(event.target.value as typeof controller.statusFilter)}
            aria-label="Filtrar por estado"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-700 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
          >
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="SUSPENDED">Suspendidos</option>
          </select>
        </div>

        <div className="divide-y divide-zinc-100">
          {controller.filteredTenants.map((tenant) => (
            <TenantRow key={tenant.id} tenant={tenant} controller={controller} />
          ))}

          {controller.tenants.length === 0 && (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500">
                <Building2 size={22} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-zinc-950">Todavía no hay clientes</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-zinc-500">Creá la primera cuenta para empezar.</p>
              <button type="button" onClick={controller.openCreateModal} className={`${adminPrimaryButtonClass} mt-5`}>
                <Plus size={16} /> Nuevo cliente
              </button>
            </div>
          )}

          {controller.tenants.length > 0 && controller.filteredTenants.length === 0 && (
            <div className="px-6 py-14 text-center">
              <h3 className="text-base font-semibold text-zinc-950">Sin coincidencias</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500">Probá otro término o limpiá los filtros.</p>
              <button type="button" onClick={controller.clearFilters} className={`${adminSecondaryButtonClass} mt-5`}>
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </section>

      <CreateTenantModal controller={controller} />
      {controller.managingTenant && (
        <ManageTenantModal tenant={controller.managingTenant} controller={controller} />
      )}

      {copy && (
        <AdminConfirmModal
          open={Boolean(controller.pendingConfirmation)}
          title={copy.title}
          description={copy.description}
          onClose={controller.closeConfirmation}
          onConfirm={controller.confirmPendingAction}
          loading={pendingKey ? controller.isBusy(pendingKey) : false}
          confirmLabel={copy.confirmLabel}
          loadingLabel={copy.loadingLabel}
        >
          {controller.pendingConfirmation &&
            ((controller.pendingConfirmation.type === "multiMenu" && !controller.pendingConfirmation.tenant.multiMenuEnabled) ||
              controller.pendingConfirmation.type === "maxMenus") && (
              <label className="mb-4 grid gap-1.5 text-xs font-semibold text-zinc-600">
                Cantidad máxima de menús
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={controller.maxMenusDraft}
                  onChange={(event) => controller.setMaxMenusDraft(event.target.value)}
                  className={fieldClass}
                />
              </label>
            )}
          {needsKeepSelection && controller.pendingConfirmation?.type === "maxMenus" && (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-semibold text-zinc-600">
                Conservar {pendingMaxMenus} de {controller.pendingConfirmation.tenant.menus.length}
              </p>
              <ul className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                {controller.pendingConfirmation.tenant.menus.map((menu) => {
                  const checked = controller.keepMenuIds.includes(menu.id);
                  return (
                    <li key={menu.id}>
                      <label className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm ${checked ? "bg-white shadow-sm" : "hover:bg-white/70"}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => controller.toggleKeepMenu(menu.id, pendingMaxMenus ?? 1)}
                          className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-zinc-900">{menu.name}</span>
                          <span className="block truncate font-mono text-[11px] text-zinc-400">/m/{menu.slug}</span>
                        </span>
                        {menu.isPrimary && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Principal</span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="text-xs tabular-nums text-zinc-500">
                {controller.keepMenuIds.length}/{pendingMaxMenus} seleccionados
              </p>
            </div>
          )}
          {controller.confirmationError && (
            <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {controller.confirmationError}
            </p>
          )}
        </AdminConfirmModal>
      )}

      <TemporaryPasswordModal
        value={controller.temporaryPassword?.value ?? null}
        onClose={controller.dismissTemporaryPassword}
      />
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-zinc-950">{value}</p>
    </div>
  );
}

function TenantRow({ tenant, controller }: { tenant: TenantRow; controller: TenantManagerController }) {
  const isSuspended = tenant.status === "SUSPENDED";
  const isBusy = controller.isTenantBusy(tenant.id);
  const menuCount = tenant.menus.length;

  return (
    <div
      className={`flex flex-col gap-4 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between sm:px-5 ${isSuspended ? "bg-amber-50/50" : "hover:bg-zinc-50/80"}`}
      aria-busy={isBusy}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSuspended ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}>
          <Building2 size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-[15px] font-semibold text-zinc-950">{tenant.name}</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isSuspended ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
              {isSuspended ? "Suspendido" : "Activo"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-zinc-500">{tenant.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
            <Link href={`/m/${tenant.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-zinc-600 hover:text-zinc-900">
              <ExternalLink size={12} /> /m/{tenant.slug}
            </Link>
            <span className="inline-flex items-center gap-1">
              <Layers3 size={12} />
              {menuCount} {menuCount === 1 ? "menú" : "menús"}
              {tenant.multiMenuEnabled ? ` · cupo ${tenant.maxMenus}` : ""}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={isBusy}
        onClick={() => controller.openManageTenant(tenant)}
        className={`${adminSecondaryButtonClass} shrink-0`}
      >
        <MoreHorizontal size={15} />
        Gestionar
      </button>
    </div>
  );
}

function CreateTenantModal({ controller }: Props) {
  const busy = controller.isBusy("create");
  return (
    <AdminModal
      open={controller.showCreateModal}
      title="Nuevo cliente"
      description="Generá una cuenta y obtené una contraseña temporal."
      onClose={busy ? () => undefined : controller.closeCreateModal}
    >
      <form
        action={async (formData) => {
          await controller.submitCreate(formData);
        }}
        className="grid gap-4"
      >
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
          Nombre del negocio
          <input name="name" required maxLength={100} placeholder="Café Central" className={fieldClass} />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
          Correo de acceso
          <input name="email" type="email" required placeholder="hola@negocio.com" className={fieldClass} />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
          Slug público
          <input name="slug" required minLength={3} maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="cafe-central" className={fieldClass} />
        </label>
        <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={controller.closeCreateModal} className={adminSecondaryButtonClass}>
            Cancelar
          </button>
          <button type="submit" disabled={busy} className={adminPrimaryButtonClass}>
            {busy ? "Creando..." : "Crear cuenta"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function ManageTenantModal({ tenant, controller }: { tenant: TenantRow; controller: TenantManagerController }) {
  const isBusy = controller.isTenantBusy(tenant.id);
  const updateBusy = controller.isBusy(`update:${tenant.id}`);
  const isSuspended = tenant.status === "SUSPENDED";

  return (
    <AdminModal
      open
      wide
      title={tenant.name}
      description={tenant.email}
      onClose={controller.pendingConfirmation ? () => undefined : controller.closeManageTenant}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${isSuspended ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-800"}`}>
            {isSuspended ? <PauseCircle size={12} /> : <CheckCircle2 size={12} />}
            {isSuspended ? "Suspendido" : "Activo"}
          </span>
          {tenant.multiMenuEnabled ? (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-600">
              Hasta {tenant.maxMenus} menús
            </span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500">
              Un solo menú
            </span>
          )}
          <Link
            href={`/m/${tenant.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900"
          >
            <ExternalLink size={12} /> /m/{tenant.slug}
          </Link>
          <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
            <Clock3 size={12} />
            {tenant.lastLoginAt ? new Date(tenant.lastLoginAt).toLocaleString("es-AR") : "Sin accesos"}
          </span>
        </div>

        <section className="rounded-2xl border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold text-zinc-950">Datos de la cuenta</h3>
          <form
            action={async (formData) => {
              await controller.submitUpdate(tenant.id, formData);
            }}
            className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <input type="hidden" name="id" value={tenant.id} />
            <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
              Nombre
              <input name="name" required maxLength={100} defaultValue={tenant.name} className={fieldClass} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
              Correo
              <input name="email" type="email" required defaultValue={tenant.email} className={fieldClass} />
            </label>
            <button type="submit" disabled={isBusy} className={adminSecondaryButtonClass}>
              {updateBusy ? "Guardando..." : "Guardar"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Menús</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                {tenant.menus.length} {tenant.menus.length === 1 ? "menú" : "menús"}
                {tenant.multiMenuEnabled ? ` · cupo ${tenant.maxMenus}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => controller.requestConfirmation({ type: "multiMenu", tenant })}
                className={adminSecondaryButtonClass}
              >
                {tenant.multiMenuEnabled ? "Quitar varios" : "Varios menús"}
              </button>
              {tenant.multiMenuEnabled && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => controller.requestConfirmation({ type: "maxMenus", tenant })}
                  className={adminSecondaryButtonClass}
                >
                  Cupo
                </button>
              )}
            </div>
          </div>

          {tenant.menus.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-400">
              Sin menús. Se creará uno vacío cuando el cliente entre al panel.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
              {tenant.menus.map((menu) => (
                <li key={menu.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-950">{menu.name}</p>
                      {menu.isPrimary && (
                        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Principal
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/m/${menu.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-block truncate font-mono text-xs text-zinc-500 hover:text-zinc-800"
                    >
                      /m/{menu.slug}
                    </Link>
                  </div>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => controller.requestConfirmation({ type: "deleteMenus", tenant, projectIds: [menu.id] })}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold text-zinc-950">Acceso</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => controller.requestConfirmation({ type: "toggle", tenant })}
              className={adminSecondaryButtonClass}
            >
              {isSuspended ? "Reactivar" : "Suspender"}
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => controller.requestConfirmation({ type: "reset", tenant })}
              className={adminSecondaryButtonClass}
            >
              <KeyRound size={14} />
              Restablecer clave
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => controller.requestConfirmation({ type: "delete", tenant })}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={14} />
              Borrar cuenta
            </button>
          </div>
        </section>
      </div>
    </AdminModal>
  );
}

function TemporaryPasswordModal({ value, onClose }: { value: string | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyPassword = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <AdminModal
      open={Boolean(value)}
      title="Contraseña temporal"
      description="Guardala ahora. No se vuelve a mostrar."
      onClose={() => {
        setCopied(false);
        onClose();
      }}
    >
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2 text-amber-900">
          <KeyRound size={16} className="shrink-0 text-amber-700" />
          <p className="text-sm font-semibold">Clave generada</p>
        </div>
        <div className="mt-3 flex items-stretch gap-2">
          <code className="block min-w-0 flex-1 select-all overflow-x-auto rounded-xl bg-white px-3 py-3 font-mono text-base tracking-wide text-zinc-950">
            {value}
          </code>
          <button
            type="button"
            onClick={() => void copyPassword()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setCopied(false);
            onClose();
          }}
          className={adminPrimaryButtonClass}
        >
          Entendido
        </button>
      </div>
    </AdminModal>
  );
}
