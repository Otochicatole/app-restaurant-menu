import { redirect } from "next/navigation";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthenticatedAccount();
  if (!actor) redirect("/admin/login");
  if (actor.role !== "SUPER_ADMIN") redirect("/admin");
  return children;
}
