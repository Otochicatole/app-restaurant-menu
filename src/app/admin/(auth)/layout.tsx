import { redirect } from "next/navigation";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";

export default async function AnonymousAdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthenticatedAccount();
  if (!actor) return children;
  if (actor.kind === "super-admin") redirect("/superadmin");
  redirect(actor.mustChangePassword ? "/admin/account/password" : "/admin");
}
