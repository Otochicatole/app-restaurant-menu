import { prisma } from "@/platform/database/prisma";
import { ConflictError, NotFoundError } from "@/platform/application/errors";
import { enqueueAssetCleanup } from "@/platform/storage/asset-cleanup-queue";
import { canvasDocumentSchema } from "@/modules/menu-editor/contracts";
import type { CreateRestaurantCommand, RestaurantWorkspace } from "../contracts";

export async function loadRestaurantWorkspace(organizationId: string, selectedId?: string): Promise<RestaurantWorkspace> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId }, include: { restaurants: { orderBy: { createdAt: "asc" } } },
  });
  if (!organization) throw new NotFoundError("Organización");
  const restaurants = organization.restaurants;
  const active = restaurants.find((restaurant) => restaurant.id === selectedId && restaurant.status === "ACTIVE")
    ?? (restaurants.length === 1 && restaurants[0].status === "ACTIVE" ? restaurants[0] : null);
  return { organizationId, organizationName: organization.name, restaurants, maxRestaurants: organization.maxRestaurants,
    canCreateRestaurant: restaurants.length < organization.maxRestaurants, active };
}

export async function createRestaurant(organizationId: string, command: CreateRestaurantCommand) {
  try {
    return await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({ where: { id: organizationId } });
      if (!organization || organization.status !== "ACTIVE") throw new NotFoundError("Organización");
      const count = await tx.restaurant.count({ where: { organizationId } });
      if (count >= organization.maxRestaurants) throw new ConflictError("Alcanzaste el cupo de restaurantes de la organización.");
      const document = canvasDocumentSchema.parse({ schemaVersion: 1, background: "#FFFFFF", initialViewport: { x: 0, y: 0, width: 1240, height: 900 }, canvasBounds: { x: 0, y: 0, width: 1240, height: 900 }, nodes: [], groups: [] });
      return tx.restaurant.create({ data: { organizationId, ...command, landingSlug: command.slug,
        menuProject: { create: { name: command.name, slug: command.slug, publicDescription: command.publicDescription,
          isPrimary: true, draftJson: JSON.stringify(document), schemaVersion: 1 } } } });
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "P2002") throw new ConflictError("Ya existe un restaurante con esa URL pública.");
    throw error;
  }
}

export async function deleteRestaurants(organizationId: string, ids: string[]) {
  const uniqueIds = [...new Set(ids)];
  return prisma.$transaction(async (tx) => {
    const restaurants = await tx.restaurant.findMany({ where: { organizationId, id: { in: uniqueIds } }, select: { id: true } });
    if (restaurants.length !== uniqueIds.length) throw new NotFoundError("Restaurante");
    const templateAssets = await tx.menuTemplateAsset.findMany({
      where: { template: { restaurantId: { in: uniqueIds } } },
      select: { storageKey: true },
    });
    for (const asset of templateAssets) await enqueueAssetCleanup(asset.storageKey, tx);
    for (const restaurant of restaurants) await enqueueAssetCleanup(`restaurants/${restaurant.id}`, tx, { deletePrefix: true });
    await tx.restaurant.deleteMany({ where: { organizationId, id: { in: uniqueIds } } });
    return restaurants.map((restaurant) => restaurant.id);
  });
}
