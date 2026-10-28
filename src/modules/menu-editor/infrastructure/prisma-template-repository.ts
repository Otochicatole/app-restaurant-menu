import { createHash, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { BlobStore } from "@/platform/storage/blob-store";
import { withSqliteTransaction } from "@/platform/database/sqlite-transaction";
import { assertAssetQuota, assetContentKey } from "./asset-quota";
import { ConflictError, NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import { blobStore } from "@/platform/storage";
import { enqueueAssetCleanup } from "@/platform/storage/asset-cleanup-queue";
import { documentAssetIds, validateCanvasDocument } from "../domain/document-policy";
import type { PortableTemplate, PortableTemplateAsset } from "../domain/template-bundle";
import { presetAsView, TEMPLATE_PRESETS } from "../domain/template-presets";
import type { CanvasDocumentV1, MenuAssetKind, MenuTemplateView, SuperadminTemplateList, SuperadminTemplateQuery, SuperadminTemplateView } from "../contracts";
import type { TemplateCreateInput, TemplateRepository } from "../application/template-ports";

export class PrismaTemplateRepository implements TemplateRepository {
  constructor(
    private readonly client: PrismaClient = prisma,
    private readonly storage: BlobStore = blobStore,
  ) {}

  async list(restaurantId: string): Promise<MenuTemplateView[]> {
    const rows = await this.client.menuTemplate.findMany({ where: { OR: [{ isSystem: true, status: "PUBLISHED" }, { visibility: "PUBLIC", status: "PUBLISHED" }, { restaurantId }], }, orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }] });
    const views = rows.map(toView);
    const systemIds = new Set(views.map((view) => view.id));
    for (const preset of TEMPLATE_PRESETS) if (!systemIds.has(preset.id)) views.unshift(presetAsView(preset));
    return views;
  }

  async createPrivate(input: TemplateCreateInput): Promise<MenuTemplateView> {
    const document = validateCanvasDocument(input.document);
    const id = randomUUID();
    const row = await this.client.$transaction(async (transaction) => {
      await assertTenantAssets(transaction, input.restaurantId, document);
      const template = await transaction.menuTemplate.create({ data: { id, restaurantId: input.restaurantId, name: input.name, description: input.description, documentJson: JSON.stringify(document), schemaVersion: document.schemaVersion, visibility: "PRIVATE", status: "DRAFT" } });
      const assetIds = [...documentAssetIds(document)];
      if (assetIds.length) await transaction.menuTemplateAssetReference.createMany({ data: assetIds.map((assetId) => ({ restaurantId: input.restaurantId, templateId: template.id, assetId })) });
      return template;
    });
    return toView(row);
  }

  async submitPublic(input: TemplateCreateInput): Promise<MenuTemplateView> {
    const document = validateCanvasDocument(input.document);
    const sourceAssets = await this.client.menuAsset.findMany({ where: { restaurantId: input.restaurantId, id: { in: [...documentAssetIds(document)] } } });
    if (sourceAssets.length !== documentAssetIds(document).size) throw new NotFoundError("Asset");
    const templateId = randomUUID();
    const remap = new Map<string, string>();
    for (const asset of sourceAssets) {
      const bytes = await this.storage.read(asset.storageKey);
      const targetKey = `templates/${templateId}/${asset.checksum}-${asset.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await this.storage.put(targetKey, bytes);
      remap.set(asset.id, randomUUID());
    }
    const remappedDocument = remapDocumentAssets(document, remap);
    const row = await this.client.$transaction(async (transaction) => {
      const template = await transaction.menuTemplate.create({ data: { id: templateId, restaurantId: input.restaurantId, name: input.name, description: input.description, documentJson: JSON.stringify(remappedDocument), schemaVersion: remappedDocument.schemaVersion, visibility: "PUBLIC", status: "PENDING", submittedAt: new Date() } });
      for (const asset of sourceAssets) {
        const id = remap.get(asset.id)!;
        await transaction.menuTemplateAsset.create({ data: { id, templateId, kind: asset.kind, name: asset.name, storageKey: `templates/${templateId}/${asset.checksum}-${asset.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`, mimeType: asset.mimeType, byteSize: asset.byteSize, checksum: asset.checksum, width: asset.width, height: asset.height, fontFamily: asset.fontFamily } });
      }
      return template;
    });
    return toView(row);
  }

  async exportPortable(restaurantId: string, templateId: string): Promise<PortableTemplate> {
    const preset = TEMPLATE_PRESETS.find((item) => item.id === templateId);
    if (preset) {
      const document = validateCanvasDocument(preset.document);
      if (documentAssetIds(document).size) throw new ConflictError("La plantilla integrada contiene assets que no se pueden exportar.");
      return { name: preset.name, description: preset.description, document, assets: [] };
    }

    const template = await this.client.menuTemplate.findFirst({
      where: { id: templateId, OR: [{ isSystem: true, status: "PUBLISHED" }, { visibility: "PUBLIC", status: "PUBLISHED" }, { restaurantId }] },
      include: { assets: true, references: { include: { asset: true } } },
    });
    if (!template) throw new NotFoundError("Plantilla");
    const document = validateCanvasDocument(JSON.parse(template.documentJson));
    const sourceAssets: StoredTemplateAsset[] = template.visibility === "PUBLIC" ? template.assets : template.references.map((reference) => reference.asset);
    const assetsById = new Map(sourceAssets.map((asset) => [asset.id, asset]));
    const assets: PortableTemplateAsset[] = [];
    for (const assetId of documentAssetIds(document)) {
      const asset = assetsById.get(assetId);
      if (!asset) throw new ConflictError("La plantilla tiene referencias a assets inexistentes.");
      const content = new Uint8Array(await this.storage.read(asset.storageKey));
      assets.push({
        id: asset.id,
        kind: asset.kind,
        name: asset.name,
        mimeType: portableMimeType(asset.kind, asset.mimeType, asset.name),
        byteSize: content.byteLength,
        checksum: hashAsset(content),
        width: asset.kind === "IMAGE" ? null : asset.width,
        height: asset.kind === "IMAGE" ? null : asset.height,
        fontFamily: asset.fontFamily,
        content,
      });
    }
    return { name: template.name, description: template.description, document, assets };
  }

  async importPortable(restaurantId: string, template: PortableTemplate): Promise<MenuTemplateView> {
    const row = await this.withImportedAssets(
      restaurantId,
      template.assets,
      (asset) => Promise.resolve(Buffer.from(asset.content)),
      async (transaction, remap) => {
        const document = validateCanvasDocument(remapDocumentAssets(template.document, remap));
        const created = await transaction.menuTemplate.create({ data: {
          id: randomUUID(),
          restaurantId,
          name: template.name,
          description: template.description,
          documentJson: JSON.stringify(document),
          schemaVersion: document.schemaVersion,
          visibility: "PRIVATE",
          status: "DRAFT",
        } });
        const assetIds = [...documentAssetIds(document)];
        if (assetIds.length) await transaction.menuTemplateAssetReference.createMany({ data: assetIds.map((assetId) => ({ restaurantId, templateId: created.id, assetId })) });
        return created;
      },
    );
    return toView(row);
  }

  async apply(restaurantId: string, templateId: string): Promise<CanvasDocumentV1> {
    const preset = TEMPLATE_PRESETS.find((item) => item.id === templateId);
    if (preset) return preset.document;
    const template = await this.client.menuTemplate.findFirst({ where: { id: templateId, OR: [{ isSystem: true, status: "PUBLISHED" }, { visibility: "PUBLIC", status: "PUBLISHED" }, { restaurantId }] }, include: { assets: true } });
    if (!template) throw new NotFoundError("Plantilla");
    const document = validateCanvasDocument(JSON.parse(template.documentJson));
    if (template.visibility === "PUBLIC") {
      return this.withImportedAssets(
        restaurantId,
        template.assets,
        (asset) => this.storage.read(asset.storageKey),
        async (_transaction, remap) => validateCanvasDocument(remapDocumentAssets(document, remap)),
      );
    }
    const refs = await this.client.menuTemplateAssetReference.findMany({ where: { restaurantId, templateId }, select: { assetId: true } });
    const allowed = new Set(refs.map((ref) => ref.assetId));
    for (const assetId of documentAssetIds(document)) if (!allowed.has(assetId)) throw new ConflictError("La plantilla privada tiene assets inválidos.");
    return document;
  }

  private async withImportedAssets<TAsset extends Omit<StoredTemplateAsset, "storageKey">, TResult>(
    restaurantId: string,
    assets: TAsset[],
    readContent: (asset: TAsset) => Promise<Buffer>,
    operation: (transaction: Prisma.TransactionClient, remap: Map<string, string>) => Promise<TResult>,
  ): Promise<TResult> {
    const existingBeforeStaging = assets.length ? await this.client.menuAsset.findMany({
      where: { restaurantId, checksum: { in: [...new Set(assets.map((asset) => asset.checksum))] } },
      select: { kind: true, mimeType: true, checksum: true },
    }) : [];
    const reusable = new Set(existingBeforeStaging.map(assetContentKey));
    const staged: StagedTemplateAsset[] = [];
    const byContent = new Map<string, StagedTemplateAsset>();
    try {
      for (const asset of assets) {
        const key = assetContentKey(asset);
        if (reusable.has(key) || byContent.has(key)) continue;
        const content = await readContent(asset);
        const copied = {
          ...asset,
          id: randomUUID(),
          name: asset.name.slice(0, 100),
          byteSize: content.byteLength,
          storageKey: `restaurants/${restaurantId}/template-imports/${randomUUID()}.${extensionForAsset(asset.mimeType, asset.name)}`,
        };
        staged.push(copied);
        byContent.set(key, copied);
        await this.storage.put(copied.storageKey, content);
      }
    } catch (error) {
      await this.cleanupStagedAssets(staged);
      throw error;
    }

    let committed: { result: TResult; retainedKeys: Set<string> };
    try {
      committed = await withSqliteTransaction(this.client, async (transaction) => {
        const existing = assets.length ? await transaction.menuAsset.findMany({
          where: { restaurantId, checksum: { in: [...new Set(assets.map((asset) => asset.checksum))] } },
          select: { id: true, kind: true, mimeType: true, checksum: true },
        }) : [];
        const existingByContent = new Map(existing.map((asset) => [assetContentKey(asset), asset.id]));
        for (const asset of assets) {
          const key = assetContentKey(asset);
          if (!existingByContent.has(key) && !byContent.has(key)) {
            throw new ConflictError("La biblioteca de archivos cambió. Volvé a intentar.");
          }
        }
        const missing = staged.filter((asset) => !existingByContent.has(assetContentKey(asset)));
        await assertAssetQuota(transaction, restaurantId, missing.reduce((total, asset) => total + asset.byteSize, 0));
        if (missing.length) await transaction.menuAsset.createMany({ data: missing.map((asset) => ({
          id: asset.id, restaurantId, kind: asset.kind, name: asset.name, storageKey: asset.storageKey,
          mimeType: asset.mimeType, byteSize: asset.byteSize, checksum: asset.checksum,
          width: asset.width, height: asset.height, fontFamily: asset.fontFamily,
        })) });
        const remap = new Map<string, string>();
        for (const asset of assets) {
          const key = assetContentKey(asset);
          const id = existingByContent.get(key) ?? byContent.get(key)!.id;
          remap.set(asset.id, id);
        }
        return { result: await operation(transaction, remap), retainedKeys: new Set(missing.map((asset) => asset.storageKey)) };
      });
    } catch (error) {
      await this.cleanupStagedAssets(staged);
      throw error;
    }
    await this.cleanupStagedAssets(staged.filter((asset) => !committed.retainedKeys.has(asset.storageKey)));
    return committed.result;
  }

  private async cleanupStagedAssets(assets: StagedTemplateAsset[]): Promise<void> {
    await Promise.all(assets.map(async (asset) => {
      try { await this.storage.delete(asset.storageKey); }
      catch {
        // A failed immediate cleanup must not remove committed assets or repeat an import.
        await enqueueAssetCleanup(asset.storageKey, this.client).catch(() => undefined);
      }
    }));
  }

  async updatePrivate(restaurantId: string, templateId: string, input: { name?: string; description?: string }): Promise<MenuTemplateView> {
    const row = await this.client.menuTemplate.update({ where: { id: templateId, restaurantId, visibility: "PRIVATE", isSystem: false }, data: input });
    return toView(row);
  }

  async deletePrivate(restaurantId: string, templateId: string): Promise<void> {
    const result = await this.client.menuTemplate.deleteMany({ where: { id: templateId, restaurantId, isSystem: false, visibility: "PRIVATE" } });
    if (result.count !== 1) throw new NotFoundError("Plantilla");
  }

  async listPending(): Promise<MenuTemplateView[]> {
    const rows = await this.client.menuTemplate.findMany({ where: { visibility: "PUBLIC", status: "PENDING" }, orderBy: { submittedAt: "asc" } });
    return rows.map(toView);
  }

  async listForSuperadmin(input: SuperadminTemplateQuery): Promise<SuperadminTemplateList> {
    const status: "PUBLISHED" | "PENDING" | "REJECTED" | "ARCHIVED" | undefined = input.tab === "published" ? "PUBLISHED" : input.tab === "pending" ? "PENDING" : input.tab === "rejected" ? "REJECTED" : input.tab === "archived" ? "ARCHIVED" : undefined;
    const scope = input.tab === "system" ? { isSystem: true } : input.tab === "all" ? { OR: [{ isSystem: true }, { visibility: "PUBLIC" as const }] } : { isSystem: false, visibility: "PUBLIC" as const };
    const rows = await this.client.menuTemplate.findMany({
      where: { AND: [scope, ...(status ? [{ status }] : []), ...(input.query ? [{ OR: [{ name: { contains: input.query } }, { description: { contains: input.query } }, { restaurant: { name: { contains: input.query } } }, { restaurant: { slug: { contains: input.query } } }] }] : [])] },
      include: { restaurant: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    });
    const items: SuperadminTemplateView[] = rows.map((row) => ({ ...toView(row), owner: row.restaurant ? { restaurantId: row.restaurant.id, name: row.restaurant.name, slug: row.restaurant.slug } : null }));
    for (const preset of TEMPLATE_PRESETS) {
      if (input.tab !== "all" && input.tab !== "system") continue;
      if (input.query && !`${preset.name} ${preset.description}`.toLocaleLowerCase().includes(input.query.toLocaleLowerCase())) continue;
      if (!items.some((item) => item.id === preset.id)) items.push({ ...presetAsView(preset), owner: null });
    }
    items.sort((left, right) => Number(right.isSystem) - Number(left.isSystem) || right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id));
    const start = (input.page - 1) * input.pageSize;
    return { items: items.slice(start, start + input.pageSize), total: items.length, page: input.page, pageSize: input.pageSize };
  }

  async deletePublic(templateId: string): Promise<void> {
    await this.client.$transaction(async (transaction) => {
      const template = await transaction.menuTemplate.findFirst({ where: { id: templateId, visibility: "PUBLIC", isSystem: false }, include: { assets: { select: { storageKey: true } } } });
      if (!template) throw new NotFoundError("Plantilla");
      for (const asset of template.assets) await enqueueAssetCleanup(asset.storageKey, transaction);
      await transaction.menuTemplate.delete({ where: { id: template.id } });
    });
  }

  async moderate(templateId: string, action: "publish" | "reject" | "archive" | "restore", reason?: string): Promise<MenuTemplateView> {
    const template = await this.client.menuTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.visibility !== "PUBLIC" || template.isSystem) throw new NotFoundError("Plantilla");
    const validTransitions = { publish: "PENDING", reject: "PENDING", archive: "PUBLISHED", restore: "ARCHIVED" } as const;
    if (template.status !== validTransitions[action]) throw new ConflictError("La plantilla no está en un estado válido para esta acción.");
    const status = action === "publish" || action === "restore" ? "PUBLISHED" : action === "reject" ? "REJECTED" : "ARCHIVED";
    const row = await this.client.menuTemplate.update({ where: { id: templateId }, data: { status, rejectionReason: action === "reject" ? reason ?? null : null, publishedAt: action === "publish" ? new Date() : null } });
    return toView(row);
  }
}

type StoredTemplateAsset = {
  id: string;
  kind: MenuAssetKind;
  name: string;
  storageKey: string;
  mimeType: string;
  byteSize: number;
  checksum: string;
  width: number | null;
  height: number | null;
  fontFamily: string | null;
};

type StagedTemplateAsset = StoredTemplateAsset;

function hashAsset(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

function portableMimeType(kind: MenuAssetKind, mimeType: string, name: string): string {
  if (mimeType.trim()) return mimeType.trim().toLowerCase();
  if (kind !== "FONT") return mimeType;
  const extension = name.split(".").pop()?.toLowerCase();
  return ({ woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf" } as Record<string, string>)[extension ?? ""] ?? "application/octet-stream";
}

function extensionForAsset(mimeType: string, name: string): string {
  const known: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm", "font/woff": "woff", "font/woff2": "woff2", "font/ttf": "ttf", "font/otf": "otf", "application/font-woff": "woff", "application/font-woff2": "woff2", "application/x-font-ttf": "ttf", "application/vnd.ms-opentype": "otf" };
  return known[mimeType] ?? (name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin");
}

function toView(row: { id: string; name: string; description: string; visibility: string; status: string; isSystem: boolean; restaurantId: string | null; documentJson: string; rejectionReason: string | null; createdAt: Date; updatedAt: Date }): MenuTemplateView {
  return { id: row.id, name: row.name, description: row.description, visibility: row.visibility as MenuTemplateView["visibility"], status: row.status as MenuTemplateView["status"], isSystem: row.isSystem, restaurantId: row.restaurantId, document: validateCanvasDocument(JSON.parse(row.documentJson)), rejectionReason: row.rejectionReason, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

async function assertTenantAssets(transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], restaurantId: string, document: CanvasDocumentV1) {
  const ids = [...documentAssetIds(document)];
  if (!ids.length) return;
  const assets = await transaction.menuAsset.findMany({ where: { restaurantId, id: { in: ids } }, select: { id: true } });
  if (assets.length !== ids.length) throw new NotFoundError("Asset");
}

function remapDocumentAssets(document: CanvasDocumentV1, remap: Map<string, string>): CanvasDocumentV1 {
  return { ...document, nodes: document.nodes.map((node) => {
    if (node.type === "image") return { ...node, assetId: remap.get(node.assetId) ?? node.assetId };
    if (node.type === "shape" && node.shape === "rect" && node.backgroundImage) return { ...node, backgroundImage: { ...node.backgroundImage, assetId: remap.get(node.backgroundImage.assetId) ?? node.backgroundImage.assetId } };
    if (node.type !== "text") return node;
    return { ...node, fontAssetId: node.fontAssetId ? remap.get(node.fontAssetId) ?? node.fontAssetId : null, modalAssetId: node.modalAssetId ? remap.get(node.modalAssetId) ?? node.modalAssetId : null };
  }) };
}
