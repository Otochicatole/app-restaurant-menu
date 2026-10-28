import { createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { withSqliteTransaction } from "@/platform/database/sqlite-transaction";
import { assertAssetQuota } from "./asset-quota";
import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import { enqueueAssetCleanup } from "@/platform/storage/asset-cleanup-queue";
import type {
  CanvasDocumentV1,
  MenuAssetKind,
  MenuAssetView,
  MenuProjectSummary,
  MenuProjectView,
  RestaurantProfile,
} from "../contracts";
import { documentAssetIds, normalizeLegacyCanvasDocument, validateCanvasDocument } from "../domain/document-policy";
import type { MenuEditorRepository } from "../application/ports";

export class PrismaMenuEditorRepository implements MenuEditorRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  async listProjects(restaurantId: string): Promise<MenuProjectSummary[]> {
    const projects = await this.client.menuProject.findMany({
      where: { restaurantId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        publicDescription: true,
        isPrimary: true,
        publishedJson: true,
      },
    });
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      publicDescription: project.publicDescription,
      isPrimary: project.isPrimary,
      hasPublishedDocument: Boolean(project.publishedJson),
    }));
  }

  async getProject(restaurantId: string, projectId: string): Promise<MenuProjectView | null> {
    const project = await this.client.menuProject.findFirst({ where: { id: projectId, restaurantId } });
    return project ? toProjectView(project) : null;
  }

  async getPrimaryProject(restaurantId: string): Promise<MenuProjectView | null> {
    const project = await this.client.menuProject.findFirst({ where: { restaurantId } });
    return project ? toProjectView(project) : null;
  }

  async saveDraft(restaurantId: string, projectId: string, baseRevision: number, document: CanvasDocumentV1): Promise<MenuProjectView> {
    const project = await this.client.$transaction(async (transaction) => {
      const current = await transaction.menuProject.findFirst({ where: { id: projectId, restaurantId } });
      if (!current) throw new NotFoundError("Menu project");
      const updated = await transaction.menuProject.updateMany({
        where: { id: projectId, restaurantId, draftRevision: baseRevision },
        data: { draftJson: JSON.stringify(document), draftRevision: { increment: 1 }, schemaVersion: document.schemaVersion },
      });
      if (updated.count !== 1) throw new ConflictError("El documento cambió en otra pestaña.");
      await replaceReferences(transaction, restaurantId, current.id, document, "DRAFT");
      return transaction.menuProject.findFirstOrThrow({ where: { id: projectId, restaurantId } });
    });
    return toProjectView(project);
  }

  async publish(restaurantId: string, projectId: string, baseRevision: number, document: CanvasDocumentV1): Promise<MenuProjectView> {
    const project = await this.client.$transaction(async (transaction) => {
      const current = await transaction.menuProject.findFirst({ where: { id: projectId, restaurantId } });
      if (!current) throw new NotFoundError("Menu project");
      if (current.draftRevision !== baseRevision) throw new ConflictError("Guardá el borrador más reciente antes de publicar.");
      const draftJson = JSON.stringify(document);
      const draftChanged = current.draftJson !== draftJson;
      const nextRevision = current.draftRevision + (draftChanged ? 1 : 0);
      await replaceReferences(transaction, restaurantId, current.id, document, "DRAFT");
      await replaceReferences(transaction, restaurantId, current.id, document, "PUBLISHED");
      const updated = await transaction.menuProject.updateMany({
        where: { id: projectId, restaurantId, draftRevision: baseRevision },
        data: {
          ...(draftChanged ? { draftJson, draftRevision: { increment: 1 }, schemaVersion: document.schemaVersion } : {}),
          publishedJson: draftJson,
          publishedRevision: nextRevision,
          publishedAt: new Date(),
        },
      });
      if (updated.count !== 1) throw new ConflictError("El documento cambió en otra pestaña.");
      return transaction.menuProject.findFirstOrThrow({ where: { id: projectId, restaurantId } });
    });
    return toProjectView(project);
  }

  async listAssets(restaurantId: string, kind?: MenuAssetKind): Promise<MenuAssetView[]> {
    const assets = await this.client.menuAsset.findMany({
      where: { restaurantId, ...(kind ? { kind } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return assets.map(toAssetView);
  }

  async createAsset(input: {
    restaurantId: string;
    kind: MenuAssetKind;
    name: string;
    mimeType: string;
    byteSize: number;
    checksum: string;
    storageKey: string;
    width?: number;
    height?: number;
  }): Promise<MenuAssetView> {
    const asset = await withSqliteTransaction(this.client, async (transaction) => {
      await assertAssetQuota(transaction, input.restaurantId, input.byteSize);
      return transaction.menuAsset.create({ data: input });
    });
    return toAssetView(asset);
  }

  async deleteAsset(restaurantId: string, assetId: string): Promise<void> {
    await this.client.$transaction(async (transaction) => {
      const asset = await transaction.menuAsset.findFirst({ where: { id: assetId, restaurantId } });
      if (!asset) throw new NotFoundError("Asset");
      const references = await transaction.menuAssetReference.count({ where: { restaurantId, assetId } });
      if (references > 0) throw new ConflictError("No podés eliminar un asset que usa el menú.");
      const templateReferences = await transaction.menuTemplateAssetReference.count({ where: { restaurantId, assetId } });
      if (templateReferences > 0) throw new ConflictError("No podés eliminar un asset usado por una plantilla privada.");
      await enqueueAssetCleanup(asset.storageKey, transaction);
      await transaction.menuAsset.delete({ where: { id: asset.id } });
    });
  }

  async getAsset(restaurantId: string, assetId: string, scope: "private" | "published", projectId?: string) {
    if (scope === "published") {
      if (!projectId) throw new BadRequestError("Menú requerido");
      const project = await this.client.menuProject.findFirst({
        where: { id: projectId, restaurantId },
        select: { publishedJson: true },
      });
      if (!project?.publishedJson) return null;
      const publishedDocument = validateCanvasDocument(normalizeLegacyCanvasDocument(JSON.parse(project.publishedJson)));
      if (!documentAssetIds(publishedDocument).has(assetId)) return null;
    }
    const asset = await this.client.menuAsset.findFirst({
      where: {
        id: assetId,
        restaurantId,
      },
    });
    return asset ? { storageKey: asset.storageKey, mimeType: asset.mimeType, name: asset.name } : null;
  }

  async getProfile(restaurantId: string, projectId: string): Promise<RestaurantProfile> {
    const project = await this.client.menuProject.findFirst({ where: { id: projectId, restaurantId }, select: { restaurant: { select: { name: true, publicDescription: true, slug: true, landingSlug: true } } } });
    if (!project) throw new NotFoundError("Carta");
    return project.restaurant;
  }

  async updateProfile(restaurantId: string, projectId: string, profile: RestaurantProfile): Promise<RestaurantProfile> {
    try {
      return await this.client.$transaction(async (transaction) => {
        const current = await transaction.menuProject.findFirst({ where: { id: projectId, restaurantId } });
        if (!current) throw new NotFoundError("Carta");
        const restaurant = await transaction.restaurant.update({ where: { id: restaurantId }, data: profile, select: { name: true, publicDescription: true, slug: true, landingSlug: true } });
        await transaction.menuProject.update({ where: { id: current.id }, data: { name: profile.name, publicDescription: profile.publicDescription, slug: profile.slug } });
        return restaurant;
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new ConflictError("Ya existe un restaurante con ese slug.");
      throw error;
    }
  }

  async isSlugTaken(slug: string, excludeProjectId?: string, excludeRestaurantId?: string): Promise<boolean> {
    const [project, tenant] = await Promise.all([
      this.client.menuProject.findFirst({
        where: {
          slug,
          ...(excludeProjectId ? { NOT: { id: excludeProjectId } } : {}),
        },
        select: { id: true },
      }),
      this.client.restaurant.findFirst({
        where: {
          slug,
          ...(excludeRestaurantId ? { NOT: { id: excludeRestaurantId } } : {}),
        },
        select: { id: true },
      }),
    ]);
    return Boolean(project || tenant);
  }

}

function toProjectView(project: {
  id: string;
  name: string;
  slug: string;
  publicDescription: string;
  isPrimary: boolean;
  draftJson: string;
  draftRevision: number;
  publishedJson: string | null;
  publishedRevision: number | null;
  publishedAt: Date | null;
}): MenuProjectView {
  const document = validateCanvasDocument(normalizeLegacyCanvasDocument(JSON.parse(project.draftJson)));
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    publicDescription: project.publicDescription,
    isPrimary: project.isPrimary,
    document,
    draftRevision: project.draftRevision,
    publishedRevision: project.publishedRevision,
    publishedAt: project.publishedAt?.toISOString() ?? null,
    hasPublishedDocument: Boolean(project.publishedJson),
  };
}

function toAssetView(asset: {
  restaurantId: string;
  id: string;
  kind: string;
  name: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  fontFamily: string | null;
  createdAt: Date;
}): MenuAssetView {
  return {
    id: asset.id,
    kind: asset.kind as MenuAssetKind,
    name: asset.name,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    width: asset.width,
    height: asset.height,
    fontFamily: asset.kind === "FONT" ? `editor-font-${asset.id}` : asset.fontFamily,
    url: `/api/restaurants/${encodeURIComponent(asset.restaurantId)}/editor/assets/${encodeURIComponent(asset.id)}/file`,
    createdAt: asset.createdAt.toISOString(),
  };
}

async function replaceReferences(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  restaurantId: string,
  projectId: string,
  document: CanvasDocumentV1,
  scope: "DRAFT" | "PUBLISHED",
) {
  const ids = [...documentAssetIds(document)];
  if (ids.length) {
    const assets = await transaction.menuAsset.findMany({ where: { restaurantId, id: { in: ids } }, select: { id: true } });
    if (assets.length !== ids.length) throw new NotFoundError("Asset");
  }
  await transaction.menuAssetReference.deleteMany({ where: { restaurantId, projectId, scope } });
  if (ids.length) {
    await transaction.menuAssetReference.createMany({
      data: ids.map((assetId) => ({ restaurantId, projectId, assetId, scope })),
    });
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "P2002";
}

export function checksum(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}
