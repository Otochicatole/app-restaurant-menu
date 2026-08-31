import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor } from "@/modules/menu-editor/server";
import { FontLibraryClient } from "@/modules/menu-editor/ui";
import { AdminCard, AdminPageHeader } from "@/ui/admin/AdminPrimitives";

export default async function AdminSettingsFontsPage() {
  const account = await requireTenantAdmin();
  const fonts = await menuEditor.listAssets(account.tenantId, "FONT");
  return <div className="space-y-8"><AdminPageHeader eyebrow="Configuración" title="Fuentes propias" description="Subí las tipografías de tu marca y elegilas desde el inspector del editor." /><AdminCard className="p-6 sm:p-8"><FontLibraryClient initialAssets={fonts} /></AdminCard></div>;
}
