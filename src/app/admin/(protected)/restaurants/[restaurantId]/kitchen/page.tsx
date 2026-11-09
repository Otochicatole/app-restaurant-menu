import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { tableService } from "@/modules/reservation-management/server";
import { KitchenDisplayScreen } from "@/modules/reservation-management/ui";

export default async function AdminKitchenPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
  const initialSnapshot = await tableService.kitchen(restaurantId);
  return (
    <KitchenDisplayScreen
      restaurantId={restaurantId}
      restaurantName={restaurant.name}
      initialSnapshot={initialSnapshot}
      backUrl={`/admin/restaurants/${restaurantId}/cash`}
    />
  );
}
