import { notFound } from "next/navigation";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { AdminShell } from "@/ui/admin/AdminShell";
import { ApplicationError } from "@/platform/application/errors";

export default async function RestaurantLayout({ children, params }: { children: React.ReactNode; params: Promise<{ restaurantId: string }> }) {
  let context;
  try { context = await requireRestaurantContext((await params).restaurantId); }
  catch (error) { if (error instanceof ApplicationError && ["NOT_FOUND", "FORBIDDEN"].includes(error.code)) notFound(); throw error; }
  return <AdminShell key={context.restaurantId} restaurantId={context.restaurantId} organizationName={context.organizationName} brandTitle={context.restaurant.name} brandSubtitle={context.restaurant.publicDescription} showMenuPickerLink landingEnabled={context.restaurant.landingEnabled}>{children}</AdminShell>;
}