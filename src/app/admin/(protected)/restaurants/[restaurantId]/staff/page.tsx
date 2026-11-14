import type { Metadata } from "next";
import { StaffDirectoryScreen } from "@/modules/reservation-management/ui";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";

export const metadata: Metadata = { title: "Personal" };

export default async function StaffPage({ params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
  return <StaffDirectoryScreen restaurantId={restaurantId} />;
}
