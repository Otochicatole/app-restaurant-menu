import type { Metadata } from "next";
import { InventoryManagementScreen } from "@/modules/inventory-management/ui";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";

export const metadata: Metadata = { title: "Inventario y recetas" };

export default async function RestaurantInventoryPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
  return <InventoryManagementScreen restaurantId={restaurantId} />;
}
