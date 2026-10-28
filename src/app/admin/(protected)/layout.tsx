import { redirect } from "next/navigation";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthenticatedAccount();
  if (!actor) redirect("/admin/login");
  if (actor.kind === "super-admin") redirect("/superadmin");
  if (actor.mustChangePassword) redirect("/admin/account/password");
  return children;
}