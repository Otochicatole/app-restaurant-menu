import type { Metadata } from "next";
import { StaffDirectoryScreen } from "@/modules/reservation-management/ui";
import { hasRestaurantFeature, requireRestaurantContext } from "@/modules/restaurant-management/server";
import { FeatureLockedScreen } from "@/ui/admin/FeatureLockedScreen";

export const metadata: Metadata = { title: "Personal" };

export default async function StaffPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
  if (!hasRestaurantFeature(restaurant, "floorManagement")) {
    return <FeatureLockedScreen restaurant={restaurant} feature="floorManagement" />;
  }
  return <StaffDirectoryScreen restaurantId={restaurantId} />;
}
