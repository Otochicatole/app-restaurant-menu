import { getOrCreateHomePage } from "@/features/home-page/backend/services/home-page.service";
import { AdminShell } from "./AdminShell";
import { requireAuthenticatedAccount } from "@/features/auth/backend/services/auth.service";
import { redirect } from "next/navigation";

export async function AdminLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAuthenticatedAccount();
  if (account.role !== "TENANT_ADMIN") redirect("/superadmin");
  if (account.mustChangePassword) redirect("/admin/account/password");
  if (!account.tenantId || !account.tenantSlug) redirect("/admin/login");
  const homePage = await getOrCreateHomePage(account.tenantId);

  return (
    <AdminShell brandTitle={homePage.title} brandSubtitle={homePage.description} menuHref={`/m/${account.tenantSlug}`}>
      {children}
    </AdminShell>
  );
}
