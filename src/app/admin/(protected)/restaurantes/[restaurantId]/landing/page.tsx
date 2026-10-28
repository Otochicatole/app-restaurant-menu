import { redirect } from "next/navigation";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { landingManagement } from "@/modules/landing-management/server";
import { MonacoLandingEditor } from "@/modules/landing-management/ui";
export default async function RestaurantLandingPage({ params }: { params: Promise<{ restaurantId: string }> }) {
 const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
 if (!restaurant.landingEnabled) redirect("/admin/restaurantes/" + restaurantId);
 const editorData = await landingManagement.getLandingEditorData(restaurantId);
 return <MonacoLandingEditor key={restaurantId} initialData={editorData} isSuperAdmin={false} />;
}
