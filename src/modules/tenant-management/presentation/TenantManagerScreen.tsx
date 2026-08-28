"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  KeyRound,
  Mail,
  Search,
  X,
} from "lucide-react";
import { AdminConfirmModal } from "@/ui/admin/AdminUI";
import type { TenantManagerController } from "./use-tenant-manager";
import type { PendingTenantConfirmation, TenantRow } from "./tenant-manager.types";

type Props = { controller: TenantManagerController };

function confirmationCopy(pending: PendingTenantConfirmation | null) {
  if (!pending) return null;
  if (pending.type === "toggle") {
    return pending.tenant.status === "ACTIVE"
      ? {
          title: `¿Suspender ${pending.tenant.name}?`,
          description: "La cuenta perderá el acceso al panel y su menú público dejará de estar disponible hasta que la reactives. Sus datos se conservarán.",
          confirmLabel: "Suspender cuenta",
          loadingLabel: "Suspendiendo...",
        }
      : {
          title: `¿Reactivar ${pending.tenant.name}?`,
          description: "La cuenta volverá a tener acceso al panel de administración.",
          confirmLabel: "Reactivar cuenta",
          loadingLabel: "Reactivando...",
        };
  }
  if (pending.type === "reset") {
    return {
      title: `¿Restablecer la clave de ${pending.tenant.name}?`,
      description: "Se generará una nueva contraseña temporal y la contraseña actual dejará de funcionar.",
      confirmLabel: "Restablecer clave",
      loadingLabel: "Restableciendo...",
    };
  }
  return {
    title: `¿Borrar ${pending.tenant.name}?`,
    description: "Esta acción eliminará definitivamente la cuenta, su menú y sus archivos. No se puede deshacer.",
    confirmLabel: "Borrar cuenta",
    loadingLabel: "Borrando...",
  };
}

function operationKey(pending: PendingTenantConfirmation | null): string | null {
  if (!pending) return null;
  return `${pending.type}:${pending.tenant.id}`;
}

