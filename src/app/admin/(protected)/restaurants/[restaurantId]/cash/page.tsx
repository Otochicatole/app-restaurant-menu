import type { Metadata } from "next";
import { restaurantToday } from "@/modules/floor-management/contracts";
import { CashCmsScreen } from "@/modules/reservation-management/ui";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";

export const metadata: Metadata = { title: "Caja" };

export default async function CashPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
  return <CashCmsScreen restaurantId={restaurantId} restaurantName={restaurant.name} timeZone={restaurant.timeZone} initialToday={restaurantToday(restaurant.timeZone)} />;
}
