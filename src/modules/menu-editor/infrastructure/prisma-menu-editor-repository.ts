import { createHash } from "node:crypto";
import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import { enqueueAssetCleanup } from "@/platform/storage/asset-cleanup-queue";
import type {
  CanvasDocumentV1,
  CreateMenuProjectCommand,
  MenuAssetKind,
  MenuAssetView,
  MenuProjectSummary,
  MenuProjectView,
  RestaurantProfile,
} from "../contracts";
import { documentAssetIds, normalizeLegacyCanvasDocument, validateCanvasDocument } from "../domain/document-policy";
import type { MenuEditorRepository } from "../application/ports";

export class PrismaMenuEditorRepository implements MenuEditorRepository {
  async listProjects(tenantId: string): Promise<MenuProjectSummary[]> {
    const projects = await prisma.menuProject.findMany({
      where: { tenantId },
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

  async getProject(tenantId: string, projectId: string): Promise<MenuProjectView | null> {
    const project = await prisma.menuProject.findFirst({ where: { id: projectId, tenantId } });
    return project ? toProjectView(project) : null;
  }

  async getPrimaryProject(tenantId: string): Promise<MenuProjectView | null> {
    const project = await prisma.menuProject.findFirst({ where: { tenantId, isPrimary: true } });
    return project ? toProjectView(project) : null;
  }

  async ensurePrimaryProject(tenantId: string, document: CanvasDocumentV1): Promise<MenuProjectView> {
    const existing = await prisma.menuProject.findFirst({ where: { tenantId, isPrimary: true } });
    if (existing) return toProjectView(existing);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true, publicDescription: true },
    });
    if (!tenant) throw new NotFoundError("Tenant");

    const project = await prisma.menuProject.create({
      data: {
        tenantId,
        name: tenant.name,
        slug: tenant.slug,
        publicDescription: tenant.publicDescription,
        isPrimary: true,
        draftJson: JSON.stringify(document),
        schemaVersion: document.schemaVersion,
      },
    });
    return toProjectView(project);
  }

