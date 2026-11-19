import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveSectionMetadata } from "@/app/window-title";
import { requireFloorReadAccess } from "@/modules/floor-management/server";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";
import { tableService } from "@/modules/reservation-management/server";
import { KitchenDisplayScreen } from "@/modules/reservation-management/ui";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ restaurantId?: string; station?: string }> }): Promise<Metadata> {
  const { restaurantId, station } = await searchParams;
  const sectionTitle = station === "BAR" ? "Barra" : "Cocina";
  return resolveSectionMetadata(sectionTitle, async () => (await requireFloorReadAccess(restaurantId)).restaurantName);
}

export default async function KitchenPage({ searchParams }: { searchParams: Promise<{ restaurantId?: string; station?: string }> }) {
  const { restaurantId: requestedId, station } = await searchParams;
  const actor = await getAuthenticatedAccount();
  if (!actor) redirect("/admin/login");
  if (actor.kind !== "waiter" && !requestedId) {
    redirect(actor.kind === "super-admin" ? "/superadmin" : "/admin/restaurants");
  }
  const access = await requireFloorReadAccess(requestedId);
  const initialSnapshot = await tableService.kitchen(access.restaurantId);
  const initialStation = station === "BAR" ? "BAR" : station === "KITCHEN" ? "KITCHEN" : "ALL";
  return (
    <KitchenDisplayScreen
      restaurantId={access.restaurantId}
      restaurantName={access.restaurantName}
      initialSnapshot={initialSnapshot}
      initialStation={initialStation}
      backUrl="/floor"
    />
  );
}
