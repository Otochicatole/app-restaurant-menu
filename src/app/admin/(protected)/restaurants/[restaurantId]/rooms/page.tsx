import type { Metadata } from "next";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { floorManagement } from "@/modules/floor-management/server";
import { FloorAdminScreen } from "@/modules/floor-management/ui";

export const metadata: Metadata = { title: "Salones" };

export default async function RestaurantRoomsPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
  const initialConfig = await floorManagement.getConfig(restaurantId).catch(() => null);
  return <FloorAdminScreen restaurantId={restaurantId} initialConfig={initialConfig} />;
}
