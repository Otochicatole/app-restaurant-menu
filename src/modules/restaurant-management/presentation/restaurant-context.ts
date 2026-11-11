import "server-only";
import { cache } from "react";
import { prisma } from "@/platform/database/prisma";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";
import { assertRestaurantAccess } from "../application/restaurant-policy";
import type { RestaurantContext } from "../contracts";

const loadRestaurantById = cache(async (restaurantId: string) =>
  restaurantId ? prisma.restaurant.findUnique({ where: { id: restaurantId }, include: { organization: true } }) : null,
);

export async function requireRestaurantContext(restaurantId: string, options: { allowSuperAdmin?: boolean } = {}): Promise<RestaurantContext> {
  const actor = await requireAuthenticatedAccount();
  const restaurant = await loadRestaurantById(restaurantId);
  assertRestaurantAccess(actor, restaurant, restaurant?.organization.status ?? "SUSPENDED", options.allowSuperAdmin);
  return { organizationId: restaurant.organizationId, restaurantId: restaurant.id, organizationName: restaurant.organization.name, restaurant };
}
