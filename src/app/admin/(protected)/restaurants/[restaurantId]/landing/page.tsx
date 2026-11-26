import type { Metadata } from "next";
import { hasRestaurantFeature, requireRestaurantContext } from "@/modules/restaurant-management/server";
import { landingManagement } from "@/modules/landing-management/server";
import { MonacoLandingEditor } from "@/modules/landing-management/ui";
import { FeatureLockedScreen } from "@/ui/admin/FeatureLockedScreen";

export const metadata: Metadata = { title: "Landing" };
export default async function RestaurantLandingPage({ params }: { params: Promise<{ restaurantId: string }> }) {
 const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
 if (!hasRestaurantFeature(restaurant, "landing")) return <FeatureLockedScreen restaurant={restaurant} feature="landing" />;
 const editorData = await landingManagement.getLandingEditorData(restaurantId);
 return <MonacoLandingEditor key={restaurantId} initialData={editorData} isSuperAdmin={false} />;
}