export function TenantManagerScreen({ controller }: Props) {
  const copy = confirmationCopy(controller.pendingConfirmation);
  const pendingKey = operationKey(controller.pendingConfirmation);
  const clientLabel = controller.tenants.length === 1 ? "cliente" : "clientes";

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

      {controller.temporaryPassword && !controller.temporaryPassword.tenantId && (
        <TemporaryPasswordNotice value={controller.temporaryPassword.value} onClose={controller.dismissTemporaryPassword} />
      )}

      <CreateTenantPanel controller={controller} />

      <section aria-label="Resumen de clientes" className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Clientes totales", value: controller.tenants.length, detail: "Cuentas registradas", icon: Building2, color: "bg-emerald-100 text-emerald-800" },
          { label: "Activos", value: controller.activeCount, detail: "Con acceso habilitado", icon: CheckCircle2, color: "bg-sky-100 text-sky-800" },
          { label: "Suspendidos", value: controller.suspendedCount, detail: "Revisá su estado de acceso", icon: KeyRound, color: "bg-amber-100 text-amber-800" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.color}`}><Icon size={17} /></span>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">{stat.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{stat.detail}</p>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <TenantListHeader controller={controller} clientLabel={clientLabel} />
        <div className="divide-y divide-zinc-100">
          {controller.filteredTenants.map((tenant) => (
            <TenantRowCard key={tenant.id} tenant={tenant} controller={controller} />
          ))}

          {controller.tenants.length === 0 && (
            <EmptyTenants />
          )}

          {controller.tenants.length > 0 && controller.filteredTenants.length === 0 && (
            <div className="px-6 py-14 text-center sm:px-8">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500"><Search size={21} /></span>
              <h3 className="mt-4 text-base font-semibold text-zinc-950">No encontramos coincidencias</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-zinc-500">Probá con otro término o quitá los filtros para ver todos los clientes.</p>
              <button type="button" onClick={controller.clearFilters} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900"><X size={16} /> Limpiar filtros</button>
            </div>
          )}
        </div>
      </section>

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
        />
      )}
    </div>
  );
}

function CreateTenantPanel({ controller }: Props) {
  const busy = controller.isBusy("create");
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm" aria-busy={busy}>
      <div className="flex flex-col gap-4 border-b border-zinc-100 px-6 py-5 sm:flex-row sm:items-start sm:px-8">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><Building2 size={20} /></span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Alta de cliente</p>
          <h2 className="mt-1 text-xl font-semibold text-zinc-950">Crear una cuenta</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Generá un acceso para un nuevo negocio y obtené su contraseña temporal.</p>
        </div>
      </div>
      <form action={async (formData) => { await controller.submitCreate(formData); }} className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-[1.2fr_1.2fr_0.8fr_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
          Nombre del negocio
          <input name="name" required maxLength={100} placeholder="Café Central" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
          Correo de acceso
          <input name="email" type="email" required placeholder="hola@negocio.com" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
          Slug público
          <input name="slug" required minLength={3} maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="cafe-central" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
        </label>
        <button type="submit" disabled={busy} className="inline-flex h-[42px] items-center justify-center rounded-xl bg-emerald-950 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Creando..." : "Crear cuenta"}
        </button>
      </form>
    </section>
  );
}

function TenantListHeader({ controller, clientLabel }: Props & { clientLabel: string }) {
  return (
    <div className="border-b border-zinc-100 px-6 py-6 sm:px-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Clientes</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Menús administrados</h2>
          <p className="mt-1 text-sm text-zinc-500">Gestioná accesos, estados y enlaces públicos desde un solo lugar.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100 sm:min-w-80">
            <Search size={17} className="shrink-0 text-zinc-400" />
            <label htmlFor="tenant-search" className="sr-only">Buscar clientes</label>
            <input id="tenant-search" type="search" value={controller.search} onChange={(event) => controller.setSearch(event.target.value)} placeholder="Buscar por nombre, email o slug" className="min-w-0 w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400" />
            {controller.search && <button type="button" onClick={() => controller.setSearch("")} className="shrink-0 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="Limpiar búsqueda"><X size={15} /></button>}
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
            <Filter size={16} className="shrink-0 text-zinc-400" />
            <span className="sr-only">Filtrar por estado</span>
            <select value={controller.statusFilter} onChange={(event) => controller.setStatusFilter(event.target.value as typeof controller.statusFilter)} aria-label="Filtrar por estado" className="bg-transparent font-medium text-zinc-700 outline-none">
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="SUSPENDED">Suspendidos</option>
            </select>
          </label>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p role="status" aria-live="polite" className="text-zinc-500">
          {controller.hasActiveFilters ? `${controller.filteredTenants.length} de ${controller.tenants.length} ${clientLabel}` : `${controller.tenants.length} ${clientLabel} registrados`}
        </p>
        {controller.hasActiveFilters && <button type="button" onClick={controller.clearFilters} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800 transition hover:bg-emerald-50"><X size={14} /> Limpiar filtros</button>}
      </div>
    </div>
  );
}

function TenantRowCard({ tenant, controller }: { tenant: TenantRow; controller: TenantManagerController }) {
  const isSuspended = tenant.status === "SUSPENDED";
  const isBusy = controller.isTenantBusy(tenant.id);
  const updateBusy = controller.isBusy(`update:${tenant.id}`);

  return (
    <div className={`grid gap-5 px-6 py-6 transition sm:px-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] lg:items-start ${isSuspended ? "border-l-4 border-l-amber-400 bg-amber-50/70 hover:bg-amber-50" : "hover:bg-emerald-50/20"}`} aria-busy={isBusy}>
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSuspended ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}><Building2 size={18} /></span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-zinc-950">{tenant.name}</p>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-sm text-zinc-500"><Mail size={14} className="shrink-0 text-zinc-400" /> {tenant.email}</p>
          </div>
        </div>
        <form action={async (formData) => { await controller.submitUpdate(tenant.id, formData); }} className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto]">
          <input type="hidden" name="id" value={tenant.id} />
          <input name="name" required maxLength={100} defaultValue={tenant.name} aria-label={`Nombre de ${tenant.name}`} className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-xs text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
          <input name="email" type="email" required defaultValue={tenant.email} aria-label={`Correo de ${tenant.name}`} className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-xs text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
          <button type="submit" disabled={isBusy} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{updateBusy ? "Guardando..." : "Guardar"}</button>
        </form>
      </div>

      <div className="min-w-0 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">Menú público</p>
        <Link href={`/m/${tenant.slug}`} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 truncate text-sm font-semibold text-emerald-700 hover:underline"><ExternalLink size={15} className="shrink-0" /> <span className="truncate">/m/{tenant.slug}</span></Link>
        <p className="flex items-center gap-1.5 text-xs text-zinc-400"><Clock3 size={14} /> {tenant.lastLoginAt ? `Último acceso: ${new Date(tenant.lastLoginAt).toLocaleString("es-AR")}` : "Sin accesos todavía"}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isSuspended ? "bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300" : "bg-emerald-100 text-emerald-800"}`}><span className={`h-1.5 w-1.5 rounded-full ${isSuspended ? "bg-amber-600" : "bg-emerald-600"}`} />{isSuspended ? "Suspendido" : "Activo"}</span>
          {isSuspended && <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800"><AlertTriangle size={14} /> Acceso bloqueado</span>}
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button type="button" disabled={isBusy} onClick={() => controller.requestConfirmation({ type: "toggle", tenant })} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{isSuspended ? "Reactivar" : "Suspender"}</button>
          <button type="button" disabled={isBusy} onClick={() => controller.requestConfirmation({ type: "reset", tenant })} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50">Restablecer clave</button>
          <button type="button" disabled={isBusy} onClick={() => controller.requestConfirmation({ type: "delete", tenant })} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Borrar</button>
        </div>
      </div>

      {controller.temporaryPassword?.tenantId === tenant.id && (
        <div className="lg:col-span-3">
          <TemporaryPasswordNotice value={controller.temporaryPassword.value} onClose={controller.dismissTemporaryPassword} />
        </div>
      )}
    </div>
  );
}

function TemporaryPasswordNotice({ value, onClose }: { value: string; onClose: () => void }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2"><KeyRound size={16} className="text-amber-700" /><p className="font-bold">Contraseña temporal (guardala ahora)</p></div>
        <code className="mt-3 block overflow-x-auto rounded-lg bg-white px-3 py-2 text-base">{value}</code>
      </div>
      <button type="button" onClick={onClose} className="self-start rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-amber-800 transition hover:bg-amber-100 sm:self-center">Cerrar</button>
    </div>
  );
}

function EmptyTenants() {
  return (
    <div className="px-6 py-14 text-center sm:px-8">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><Building2 size={21} /></span>
      <h3 className="mt-4 text-base font-semibold text-zinc-950">Todavía no hay clientes</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-zinc-500">Creá la primera cuenta desde el formulario superior para comenzar.</p>
    </div>
  );
}
