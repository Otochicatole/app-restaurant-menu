import { createHash } from "node:crypto";
import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import { enqueueAssetCleanup } from "@/platform/storage/asset-cleanup-queue";
import type { CanvasDocumentV1, MenuAssetKind, MenuAssetView, MenuProjectView, RestaurantProfile } from "../contracts";
import { documentAssetIds, normalizeLegacyCanvasDocument, validateCanvasDocument } from "../domain/document-policy";
import type { MenuEditorRepository } from "../application/ports";

export class PrismaMenuEditorRepository implements MenuEditorRepository {
  async getProject(tenantId: string): Promise<MenuProjectView | null> {
    const project = await prisma.menuProject.findUnique({ where: { tenantId } });
    return project ? toProjectView(project) : null;
  }

  async ensureProject(tenantId: string, document: CanvasDocumentV1): Promise<MenuProjectView> {
    const project = await prisma.menuProject.upsert({
      where: { tenantId },
      create: { tenantId, draftJson: JSON.stringify(document), schemaVersion: document.schemaVersion },
      update: {},
    });
    return toProjectView(project);
  }

  async saveDraft(tenantId: string, baseRevision: number, document: CanvasDocumentV1): Promise<MenuProjectView> {
    const project = await prisma.$transaction(async (transaction) => {
      const current = await transaction.menuProject.findUnique({ where: { tenantId } });
      if (!current) throw new NotFoundError("Menu project");
      const updated = await transaction.menuProject.updateMany({
        where: { tenantId, draftRevision: baseRevision },
        data: { draftJson: JSON.stringify(document), draftRevision: { increment: 1 }, schemaVersion: document.schemaVersion },
      });
      if (updated.count !== 1) throw new ConflictError("El documento cambió en otra pestaña.");
      await replaceReferences(transaction, tenantId, current.id, document, "DRAFT");
      return transaction.menuProject.findUniqueOrThrow({ where: { tenantId } });
    });
    return toProjectView(project);
  }

  async publish(tenantId: string, baseRevision: number): Promise<MenuProjectView> {
    const project = await prisma.$transaction(async (transaction) => {
      const current = await transaction.menuProject.findUnique({ where: { tenantId } });
      if (!current) throw new NotFoundError("Menu project");
      if (current.draftRevision !== baseRevision) throw new ConflictError("Guardá el borrador más reciente antes de publicar.");
      const document = validateCanvasDocument(normalizeLegacyCanvasDocument(JSON.parse(current.draftJson)));
      await replaceReferences(transaction, tenantId, current.id, document, "PUBLISHED");
      return transaction.menuProject.update({
        where: { tenantId },
        data: {
          publishedJson: JSON.stringify(document),
          publishedRevision: current.draftRevision,
          publishedAt: new Date(),
        },
      });
    });
    return toProjectView(project);
  }

  async listAssets(tenantId: string, kind?: MenuAssetKind): Promise<MenuAssetView[]> {
    const assets = await prisma.menuAsset.findMany({
      where: { tenantId, ...(kind ? { kind } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return assets.map(toAssetView);
  }

  async createAsset(input: { tenantId: string; kind: MenuAssetKind; name: string; mimeType: string; byteSize: number; checksum: string; storageKey: string; width?: number; height?: number }): Promise<MenuAssetView> {
    const [tenant, usage] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: input.tenantId }, select: { assetQuotaBytes: true } }),
      prisma.menuAsset.aggregate({ where: { tenantId: input.tenantId }, _sum: { byteSize: true } }),
    ]);
    if (!tenant) throw new NotFoundError("Tenant");
    if ((usage._sum.byteSize ?? 0) + input.byteSize > tenant.assetQuotaBytes) throw new BadRequestError("Se alcanzó la cuota de archivos del restaurante.");
    const asset = await prisma.menuAsset.create({ data: input });
    return toAssetView(asset);
  }

  async deleteAsset(tenantId: string, assetId: string): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const asset = await transaction.menuAsset.findFirst({ where: { id: assetId, tenantId } });
      if (!asset) throw new NotFoundError("Asset");
      const references = await transaction.menuAssetReference.count({ where: { tenantId, assetId } });
      if (references > 0) throw new ConflictError("No podés eliminar un asset que usa el menú.");
      const templateReferences = await transaction.menuTemplateAssetReference.count({ where: { tenantId, assetId } });
      if (templateReferences > 0) throw new ConflictError("No podés eliminar un asset usado por una plantilla privada.");
      await enqueueAssetCleanup(asset.storageKey, transaction);
      await transaction.menuAsset.delete({ where: { id: asset.id } });
    });
  }

  async getAsset(tenantId: string, assetId: string, scope: "private" | "published") {
    const asset = await prisma.menuAsset.findFirst({
      where: {
        id: assetId,
        tenantId,
        ...(scope === "published" ? { references: { some: { tenantId, scope: "PUBLISHED" } } } : {}),
      },
    });
    return asset ? { storageKey: asset.storageKey, mimeType: asset.mimeType, name: asset.name } : null;
  }

  async getProfile(tenantId: string): Promise<RestaurantProfile> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, publicDescription: true } });
    if (!tenant) throw new NotFoundError("Tenant");
    return tenant;
  }

  async updateProfile(tenantId: string, profile: RestaurantProfile): Promise<RestaurantProfile> {
    return prisma.$transaction(async (transaction) => {
      return transaction.tenant.update({ where: { id: tenantId }, data: profile, select: { name: true, publicDescription: true } });
    });
  }
}

function toProjectView(project: { draftJson: string; draftRevision: number; publishedJson: string | null; publishedRevision: number | null; publishedAt: Date | null }): MenuProjectView {
  const document = validateCanvasDocument(normalizeLegacyCanvasDocument(JSON.parse(project.draftJson)));
  return {
    document,
    draftRevision: project.draftRevision,
    publishedRevision: project.publishedRevision,
    publishedAt: project.publishedAt?.toISOString() ?? null,
    hasPublishedDocument: Boolean(project.publishedJson),
  };
}

function toAssetView(asset: { id: string; kind: string; name: string; mimeType: string; byteSize: number; width: number | null; height: number | null; fontFamily: string | null; createdAt: Date }): MenuAssetView {
  return {
    id: asset.id,
    kind: asset.kind as MenuAssetKind,
    name: asset.name,
    mimeType: asset.mimeType,
    byteSize: asset.byteSize,
    width: asset.width,
    height: asset.height,
    fontFamily: asset.fontFamily,
    url: `/api/editor/assets/${encodeURIComponent(asset.id)}/file`,
    createdAt: asset.createdAt.toISOString(),
  };
}

async function replaceReferences(
  transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  tenantId: string,
  projectId: string,
  document: CanvasDocumentV1,
  scope: "DRAFT" | "PUBLISHED",
) {
  const ids = [...documentAssetIds(document)];
  if (ids.length) {
    const assets = await transaction.menuAsset.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } });
    if (assets.length !== ids.length) throw new NotFoundError("Asset");
  }
  await transaction.menuAssetReference.deleteMany({ where: { tenantId, projectId, scope } });
  if (ids.length) {
    await transaction.menuAssetReference.createMany({
      data: ids.map((assetId) => ({ tenantId, projectId, assetId, scope })),
    });
  }
}

export function checksum(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}