  async createProject(tenantId: string, input: CreateMenuProjectCommand, document: CanvasDocumentV1): Promise<MenuProjectView> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { multiMenuEnabled: true, maxMenus: true },
    });
    if (!tenant) throw new NotFoundError("Tenant");
    if (!tenant.multiMenuEnabled) throw new BadRequestError("Esta cuenta no tiene habilitados varios menús.");
    const currentMenus = await prisma.menuProject.count({ where: { tenantId } });
    if (currentMenus >= tenant.maxMenus) {
      throw new BadRequestError(`Esta cuenta ya alcanzó el cupo de ${tenant.maxMenus} menús.`);
    }

    try {
      const project = await prisma.menuProject.create({
        data: {
          tenantId,
          name: input.name,
          slug: input.slug,
          publicDescription: input.publicDescription,
          isPrimary: false,
          draftJson: JSON.stringify(document),
          schemaVersion: document.schemaVersion,
        },
      });
      return toProjectView(project);
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new ConflictError("Ya existe un menú con ese slug.");
      throw error;
    }
  }

  async deleteProjects(tenantId: string, projectIds: string[]): Promise<{ deletedIds: string[]; remainingCount: number }> {
    const uniqueIds = [...new Set(projectIds)];
    if (uniqueIds.length === 0) return { deletedIds: [], remainingCount: await prisma.menuProject.count({ where: { tenantId } }) };

    return prisma.$transaction(async (transaction) => {
      const owned = await transaction.menuProject.findMany({
        where: { tenantId, id: { in: uniqueIds } },
        select: { id: true },
      });
      if (owned.length !== uniqueIds.length) throw new NotFoundError("Menu project");

      const deletedIds = owned.map((project) => project.id);
      await transaction.menuProject.deleteMany({ where: { tenantId, id: { in: deletedIds } } });

      const remaining = await transaction.menuProject.findMany({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, publicDescription: true, isPrimary: true },
      });

      if (remaining.length > 0 && !remaining.some((project) => project.isPrimary)) {
        const nextPrimary = remaining[0]!;
        await transaction.menuProject.update({
          where: { id: nextPrimary.id },
          data: { isPrimary: true },
        });
        await transaction.tenant.update({
          where: { id: tenantId },
          data: { name: nextPrimary.name, publicDescription: nextPrimary.publicDescription },
        });
      }

      return { deletedIds, remainingCount: remaining.length };
    });
  }

  async saveDraft(tenantId: string, projectId: string, baseRevision: number, document: CanvasDocumentV1): Promise<MenuProjectView> {
    const project = await prisma.$transaction(async (transaction) => {
      const current = await transaction.menuProject.findFirst({ where: { id: projectId, tenantId } });
      if (!current) throw new NotFoundError("Menu project");
      const updated = await transaction.menuProject.updateMany({
        where: { id: projectId, tenantId, draftRevision: baseRevision },
        data: { draftJson: JSON.stringify(document), draftRevision: { increment: 1 }, schemaVersion: document.schemaVersion },
      });
      if (updated.count !== 1) throw new ConflictError("El documento cambió en otra pestaña.");
      await replaceReferences(transaction, tenantId, current.id, document, "DRAFT");
      return transaction.menuProject.findFirstOrThrow({ where: { id: projectId, tenantId } });
    });
    return toProjectView(project);
  }

  async publish(tenantId: string, projectId: string, baseRevision: number, document: CanvasDocumentV1): Promise<MenuProjectView> {
    const project = await prisma.$transaction(async (transaction) => {
      const current = await transaction.menuProject.findFirst({ where: { id: projectId, tenantId } });
      if (!current) throw new NotFoundError("Menu project");
      if (current.draftRevision !== baseRevision) throw new ConflictError("Guardá el borrador más reciente antes de publicar.");
      const draftJson = JSON.stringify(document);
      const draftChanged = current.draftJson !== draftJson;
      const nextRevision = current.draftRevision + (draftChanged ? 1 : 0);
      await replaceReferences(transaction, tenantId, current.id, document, "DRAFT");
      await replaceReferences(transaction, tenantId, current.id, document, "PUBLISHED");
      const updated = await transaction.menuProject.updateMany({
        where: { id: projectId, tenantId, draftRevision: baseRevision },
        data: {
          ...(draftChanged ? { draftJson, draftRevision: { increment: 1 }, schemaVersion: document.schemaVersion } : {}),
          publishedJson: draftJson,
          publishedRevision: nextRevision,
          publishedAt: new Date(),
        },
      });
      if (updated.count !== 1) throw new ConflictError("El documento cambió en otra pestaña.");
      return transaction.menuProject.findFirstOrThrow({ where: { id: projectId, tenantId } });
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

  async createAsset(input: {
    tenantId: string;
    kind: MenuAssetKind;
    name: string;
    mimeType: string;
    byteSize: number;
    checksum: string;
    storageKey: string;
    width?: number;
    height?: number;
  }): Promise<MenuAssetView> {
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

  async getAsset(tenantId: string, assetId: string, scope: "private" | "published", projectId?: string) {
    if (scope === "published") {
      if (!projectId) throw new BadRequestError("Menú requerido");
      const project = await prisma.menuProject.findFirst({
        where: { id: projectId, tenantId },
        select: { publishedJson: true },
      });
      if (!project?.publishedJson) return null;
      const publishedDocument = validateCanvasDocument(normalizeLegacyCanvasDocument(JSON.parse(project.publishedJson)));
      if (!documentAssetIds(publishedDocument).has(assetId)) return null;
    }
    const asset = await prisma.menuAsset.findFirst({
      where: {
        id: assetId,
        tenantId,
      },
    });
    return asset ? { storageKey: asset.storageKey, mimeType: asset.mimeType, name: asset.name } : null;
  }

  async getProfile(tenantId: string, projectId: string): Promise<RestaurantProfile & { slug: string }> {
    const project = await prisma.menuProject.findFirst({
      where: { id: projectId, tenantId },
      select: { name: true, publicDescription: true, slug: true },
    });
    if (!project) throw new NotFoundError("Menu project");
    return project;
  }

  async updateProfile(tenantId: string, projectId: string, profile: RestaurantProfile): Promise<RestaurantProfile & { slug: string }> {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.menuProject.findFirst({ where: { id: projectId, tenantId } });
      if (!current) throw new NotFoundError("Menu project");
      const project = await transaction.menuProject.update({
        where: { id: current.id },
        data: { name: profile.name, publicDescription: profile.publicDescription },
        select: { name: true, publicDescription: true, slug: true, isPrimary: true },
      });
      if (project.isPrimary) {
        await transaction.tenant.update({
          where: { id: tenantId },
          data: { name: profile.name, publicDescription: profile.publicDescription },
        });
      }
      return { name: project.name, publicDescription: project.publicDescription, slug: project.slug };
    });
  }

  async isSlugTaken(slug: string, excludeProjectId?: string): Promise<boolean> {
    const existing = await prisma.menuProject.findFirst({
      where: {
        slug,
        ...(excludeProjectId ? { NOT: { id: excludeProjectId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async getTenantMultiMenuEnabled(tenantId: string): Promise<boolean> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { multiMenuEnabled: true } });
    if (!tenant) throw new NotFoundError("Tenant");
    return tenant.multiMenuEnabled;
  }

  async getTenantMenuQuota(tenantId: string): Promise<{ multiMenuEnabled: boolean; maxMenus: number; currentMenus: number }> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { multiMenuEnabled: true, maxMenus: true },
    });
    if (!tenant) throw new NotFoundError("Tenant");
    const currentMenus = await prisma.menuProject.count({ where: { tenantId } });
    return {
      multiMenuEnabled: tenant.multiMenuEnabled,
      maxMenus: tenant.multiMenuEnabled ? tenant.maxMenus : 1,
      currentMenus,
    };
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

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "P2002";
}

export function checksum(buffer: Uint8Array): string {
  return createHash("sha256").update(buffer).digest("hex");
}
