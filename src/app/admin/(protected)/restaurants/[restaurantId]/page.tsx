import type { Metadata } from "next";
import { resolveSectionMetadata } from "@/app/window-title";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { menuEditor, menuTemplates, requireActiveMenuProject } from "@/modules/menu-editor/server";
import { CanvasEditor } from "@/modules/menu-editor/ui";
import { getServerEnv } from "@/platform/config/server-env";

export async function generateMetadata({ params }: { params: Promise<{ restaurantId: string }> }): Promise<Metadata> {
  const { restaurantId } = await params;
  return resolveSectionMetadata("Editor", async () => (await requireRestaurantContext(restaurantId)).restaurant.name);
}
export default async function RestaurantEditorPage({ params }: { params: Promise<{ restaurantId: string }> }) {
 const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
 const project = await requireActiveMenuProject(restaurantId);
 const [assets, templates] = await Promise.all([menuEditor.listAssets(restaurantId), menuTemplates.list(restaurantId)]);
 return <CanvasEditor key={restaurantId} restaurantId={restaurantId} project={project} initialAssets={assets} initialTemplates={templates} restaurantName={restaurant.name} restaurantSlug={restaurant.slug} publicMenuUrl={getServerEnv().APP_URL + "/m/" + restaurant.slug} />;
}
