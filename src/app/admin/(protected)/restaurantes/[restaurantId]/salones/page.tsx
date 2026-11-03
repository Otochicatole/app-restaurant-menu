import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { FloorAdminScreen } from "@/modules/floor-management/ui";

export default async function RestaurantRoomsPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
  return <FloorAdminScreen restaurantId={restaurantId} />;
}
