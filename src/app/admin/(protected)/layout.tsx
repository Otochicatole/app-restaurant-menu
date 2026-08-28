import { redirect } from "next/navigation";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";
import { menuCustomization } from "@/modules/menu-customization/server";
import { AdminShell } from "@/ui/admin/AdminShell";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthenticatedAccount();
  if (!actor) redirect("/admin/login");
  if (actor.kind === "super-admin") redirect("/superadmin");
  if (actor.mustChangePassword) redirect("/admin/account/password");

  const header = await menuCustomization.getHeader(actor.tenantId);
  return (
    <AdminShell
      brandTitle={header.title}
      brandSubtitle={header.description}
      menuHref={`/m/${actor.tenantSlug}`}
    >
      {children}
    </AdminShell>
  );
}
