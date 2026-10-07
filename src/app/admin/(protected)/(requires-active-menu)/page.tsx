import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor, menuTemplates, requireActiveMenuProject } from "@/modules/menu-editor/server";
import { CanvasEditor } from "@/modules/menu-editor/ui";
import { getServerEnv } from "@/platform/config/server-env";

export default async function AdminDashboard() {
  const account = await requireTenantAdmin();
  const project = await requireActiveMenuProject(account.tenantId);
  const [assets, templates] = await Promise.all([
    menuEditor.listAssets(account.tenantId),
    menuTemplates.list(account.tenantId),
  ]);
  const publicMenuUrl = `${getServerEnv().APP_URL}/m/${project.slug}`;
  return (
    <CanvasEditor
      project={project}
      initialAssets={assets}
      initialTemplates={templates}
      restaurantName={project.name}
      restaurantSlug={project.slug}
      publicMenuUrl={publicMenuUrl}
    />
  );
}
