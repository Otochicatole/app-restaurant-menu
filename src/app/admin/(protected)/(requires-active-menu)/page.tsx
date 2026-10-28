import { redirect } from "next/navigation";
import { getRestaurantWorkspace } from "@/modules/restaurant-management/server";

export default async function AdminEntryPage() {
  const workspace = await getRestaurantWorkspace();
  if (workspace.active) redirect(`/admin/restaurantes/${workspace.active.id}`);
  redirect("/admin/restaurantes");
}