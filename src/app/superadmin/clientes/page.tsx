import {
  createTenantAction,
  deleteTenantAction,
  deleteTenantMenusAction,
  resetTenantPasswordAction,
  setTenantMaxMenusAction,
  setTenantMultiMenuAction,
  setTenantStatusAction,
  tenantManagement,
  updateTenantAction,
} from "@/modules/tenant-management/server";
import { TenantManager } from "@/modules/tenant-management/ui";

export default async function SuperAdminClientsPage() {
  const tenants = await tenantManagement.listTenants();
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
      <TenantManager
        tenants={tenants}
        createTenant={createTenantAction}
        updateTenant={updateTenantAction}
        toggleTenant={setTenantStatusAction}
        toggleMultiMenu={setTenantMultiMenuAction}
        setMaxMenus={setTenantMaxMenusAction}
        deleteMenus={deleteTenantMenusAction}
        resetPassword={resetTenantPasswordAction}
        deleteTenant={deleteTenantAction}
      />
    </main>
  );
}
