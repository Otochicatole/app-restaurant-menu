import { redirect } from "next/navigation";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";
import { loadActiveMenuWorkspace } from "@/modules/menu-editor/server";

export default async function RequiresActiveMenuLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthenticatedAccount();
  if (!actor || actor.kind !== "tenant-admin") return children;

  const workspace = await loadActiveMenuWorkspace(actor.tenantId);
  if (workspace.needsSelection) {
    redirect("/admin/menus");
  }

  return children;
}
