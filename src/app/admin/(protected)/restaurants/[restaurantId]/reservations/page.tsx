import type { Metadata } from "next";
import { hasRestaurantFeature, requireRestaurantContext } from "@/modules/restaurant-management/server";
import { reservationManagement } from "@/modules/reservation-management/server";
import { ReservationCmsScreen } from "@/modules/reservation-management/ui";
import { restaurantToday } from "@/modules/floor-management/contracts";
import { FeatureLockedScreen } from "@/ui/admin/FeatureLockedScreen";

export const metadata: Metadata = { title: "Reservas" };
export default async function RestaurantReservationsPage({ params }: { params: Promise<{ restaurantId: string }> }) {
 const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
 if (!hasRestaurantFeature(restaurant, "reservations")) return <FeatureLockedScreen restaurant={restaurant} feature="reservations" />;
 const cmsData = await reservationManagement.getCmsData(restaurantId);
 return <ReservationCmsScreen initialData={cmsData} today={restaurantToday(cmsData.timeZone)} />;
}
