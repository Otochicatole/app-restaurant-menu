import Link from "next/link";
import { AdminCard, AdminPageHeader } from "@/ui/admin/AdminPrimitives";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { menuEditor, requireActiveMenuProject } from "@/modules/menu-editor/server";
import { RestaurantProfileForm } from "@/modules/menu-editor/ui";
export default async function RestaurantSettingsPage({ params }: { params: Promise<{ restaurantId: string }> }) {
 const { restaurantId, restaurant } = await requireRestaurantContext((await params).restaurantId);
 const project = await requireActiveMenuProject(restaurantId);
 const profile = await menuEditor.getProfile(restaurantId, project.id);
 return <div className="space-y-8"><AdminPageHeader title="Ajustes del restaurante" description={"Configurá " + restaurant.name + " y sus enlaces públicos."} /><AdminCard className="p-6 sm:p-8"><RestaurantProfileForm key={restaurantId} restaurantId={restaurantId} initialData={profile} /></AdminCard><AdminCard className="p-6"><Link className="font-semibold text-zinc-800" href={"/admin/restaurantes/" + encodeURIComponent(restaurantId) + "/settings/fonts"}>Biblioteca de fuentes del restaurante</Link></AdminCard><p className="text-sm text-zinc-600">El correo y la contraseña son de tu organización. <Link className="underline" href="/admin/account">Administrar cuenta</Link></p></div>;
}
