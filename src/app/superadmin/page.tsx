import { requireSuperAdmin } from "@/modules/identity-access/server";
import {
  createTenantAction,
  deleteTenantAction,
  resetTenantPasswordAction,
  setTenantStatusAction,
  tenantManagement,
  updateTenantAction,
} from "@/modules/tenant-management/server";
import { TenantManager } from "@/modules/tenant-management/ui";
import { LogoutButton } from "@/modules/identity-access/ui";
import { ShieldCheck, UtensilsCrossed } from "lucide-react";

export default async function SuperAdminPage() {
  await requireSuperAdmin();
  const rows = await tenantManagement.listTenants();

  return (
    <div data-admin-panel className="min-h-screen bg-[#f5f7f3] text-zinc-900">
      <header className="border-b border-emerald-900 bg-emerald-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-200 text-emerald-950"><UtensilsCrossed size={18} strokeWidth={2.5} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Plataforma</p>
              <p className="mt-1 text-sm font-semibold text-white sm:text-base">Administración de cuentas</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs font-medium text-emerald-200 md:block">Sesión de superadministrador</span>
            <div className="w-auto sm:w-40"><LogoutButton /></div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Centro de control</p>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Administración general</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Creá y administrá las cuentas que consumen tu aplicación desde un único lugar.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900">
            <ShieldCheck size={20} className="shrink-0 text-emerald-700" />
            <div>
              <p className="text-sm font-semibold">Acceso protegido</p>
              <p className="mt-0.5 text-xs text-emerald-700">Solo visible para el superadministrador</p>
            </div>
          </div>
        </div>

        <TenantManager
          tenants={rows}
          createTenant={createTenantAction}
          updateTenant={updateTenantAction}
          toggleTenant={setTenantStatusAction}
          resetPassword={resetTenantPasswordAction}
          deleteTenant={deleteTenantAction}
        />
      </main>
    </div>
  );
}
