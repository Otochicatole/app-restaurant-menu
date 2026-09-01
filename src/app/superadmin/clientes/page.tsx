import { createTenantAction, deleteTenantAction, resetTenantPasswordAction, setTenantStatusAction, tenantManagement, updateTenantAction } from "@/modules/tenant-management/server";
import { TenantManager } from "@/modules/tenant-management/ui";
import { Users } from "lucide-react";

export default async function SuperAdminClientsPage() {
  const tenants = await tenantManagement.listTenants();
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10"><div className="mb-8 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Users size={19} /></span><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Clientes</p><h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Cuentas de restaurantes</h1><p className="mt-2 text-sm text-zinc-500">Creá, editá, suspendé y administrá el acceso de cada restaurante.</p></div></div><TenantManager tenants={tenants} createTenant={createTenantAction} updateTenant={updateTenantAction} toggleTenant={setTenantStatusAction} resetPassword={resetTenantPasswordAction} deleteTenant={deleteTenantAction} /></main>;
}
