"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { AdminConfirmModal } from "@/shared/frontend/components/admin/AdminUI";
import { filterTenantRows, type TenantStatus, type TenantStatusFilter } from "./tenant-filter";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  email: string;
  lastLoginAt: string | null;
};

type Result = { success: boolean; error?: string; temporaryPassword?: string };

type TenantManagerProps = {
  tenants: TenantRow[];
  createTenant: (formData: FormData) => Promise<Result>;
  updateTenant: (formData: FormData) => Promise<Result>;
  toggleTenant: (formData: FormData) => Promise<Result>;
  resetPassword: (formData: FormData) => Promise<Result>;
  deleteTenant: (formData: FormData) => Promise<Result>;
};

type PendingConfirmation =
  | { type: "toggle"; tenant: TenantRow }
  | { type: "reset"; tenant: TenantRow }
  | { type: "delete"; tenant: TenantRow };

export function TenantManager({
  tenants,
  createTenant,
  updateTenant,
  toggleTenant,
  resetPassword,
  deleteTenant,
}: TenantManagerProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<{ value: string; tenantId?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenantStatusFilter>("ALL");
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  const filteredTenants = useMemo(
    () => filterTenantRows(tenants, search, statusFilter),
    [search, statusFilter, tenants],
  );
  const activeCount = tenants.filter((tenant) => tenant.status === "ACTIVE").length;
  const suspendedCount = tenants.length - activeCount;
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "ALL";
  const clientLabel = tenants.length === 1 ? "cliente" : "clientes";

  async function run(
    action: (formData: FormData) => Promise<Result>,
    formData: FormData,
    tenantId?: string,
  ): Promise<boolean> {
    setLoading(true);
    setNotice(null);
    const result = await action(formData);
    setLoading(false);
    if (!result.success) {
      setNotice(result.error ?? "No se pudo completar la operación");
      return false;
    }
    if (result.temporaryPassword) {
      setTemporaryPassword({ value: result.temporaryPassword, tenantId });
      router.refresh();
    } else {
      window.location.reload();
    }
    return true;
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
  }

  async function confirmPendingAction() {
    if (!pendingConfirmation) return;

    const { type, tenant } = pendingConfirmation;
    const formData = new FormData();
    formData.set("id", tenant.id);

    let success = false;
    if (type === "toggle") {
      formData.set("status", tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
      success = await run(toggleTenant, formData);
    } else if (type === "reset") {
      success = await run(resetPassword, formData, tenant.id);
    } else {
      formData.set("slug", tenant.slug);
      success = await run(deleteTenant, formData);
    }

    if (success) setPendingConfirmation(null);
  }

  const confirmationDetails = pendingConfirmation
    ? pendingConfirmation.type === "toggle"
      ? pendingConfirmation.tenant.status === "ACTIVE"
        ? {
            title: `¿Suspender ${pendingConfirmation.tenant.name}?`,
            description: "La cuenta perderá el acceso al panel y su menú público dejará de estar disponible hasta que la reactives. Sus datos se conservarán.",
            confirmLabel: "Suspender cuenta",
            loadingLabel: "Suspendiendo...",
          }
        : {
            title: `¿Reactivar ${pendingConfirmation.tenant.name}?`,
            description: "La cuenta volverá a tener acceso al panel de administración.",
            confirmLabel: "Reactivar cuenta",
            loadingLabel: "Reactivando...",
          }
      : pendingConfirmation.type === "reset"
        ? {
            title: `¿Restablecer la clave de ${pendingConfirmation.tenant.name}?`,
            description: "Se generará una nueva contraseña temporal y la contraseña actual dejará de funcionar.",
            confirmLabel: "Restablecer clave",
            loadingLabel: "Restableciendo...",
          }
        : {
            title: `¿Borrar ${pendingConfirmation.tenant.name}?`,
            description: "Esta acción eliminará definitivamente la cuenta, su menú y sus archivos. No se puede deshacer.",
            confirmLabel: "Borrar cuenta",
            loadingLabel: "Borrando...",
          }
    : null;

  return (
    <div className="space-y-6">
      {notice && (
        <div role="alert" className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="shrink-0 rounded-lg p-1 text-red-400 transition hover:bg-red-100 hover:text-red-700" aria-label="Cerrar aviso">
            <X size={16} />
          </button>
        </div>
      )}

      {temporaryPassword && !temporaryPassword.tenantId && (
        <div role="status" className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold">Contraseña temporal (guardala ahora)</p>
            <code className="mt-3 block overflow-x-auto rounded-lg bg-white px-3 py-2 text-base">{temporaryPassword.value}</code>
          </div>
          <button type="button" onClick={() => setTemporaryPassword(null)} className="self-start rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-amber-800 transition hover:bg-amber-100 sm:self-center">
            Cerrar
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-100 px-6 py-5 sm:flex-row sm:items-start sm:px-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
            <Building2 size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Alta de cliente</p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-950">Crear una cuenta</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Generá un acceso para un nuevo negocio y obtené su contraseña temporal.</p>
          </div>
        </div>
        <form action={async (formData) => { await run(createTenant, formData); }} className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-[1.2fr_1.2fr_0.8fr_auto] lg:items-end">
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
            Nombre del negocio
            <input name="name" required placeholder="Café Central" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
            Correo de acceso
            <input name="email" type="email" required placeholder="hola@negocio.com" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
            Slug público
            <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="cafe-central" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
          </label>
          <button type="submit" disabled={loading} className="inline-flex h-[42px] items-center justify-center rounded-xl bg-emerald-950 px-4 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
            Crear cuenta
          </button>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Clientes totales", value: tenants.length, detail: "Cuentas registradas", icon: Building2, color: "bg-emerald-100 text-emerald-800" },
          { label: "Activos", value: activeCount, detail: "Con acceso habilitado", icon: CheckCircle2, color: "bg-sky-100 text-sky-800" },
          { label: "Suspendidos", value: suspendedCount, detail: "Revisá su estado de acceso", icon: KeyRound, color: "bg-amber-100 text-amber-800" },
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
                <input id="tenant-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, email o slug" className="min-w-0 w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400" />
                {search && <button type="button" onClick={() => setSearch("")} className="shrink-0 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700" aria-label="Limpiar búsqueda"><X size={15} /></button>}
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
                <Filter size={16} className="shrink-0 text-zinc-400" />
                <span className="sr-only">Filtrar por estado</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TenantStatusFilter)} aria-label="Filtrar por estado" className="bg-transparent font-medium text-zinc-700 outline-none">
                  <option value="ALL">Todos los estados</option>
                  <option value="ACTIVE">Activos</option>
                  <option value="SUSPENDED">Suspendidos</option>
                </select>
              </label>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <p role="status" aria-live="polite" className="text-zinc-500">
              {hasActiveFilters ? `${filteredTenants.length} de ${tenants.length} ${clientLabel}` : `${tenants.length} ${clientLabel} registrados`}
            </p>
            {hasActiveFilters && <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800 transition hover:bg-emerald-50"><X size={14} /> Limpiar filtros</button>}
          </div>
        </div>

        <div className="divide-y divide-zinc-100">
          {filteredTenants.map((tenant) => {
            const isSuspended = tenant.status === "SUSPENDED";

            return (
            <div key={tenant.id} className={`grid gap-5 px-6 py-6 transition sm:px-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] lg:items-start ${isSuspended ? "border-l-4 border-l-amber-400 bg-amber-50/70 hover:bg-amber-50" : "hover:bg-emerald-50/20"}`}>
              <div className="min-w-0">
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSuspended ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}><Building2 size={18} /></span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-zinc-950">{tenant.name}</p>
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-sm text-zinc-500"><Mail size={14} className="shrink-0 text-zinc-400" /> {tenant.email}</p>
                  </div>
                </div>
                <form action={async (formData) => { await run(updateTenant, formData); }} className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto]">
                  <input type="hidden" name="id" value={tenant.id} />
                  <input name="name" defaultValue={tenant.name} aria-label={`Nombre de ${tenant.name}`} className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-xs text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
                  <input name="email" type="email" defaultValue={tenant.email} aria-label={`Correo de ${tenant.name}`} className="w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-xs text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
                  <button type="submit" disabled={loading} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">Guardar</button>
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
                  <button type="button" disabled={loading} onClick={() => setPendingConfirmation({ type: "toggle", tenant })} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{isSuspended ? "Reactivar" : "Suspender"}</button>
                  <button type="button" disabled={loading} onClick={() => setPendingConfirmation({ type: "reset", tenant })} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-amber-300 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50">Restablecer clave</button>
                  <button type="button" disabled={loading} onClick={() => setPendingConfirmation({ type: "delete", tenant })} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Borrar</button>
                </div>
              </div>

              {temporaryPassword?.tenantId === tenant.id && (
                <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 lg:col-span-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><KeyRound size={16} className="text-amber-700" /><p className="font-bold">Contraseña temporal (guardala ahora)</p></div>
                      <code className="mt-3 block overflow-x-auto rounded-lg bg-white px-3 py-2 text-base">{temporaryPassword.value}</code>
                    </div>
                    <button type="button" onClick={() => setTemporaryPassword(null)} className="self-start rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-amber-800 transition hover:bg-amber-100">Cerrar</button>
                  </div>
                </div>
              )}
            </div>
            );
          })}

          {tenants.length === 0 && (
            <div className="px-6 py-14 text-center sm:px-8">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><Building2 size={21} /></span>
              <h3 className="mt-4 text-base font-semibold text-zinc-950">Todavía no hay clientes</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-zinc-500">Creá la primera cuenta desde el formulario superior para comenzar.</p>
            </div>
          )}

          {tenants.length > 0 && filteredTenants.length === 0 && (
            <div className="px-6 py-14 text-center sm:px-8">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-500"><Search size={21} /></span>
              <h3 className="mt-4 text-base font-semibold text-zinc-950">No encontramos coincidencias</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-zinc-500">Probá con otro término o quitá los filtros para ver todos los clientes.</p>
              <button type="button" onClick={clearFilters} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900"><X size={16} /> Limpiar filtros</button>
            </div>
          )}
        </div>
      </section>

      {confirmationDetails && (
        <AdminConfirmModal
          open={Boolean(pendingConfirmation)}
          title={confirmationDetails.title}
          description={confirmationDetails.description}
          onClose={() => setPendingConfirmation(null)}
          onConfirm={confirmPendingAction}
          loading={loading}
          confirmLabel={confirmationDetails.confirmLabel}
          loadingLabel={confirmationDetails.loadingLabel}
        />
      )}
    </div>
  );
}
