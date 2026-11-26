import type { Metadata } from "next";
import { hasRestaurantFeature, requireRestaurantContext } from "@/modules/restaurant-management/server";
import { floorManagement } from "@/modules/floor-management/server";
import { FloorAdminScreen } from "@/modules/floor-management/ui";
import { FeatureLockedScreen } from "@/ui/admin/FeatureLockedScreen";

export const metadata: Metadata = { title: "Salones" };

export default async function RestaurantRoomsPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
  if (!hasRestaurantFeature(restaurant, "floorManagement")) {
    return <FeatureLockedScreen restaurant={restaurant} feature="floorManagement" />;
  }
  const initialConfig = await floorManagement.getConfig(restaurantId).catch(() => null);
  return <FloorAdminScreen restaurantId={restaurantId} initialConfig={initialConfig} />;
}
