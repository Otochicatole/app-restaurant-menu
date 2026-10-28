import { redirect } from "next/navigation";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { reservationManagement } from "@/modules/reservation-management/server";
import { ReservationCmsScreen } from "@/modules/reservation-management/ui";
export default async function RestaurantReservationsPage({ params }: { params: Promise<{ restaurantId: string }> }) {
 const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
 if (!restaurant.landingEnabled) redirect("/admin/restaurantes/" + restaurantId);
 const cmsData = await reservationManagement.getCmsData(restaurantId);
 return <ReservationCmsScreen key={restaurantId} initialData={cmsData} />;
}
