import { redirect } from "next/navigation";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";
import { landingManagement } from "@/modules/landing-management/server";
import { loadActiveMenuWorkspace } from "@/modules/menu-editor/server";
import { AdminShell } from "@/ui/admin/AdminShell";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthenticatedAccount();
  if (!actor) redirect("/admin/login");
  if (actor.kind === "super-admin") redirect("/superadmin");
  if (actor.mustChangePassword) redirect("/admin/account/password");

  const [workspace, landingEnabled] = await Promise.all([
    loadActiveMenuWorkspace(actor.tenantId),
    landingManagement.isLandingEnabled(actor.tenantId),
  ]);

  const active = workspace.active;
  const brandTitle = active?.name ?? actor.tenantSlug;
  const brandSubtitle = active?.publicDescription ?? "Menú digital";
  const showMenuPickerLink = workspace.multiMenuEnabled || workspace.menus.length > 1;

  return (
    <AdminShell
      brandTitle={brandTitle}
      brandSubtitle={brandSubtitle}
      showMenuPickerLink={showMenuPickerLink}
      landingEnabled={landingEnabled}
    >
      {children}
    </AdminShell>
  );
}
