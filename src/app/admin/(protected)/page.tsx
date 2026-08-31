import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor, createTemplateDocument } from "@/modules/menu-editor/server";
import { CanvasEditor } from "@/modules/menu-editor/ui";

export default async function AdminDashboard() {
  const account = await requireTenantAdmin();
  const [project, assets, profile] = await Promise.all([
    menuEditor.getProject(account.tenantId, createTemplateDocument(account.tenantSlug)),
    menuEditor.listAssets(account.tenantId),
    menuEditor.getProfile(account.tenantId),
  ]);
  return <CanvasEditor project={project} initialAssets={assets} restaurantName={profile.name} restaurantSlug={account.tenantSlug} />;
}
