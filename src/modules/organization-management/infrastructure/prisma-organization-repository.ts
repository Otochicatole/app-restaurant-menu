import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/platform/database/prisma";
import { ConflictError, NotFoundError } from "@/platform/application/errors";
import { enqueueAssetCleanup } from "@/platform/storage/asset-cleanup-queue";
import { canvasDocumentSchema } from "@/modules/menu-editor/contracts";
import { assertRestaurantLimit, type OrganizationRepository } from "../application/organization-use-cases";
import type { CreateOrganizationCommand, UpdateOrganizationCommand } from "../contracts";

const include = { admin: { select: { email: true, lastLoginAt: true } }, restaurants: { orderBy: { createdAt: "asc" as const } } } satisfies Prisma.OrganizationInclude;
type Row = Prisma.OrganizationGetPayload<{ include: typeof include }>;
function toItem(row: Row) {
  return { id: row.id, name: row.name, slug: row.slug, status: row.status, maxRestaurants: row.maxRestaurants,
    email: row.admin?.email ?? "", lastLoginAt: row.admin?.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(), restaurants: row.restaurants };
}
function translateUnique(error: unknown): never {
  if (error instanceof Error && "code" in error && error.code === "P2002") throw new ConflictError("Ya existe una organización, un restaurante o una cuenta con esos datos.");
  throw error;
}
export class PrismaOrganizationRepository implements OrganizationRepository {
  async list() { return (await prisma.organization.findMany({ include, orderBy: { createdAt: "desc" } })).map(toItem); }
  async create(command: CreateOrganizationCommand & { passwordHash: string }) {
    try {
      const document = canvasDocumentSchema.parse({ schemaVersion: 1, background: "#FFFFFF", initialViewport: { x: 0, y: 0, width: 1240, height: 900 }, canvasBounds: { x: 0, y: 0, width: 1240, height: 900 }, nodes: [], groups: [] });
      return toItem(await prisma.organization.create({ data: {
        name: command.name, slug: command.slug,
        admin: { create: { email: command.email, passwordHash: command.passwordHash, role: "TENANT_ADMIN", mustChangePassword: true } },
        restaurants: { create: { name: command.restaurantName, slug: command.slug, landingSlug: command.slug,
          menuProject: { create: { name: command.restaurantName, slug: command.slug, isPrimary: true, draftJson: JSON.stringify(document) } } } },
      }, include }));
    } catch (error) { return translateUnique(error); }
  }
  async update(command: UpdateOrganizationCommand) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.organization.findUnique({ where: { id: command.id }, include: { admin: true, _count: { select: { restaurants: true } } } });
        if (!existing?.admin) throw new NotFoundError("Organización");
        assertRestaurantLimit(command.maxRestaurants, existing._count.restaurants);
        await tx.organization.update({ where: { id: command.id }, data: { name: command.name, maxRestaurants: command.maxRestaurants } });
        await tx.admin.update({ where: { id: existing.admin.id }, data: { email: command.email } });
        if (command.email !== existing.admin.email) await tx.session.updateMany({ where: { adminId: existing.admin.id, revoked: false }, data: { revoked: true } });
        return toItem(await tx.organization.findUniqueOrThrow({ where: { id: command.id }, include }));
      });
    } catch (error) { return translateUnique(error); }
  }
  async setStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({ where: { id }, include: { admin: true } });
      if (!organization) throw new NotFoundError("Organización");
      await tx.organization.update({ where: { id }, data: { status } });
      if (status === "SUSPENDED" && organization.admin) await tx.session.updateMany({ where: { adminId: organization.admin.id }, data: { revoked: true } });
    });
  }
  async replacePassword(id: string, passwordHash: string) {
    await prisma.$transaction(async (tx) => {
      const admin = await tx.admin.findUnique({ where: { organizationId: id } });
      if (!admin) throw new NotFoundError("Cuenta");
      await tx.admin.update({ where: { id: admin.id }, data: { passwordHash, mustChangePassword: true } });
      await tx.session.updateMany({ where: { adminId: admin.id }, data: { revoked: true } });
    });
  }
  async delete(id: string, confirmationSlug: string) {
    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({ where: { id }, include: { restaurants: { select: { id: true } } } });
      if (!organization) throw new NotFoundError("Organización");
      if (organization.slug !== confirmationSlug) throw new ConflictError("La confirmación no coincide con el identificador de la organización.");
      const templateAssets = await tx.menuTemplateAsset.findMany({
        where: { template: { restaurantId: { in: organization.restaurants.map((restaurant) => restaurant.id) } } },
        select: { storageKey: true },
      });
      for (const asset of templateAssets) await enqueueAssetCleanup(asset.storageKey, tx);
      for (const restaurant of organization.restaurants) await enqueueAssetCleanup(`restaurants/${restaurant.id}`, tx, { deletePrefix: true });
      await tx.organization.delete({ where: { id } });
    });
  }
}
