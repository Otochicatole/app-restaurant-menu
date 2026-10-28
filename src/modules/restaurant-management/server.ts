import "server-only";
import { cookies } from "next/headers";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { loadRestaurantWorkspace } from "./infrastructure/prisma-restaurant-repository";
import { ACTIVE_RESTAURANT_COOKIE } from "./infrastructure/active-restaurant-cookie";

export type { RestaurantContext, RestaurantSummary, RestaurantWorkspace } from "./contracts";
export { createRestaurantAction, deleteRestaurantsAction, selectRestaurantAction } from "./presentation/actions";
export { requireRestaurantContext } from "./presentation/restaurant-context";
export { ACTIVE_RESTAURANT_COOKIE, writeActiveRestaurantCookie, clearActiveRestaurantCookie } from "./infrastructure/active-restaurant-cookie";

export async function getRestaurantWorkspace() {
  const actor = await requireTenantAdmin();
  return loadRestaurantWorkspace(actor.organizationId, (await cookies()).get(ACTIVE_RESTAURANT_COOKIE)?.value);
}

