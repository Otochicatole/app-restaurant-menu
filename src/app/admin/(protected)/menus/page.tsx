import { requireTenantAdmin } from "@/modules/identity-access/server";
import { createMenuAction, deleteMenusAction, loadActiveMenuWorkspace, selectMenuAction } from "@/modules/menu-editor/server";
import { MenuPickerScreen } from "@/modules/menu-editor/ui";

export default async function AdminMenusPage() {
  const actor = await requireTenantAdmin();
  const workspace = await loadActiveMenuWorkspace(actor.tenantId);
  const accountLabel =
    workspace.menus.find((menu) => menu.isPrimary)?.name ??
    workspace.menus[0]?.name ??
    actor.tenantSlug;
  return (
    <MenuPickerScreen
      menus={workspace.menus}
      multiMenuEnabled={workspace.multiMenuEnabled}
      maxMenus={workspace.maxMenus}
      canCreateMenu={workspace.canCreateMenu}
      activeMenuId={workspace.active?.id ?? null}
      accountLabel={accountLabel}
      selectMenu={selectMenuAction}
      createMenu={createMenuAction}
      deleteMenus={deleteMenusAction}
    />
  );
}
