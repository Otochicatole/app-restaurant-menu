import { ServiceCatalogScreen } from "@/modules/reservation-management/ui";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";

export default async function ServiceProductsPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
  return <ServiceCatalogScreen restaurantId={restaurantId} />;
}
