import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { menuEditor } from "@/modules/menu-editor/server";
import { FontLibraryClient } from "@/modules/menu-editor/ui";
import { AdminCard, AdminPageHeader } from "@/ui/admin/AdminPrimitives";
export default async function RestaurantFontsPage({ params }: { params: Promise<{ restaurantId: string }> }) {
 const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
 const fonts = await menuEditor.listAssets(restaurantId, "FONT");
 return <div className="space-y-8"><AdminPageHeader title="Fuentes propias" description={"Tipografías disponibles para " + restaurant.name + "."} /><AdminCard className="p-6 sm:p-8"><FontLibraryClient key={restaurantId} restaurantId={restaurantId} initialAssets={fonts} /></AdminCard></div>;
}
