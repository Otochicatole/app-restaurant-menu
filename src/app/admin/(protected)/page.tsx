import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor, menuTemplates, createTemplateDocument } from "@/modules/menu-editor/server";
import { CanvasEditor } from "@/modules/menu-editor/ui";
import { getServerEnv } from "@/platform/config/server-env";

export default async function AdminDashboard() {
  const account = await requireTenantAdmin();
  const [project, assets, profile, templates] = await Promise.all([
    menuEditor.getProject(account.tenantId, createTemplateDocument(account.tenantSlug)),
    menuEditor.listAssets(account.tenantId),
    menuEditor.getProfile(account.tenantId),
    menuTemplates.list(account.tenantId),
  ]);
  const publicMenuUrl = `${getServerEnv().APP_URL}/m/${account.tenantSlug}`;
  return <CanvasEditor project={project} initialAssets={assets} initialTemplates={templates} restaurantName={profile.name} restaurantSlug={account.tenantSlug} publicMenuUrl={publicMenuUrl} />;
}
