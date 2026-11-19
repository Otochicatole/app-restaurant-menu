import type { Metadata } from "next";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { tableService } from "@/modules/reservation-management/server";
import { KitchenDisplayScreen } from "@/modules/reservation-management/ui";

export const metadata: Metadata = { title: "Cocina" };

export default async function AdminKitchenPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string }>;
  searchParams?: Promise<{ station?: string }>;
}) {
  const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
  const stationParam = (await searchParams)?.station;
  const initialStation = stationParam === "BAR" ? "BAR" : stationParam === "KITCHEN" ? "KITCHEN" : "ALL";
  const initialSnapshot = await tableService.kitchen(restaurantId);
  return (
    <KitchenDisplayScreen
      restaurantId={restaurantId}
      restaurantName={restaurant.name}
      initialSnapshot={initialSnapshot}
      initialStation={initialStation}
      backUrl=""
    />
  );
}
