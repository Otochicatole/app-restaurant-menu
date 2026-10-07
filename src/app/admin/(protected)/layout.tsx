import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";
import { loadActiveMenuWorkspace } from "@/modules/menu-editor/server";
import { AdminShell } from "@/ui/admin/AdminShell";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthenticatedAccount();
  if (!actor) redirect("/admin/login");
  if (actor.kind === "super-admin") redirect("/superadmin");
  if (actor.mustChangePassword) redirect("/admin/account/password");

  const workspace = await loadActiveMenuWorkspace(actor.tenantId);
  const pathname = (await headers()).get("x-pathname") ?? "";
  const onMenusPage = pathname === "/admin/menus" || pathname.startsWith("/admin/menus/");

  if (workspace.needsSelection && !onMenusPage) {
    redirect("/admin/menus");
  }

  const active = workspace.active;
  const brandTitle = active?.name ?? actor.tenantSlug;
  const brandSubtitle = active?.publicDescription ?? "Menú digital";
  const menuHref = active ? `/m/${active.slug}` : "/admin/menus";
  const showMenuPickerLink = workspace.multiMenuEnabled || workspace.menus.length > 1;

  return (
    <AdminShell
      brandTitle={brandTitle}
      brandSubtitle={brandSubtitle}
      menuHref={menuHref}
      showMenuPickerLink={showMenuPickerLink}
    >
      {children}
    </AdminShell>
  );
}
