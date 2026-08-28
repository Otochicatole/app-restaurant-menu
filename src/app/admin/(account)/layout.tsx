import { redirect } from "next/navigation";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const actor = await getAuthenticatedAccount();
  if (!actor) redirect("/admin/login");
  return children;
}
