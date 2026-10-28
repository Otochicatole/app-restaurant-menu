import "server-only";
import { prisma } from "@/platform/database/prisma";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";
import { assertRestaurantAccess } from "../application/restaurant-policy";
import type { RestaurantContext } from "../contracts";

export async function requireRestaurantContext(restaurantId: string, options: { allowSuperAdmin?: boolean } = {}): Promise<RestaurantContext> {
  const actor = await requireAuthenticatedAccount();
  const restaurant = restaurantId ? await prisma.restaurant.findUnique({ where: { id: restaurantId }, include: { organization: true } }) : null;
  assertRestaurantAccess(actor, restaurant, restaurant?.organization.status ?? "SUSPENDED", options.allowSuperAdmin);
  return { organizationId: restaurant.organizationId, restaurantId: restaurant.id, organizationName: restaurant.organization.name, restaurant };
}
