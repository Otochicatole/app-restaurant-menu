import { redirect } from "next/navigation";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";
import { menuEditor } from "@/modules/menu-editor/server";
import { AdminShell } from "@/ui/admin/AdminShell";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthenticatedAccount();
  if (!actor) redirect("/admin/login");
  if (actor.kind === "super-admin") redirect("/superadmin");
  if (actor.mustChangePassword) redirect("/admin/account/password");

  const profile = await menuEditor.getProfile(actor.tenantId);
  return (
    <AdminShell
      brandTitle={profile.name}
      brandSubtitle={profile.publicDescription}
      menuHref={`/m/${actor.tenantSlug}`}
    >
      {children}
    </AdminShell>
  );
}
