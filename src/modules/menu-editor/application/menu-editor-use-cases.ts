import { z } from "zod";
import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import {
  createMenuProjectSchema,
  profileSchema,
  publishDocumentSchema,
  saveDocumentSchema,
  type CanvasDocumentV1,
  type CreateMenuProjectCommand,
  type MenuAssetKind,
  type PublishDocumentCommand,
  type RestaurantProfile,
  type SaveDocumentCommand,
} from "../contracts";
import {
  documentAssetIds,
  documentBackgroundImageAssetIds,
  documentFontAssetIds,
  documentImageAssetIds,
  documentModalAssetIds,
  validateCanvasDocument,
} from "../domain/document-policy";
import type { MenuEditorRepository } from "./ports";

const RESERVED_MENU_SLUGS = new Set(["_next", "admin", "api", "login", "m", "superadmin"]);

export function createMenuEditorUseCases(repository: MenuEditorRepository) {
  return {
    listProjects(tenantId: string) {
      return repository.listProjects(z.string().min(1).parse(tenantId));
    },

    async getProject(tenantId: string, projectId: string) {
      const tid = z.string().min(1).parse(tenantId);
      const pid = z.string().min(1).parse(projectId);
      const project = await repository.getProject(tid, pid);
      if (!project) throw new NotFoundError("Menu project");
      return project;
    },

    async getPrimaryProject(tenantId: string, fallback: CanvasDocumentV1) {
      const tid = z.string().min(1).parse(tenantId);
      return (await repository.getPrimaryProject(tid)) ?? repository.ensurePrimaryProject(tid, fallback);
    },

    async createProject(tenantId: string, input: CreateMenuProjectCommand, document: CanvasDocumentV1) {
      const tid = z.string().min(1).parse(tenantId);
      const command = createMenuProjectSchema.parse(input);
      if (RESERVED_MENU_SLUGS.has(command.slug)) throw new ConflictError("Ese slug está reservado.");
      if (await repository.isSlugTaken(command.slug)) throw new ConflictError("Ya existe un menú con ese slug.");
      return repository.createProject(tid, command, validateCanvasDocument(document));
    },

    async deleteProjects(tenantId: string, projectIds: string[]) {
      const tid = z.string().min(1).parse(tenantId);
      const ids = z.array(z.string().min(1)).min(1).parse(projectIds);
      return repository.deleteProjects(tid, [...new Set(ids)]);
    },

    async deleteAllProjects(tenantId: string) {
      const tid = z.string().min(1).parse(tenantId);
      const menus = await repository.listProjects(tid);
      if (menus.length === 0) return { deletedIds: [] as string[], remainingCount: 0 };
      return repository.deleteProjects(tid, menus.map((menu) => menu.id));
    },

    async saveDraft(tenantId: string, projectId: string, input: SaveDocumentCommand) {
      const tid = z.string().min(1).parse(tenantId);
      const pid = z.string().min(1).parse(projectId);
      const command = saveDocumentSchema.parse(input);
      const document = validateCanvasDocument(command.document);
      await validateReferencedAssets(repository, tid, document);
      return repository.saveDraft(tid, pid, command.baseRevision, document);
    },

    async publish(tenantId: string, projectId: string, input: PublishDocumentCommand) {
      const tid = z.string().min(1).parse(tenantId);
      const pid = z.string().min(1).parse(projectId);
      const command = publishDocumentSchema.parse(input);
      const document = validateCanvasDocument(command.document);
      await validateReferencedAssets(repository, tid, document);
      return repository.publish(tid, pid, command.baseRevision, document);
    },

    listAssets(tenantId: string, kind?: MenuAssetKind) {
      return repository.listAssets(z.string().min(1).parse(tenantId), kind);
    },

    createAsset(tenantId: string, input: Parameters<MenuEditorRepository["createAsset"]>[0]) {
      if (input.tenantId !== tenantId) throw new BadRequestError("Tenant inválido");
      return repository.createAsset({ ...input, tenantId: z.string().min(1).parse(tenantId) });
    },

    deleteAsset(tenantId: string, assetId: string) {
      return repository.deleteAsset(z.string().min(1).parse(tenantId), z.string().min(1).parse(assetId));
    },

    getAsset(tenantId: string, assetId: string, scope: "private" | "published", projectId?: string) {
      return repository.getAsset(
        z.string().min(1).parse(tenantId),
        z.string().min(1).parse(assetId),
        scope,
        projectId ? z.string().min(1).parse(projectId) : undefined,
      );
    },

    getProfile(tenantId: string, projectId: string) {
      return repository.getProfile(z.string().min(1).parse(tenantId), z.string().min(1).parse(projectId));
    },

    updateProfile(tenantId: string, projectId: string, input: RestaurantProfile) {
      return repository.updateProfile(
        z.string().min(1).parse(tenantId),
        z.string().min(1).parse(projectId),
        profileSchema.parse(input),
      );
    },

    getTenantMultiMenuEnabled(tenantId: string) {
      return repository.getTenantMultiMenuEnabled(z.string().min(1).parse(tenantId));
    },

    getTenantMenuQuota(tenantId: string) {
      return repository.getTenantMenuQuota(z.string().min(1).parse(tenantId));
    },
  };
}

async function validateReferencedAssets(repository: MenuEditorRepository, tenantId: string, document: CanvasDocumentV1) {
  const ids = documentAssetIds(document);
  if (!ids.size) return;
  const assets = await repository.listAssets(tenantId);
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  for (const id of ids) {
    const asset = byId.get(id);
    if (!asset) throw new NotFoundError("Asset");
    if (documentImageAssetIds(document).has(id) && asset.kind !== "IMAGE") throw new BadRequestError("El objeto de imagen referencia una fuente.");
    if (documentFontAssetIds(document).has(id) && asset.kind !== "FONT") throw new BadRequestError("El texto referencia una imagen.");
    if (documentModalAssetIds(document).has(id) && asset.kind !== "IMAGE" && asset.kind !== "VIDEO") {
      throw new BadRequestError("El modal del texto referencia un asset incompatible.");
    }
    if (documentBackgroundImageAssetIds(document).has(id) && asset.kind !== "IMAGE") {
      throw new BadRequestError("El fondo del rectángulo debe referenciar una imagen.");
    }
  }
}
