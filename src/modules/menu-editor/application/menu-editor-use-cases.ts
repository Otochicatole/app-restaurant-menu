import { z } from "zod";
import { BadRequestError, NotFoundError } from "@/platform/application/errors";
import { profileSchema, publishDocumentSchema, saveDocumentSchema, type CanvasDocumentV1, type MenuAssetKind, type PublishDocumentCommand, type RestaurantProfile, type SaveDocumentCommand } from "../contracts";
import { documentAssetIds, documentFontAssetIds, documentImageAssetIds, documentModalAssetIds, validateCanvasDocument } from "../domain/document-policy";
import type { MenuEditorRepository } from "./ports";

export function createMenuEditorUseCases(repository: MenuEditorRepository) {
  return {
    async getProject(tenantId: string, fallback: CanvasDocumentV1) {
      const id = z.string().min(1).parse(tenantId);
      return (await repository.getProject(id)) ?? repository.ensureProject(id, fallback);
    },
    async saveDraft(tenantId: string, input: SaveDocumentCommand) {
      const id = z.string().min(1).parse(tenantId);
      const command = saveDocumentSchema.parse(input);
      const document = validateCanvasDocument(command.document);
      await validateReferencedAssets(repository, id, document);
      return repository.saveDraft(id, command.baseRevision, document);
    },
    async publish(tenantId: string, input: PublishDocumentCommand) {
      const id = z.string().min(1).parse(tenantId);
      const command = publishDocumentSchema.parse(input);
      const document = validateCanvasDocument(command.document);
      await validateReferencedAssets(repository, id, document);
      return repository.publish(id, command.baseRevision, document);
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
    getAsset(tenantId: string, assetId: string, scope: "private" | "published") {
      return repository.getAsset(z.string().min(1).parse(tenantId), z.string().min(1).parse(assetId), scope);
    },
    getProfile(tenantId: string) {
      return repository.getProfile(z.string().min(1).parse(tenantId));
    },
    updateProfile(tenantId: string, input: RestaurantProfile) {
      return repository.updateProfile(z.string().min(1).parse(tenantId), profileSchema.parse(input));
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
    if (documentModalAssetIds(document).has(id) && asset.kind !== "IMAGE" && asset.kind !== "VIDEO") throw new BadRequestError("El modal del texto referencia un asset incompatible.");
  }
}
