import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { landingManagement } from "@/modules/landing-management/server";
import { MonacoLandingEditor } from "@/modules/landing-management/ui";

export const metadata: Metadata = { title: "Landing" };
export default async function RestaurantLandingPage({ params }: { params: Promise<{ restaurantId: string }> }) {
 const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
 if (!restaurant.landingEnabled) redirect("/admin/restaurants/" + restaurantId);
 const editorData = await landingManagement.getLandingEditorData(restaurantId);
 return <MonacoLandingEditor key={restaurantId} initialData={editorData} isSuperAdmin={false} />;
}
