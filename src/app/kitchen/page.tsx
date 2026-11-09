import { redirect } from "next/navigation";
import { requireFloorReadAccess } from "@/modules/floor-management/server";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";
import { tableService } from "@/modules/reservation-management/server";
import { KitchenDisplayScreen } from "@/modules/reservation-management/ui";

export default async function KitchenPage({ searchParams }: { searchParams: Promise<{ restaurantId?: string }> }) {
  const requestedId = (await searchParams).restaurantId;
  const actor = await getAuthenticatedAccount();
  if (!actor) redirect("/admin/login");
  if (actor.kind !== "waiter" && !requestedId) {
    redirect(actor.kind === "super-admin" ? "/superadmin" : "/admin/restaurants");
  }
  const access = await requireFloorReadAccess(requestedId);
  const initialSnapshot = await tableService.kitchen(access.restaurantId);
  return (
    <KitchenDisplayScreen
      restaurantId={access.restaurantId}
      restaurantName={access.restaurantName}
      initialSnapshot={initialSnapshot}
      backUrl="/floor"
    />
  );
}
