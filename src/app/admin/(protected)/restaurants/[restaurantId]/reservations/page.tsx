import { redirect } from "next/navigation";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { reservationManagement } from "@/modules/reservation-management/server";
import { ReservationCmsScreen } from "@/modules/reservation-management/ui";
import { restaurantToday } from "@/modules/floor-management/contracts";
export default async function RestaurantReservationsPage({ params }: { params: Promise<{ restaurantId: string }> }) {
 const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
 if (!restaurant.landingEnabled) redirect("/admin/restaurants/" + restaurantId);
 const cmsData = await reservationManagement.getCmsData(restaurantId);
 return <ReservationCmsScreen initialData={cmsData} today={restaurantToday(cmsData.timeZone)} />;
}
