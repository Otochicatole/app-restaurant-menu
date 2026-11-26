import type { Metadata } from "next";
import { restaurantToday } from "@/modules/floor-management/contracts";
import { CashCmsScreen } from "@/modules/reservation-management/ui";
import { hasRestaurantFeature, requireRestaurantContext } from "@/modules/restaurant-management/server";
import { FeatureLockedScreen } from "@/ui/admin/FeatureLockedScreen";

export const metadata: Metadata = { title: "Caja" };

export default async function CashPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
  if (!hasRestaurantFeature(restaurant, "floorManagement")) {
    return <FeatureLockedScreen restaurant={restaurant} feature="floorManagement" />;
  }
  return <CashCmsScreen restaurantId={restaurantId} restaurantName={restaurant.name} timeZone={restaurant.timeZone} initialToday={restaurantToday(restaurant.timeZone)} />;
}
