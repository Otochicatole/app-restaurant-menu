import type { Metadata } from "next";
import { InventoryManagementScreen } from "@/modules/inventory-management/ui";
import { hasRestaurantFeature, requireRestaurantContext } from "@/modules/restaurant-management/server";
import { FeatureLockedScreen } from "@/ui/admin/FeatureLockedScreen";

export const metadata: Metadata = { title: "Inventario y recetas" };

export default async function RestaurantInventoryPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
  if (!hasRestaurantFeature(restaurant, "inventory")) {
    return <FeatureLockedScreen restaurant={restaurant} feature="inventory" />;
  }
  return <InventoryManagementScreen restaurantId={restaurantId} />;
}
