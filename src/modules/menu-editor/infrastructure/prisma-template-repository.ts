import { randomUUID } from "node:crypto";
import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import { prisma } from "@/platform/database/prisma";
import { blobStore } from "@/platform/storage";
import { enqueueAssetCleanup } from "@/platform/storage/asset-cleanup-queue";
import { documentAssetIds, validateCanvasDocument } from "../domain/document-policy";
import { presetAsView, TEMPLATE_PRESETS } from "../domain/template-presets";
import type { CanvasDocumentV1, MenuTemplateView, SuperadminTemplateList, SuperadminTemplateQuery, SuperadminTemplateView } from "../contracts";
import type { TemplateCreateInput, TemplateRepository } from "../application/template-ports";

export class PrismaTemplateRepository implements TemplateRepository {
  async list(tenantId: string): Promise<MenuTemplateView[]> {
    const rows = await prisma.menuTemplate.findMany({ where: { OR: [{ isSystem: true, status: "PUBLISHED" }, { visibility: "PUBLIC", status: "PUBLISHED" }, { tenantId }], }, orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }] });
    const views = rows.map(toView);
    const systemIds = new Set(views.map((view) => view.id));
    for (const preset of TEMPLATE_PRESETS) if (!systemIds.has(preset.id)) views.unshift(presetAsView(preset));
    return views;
  }

  async createPrivate(input: TemplateCreateInput): Promise<MenuTemplateView> {
    const document = validateCanvasDocument(input.document);
    const id = randomUUID();
    const row = await prisma.$transaction(async (transaction) => {
      await assertTenantAssets(transaction, input.tenantId, document);
      const template = await transaction.menuTemplate.create({ data: { id, tenantId: input.tenantId, name: input.name, description: input.description, documentJson: JSON.stringify(document), schemaVersion: document.schemaVersion, visibility: "PRIVATE", status: "DRAFT" } });
      const assetIds = [...documentAssetIds(document)];
      if (assetIds.length) await transaction.menuTemplateAssetReference.createMany({ data: assetIds.map((assetId) => ({ tenantId: input.tenantId, templateId: template.id, assetId })) });
      return template;
    });
    return toView(row);
  }

  async submitPublic(input: TemplateCreateInput): Promise<MenuTemplateView> {
    const document = validateCanvasDocument(input.document);
    const sourceAssets = await prisma.menuAsset.findMany({ where: { tenantId: input.tenantId, id: { in: [...documentAssetIds(document)] } } });
    if (sourceAssets.length !== documentAssetIds(document).size) throw new NotFoundError("Asset");
    const templateId = randomUUID();
    const remap = new Map<string, string>();
    for (const asset of sourceAssets) {
      const bytes = await blobStore.read(asset.storageKey);
      const targetKey = `templates/${templateId}/${asset.checksum}-${asset.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await blobStore.put(targetKey, bytes);
      remap.set(asset.id, randomUUID());
    }
    const remappedDocument = remapDocumentAssets(document, remap);
    const row = await prisma.$transaction(async (transaction) => {
      const template = await transaction.menuTemplate.create({ data: { id: templateId, tenantId: input.tenantId, name: input.name, description: input.description, documentJson: JSON.stringify(remappedDocument), schemaVersion: remappedDocument.schemaVersion, visibility: "PUBLIC", status: "PENDING", submittedAt: new Date() } });
      for (const asset of sourceAssets) {
        const id = remap.get(asset.id)!;
        await transaction.menuTemplateAsset.create({ data: { id, templateId, kind: asset.kind, name: asset.name, storageKey: `templates/${templateId}/${asset.checksum}-${asset.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`, mimeType: asset.mimeType, byteSize: asset.byteSize, checksum: asset.checksum, width: asset.width, height: asset.height, fontFamily: asset.fontFamily } });
      }
      return template;
    });
    return toView(row);
  }

  async apply(tenantId: string, templateId: string): Promise<CanvasDocumentV1> {
    const preset = TEMPLATE_PRESETS.find((item) => item.id === templateId);
    if (preset) return preset.document;
    const template = await prisma.menuTemplate.findFirst({ where: { id: templateId, OR: [{ isSystem: true, status: "PUBLISHED" }, { visibility: "PUBLIC", status: "PUBLISHED" }, { tenantId }] }, include: { assets: true } });
    if (!template) throw new NotFoundError("Plantilla");
    let document = validateCanvasDocument(JSON.parse(template.documentJson));
    if (template.visibility === "PUBLIC") {
      const [tenant, usage] = await Promise.all([
        prisma.tenant.findUnique({ where: { id: tenantId }, select: { assetQuotaBytes: true } }),
        prisma.menuAsset.aggregate({ where: { tenantId }, _sum: { byteSize: true } }),
      ]);
      const newBytes = template.assets.reduce((total, asset) => total + asset.byteSize, 0);
      if (tenant && (usage._sum.byteSize ?? 0) + newBytes > tenant.assetQuotaBytes) throw new BadRequestError("La plantilla supera la cuota de archivos del restaurante.");
      const remap = new Map<string, string>();
      for (const asset of template.assets) {
        const existing = await prisma.menuAsset.findFirst({ where: { tenantId, checksum: asset.checksum } });
        if (existing) { remap.set(asset.id, existing.id); continue; }
        const bytes = await blobStore.read(asset.storageKey);
        const created = await prisma.menuAsset.create({ data: { tenantId, kind: asset.kind, name: asset.name, storageKey: `tenants/${tenantId}/template-assets/${asset.checksum}-${asset.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`, mimeType: asset.mimeType, byteSize: asset.byteSize, checksum: asset.checksum, width: asset.width, height: asset.height, fontFamily: asset.fontFamily } });
        await blobStore.put(created.storageKey, bytes);
        remap.set(asset.id, created.id);
      }
      document = remapDocumentAssets(document, remap);
    } else {
      const refs = await prisma.menuTemplateAssetReference.findMany({ where: { tenantId, templateId }, select: { assetId: true } });
      const allowed = new Set(refs.map((ref) => ref.assetId));
      for (const assetId of documentAssetIds(document)) if (!allowed.has(assetId)) throw new ConflictError("La plantilla privada tiene assets inválidos.");
    }
    return validateCanvasDocument(document);
  }

  async updatePrivate(tenantId: string, templateId: string, input: { name?: string; description?: string }): Promise<MenuTemplateView> {
    const row = await prisma.menuTemplate.update({ where: { id: templateId, tenantId }, data: input });
    return toView(row);
  }

  async deletePrivate(tenantId: string, templateId: string): Promise<void> {
    const result = await prisma.menuTemplate.deleteMany({ where: { id: templateId, tenantId, isSystem: false, visibility: "PRIVATE" } });
    if (result.count !== 1) throw new NotFoundError("Plantilla");
  }

  async listPending(): Promise<MenuTemplateView[]> {
    const rows = await prisma.menuTemplate.findMany({ where: { visibility: "PUBLIC", status: "PENDING" }, orderBy: { submittedAt: "asc" } });
    return rows.map(toView);
  }

  async listForSuperadmin(input: SuperadminTemplateQuery): Promise<SuperadminTemplateList> {
    const status: "PUBLISHED" | "PENDING" | "REJECTED" | "ARCHIVED" | undefined = input.tab === "published" ? "PUBLISHED" : input.tab === "pending" ? "PENDING" : input.tab === "rejected" ? "REJECTED" : input.tab === "archived" ? "ARCHIVED" : undefined;
    const scope = input.tab === "system" ? { isSystem: true } : input.tab === "all" ? { OR: [{ isSystem: true }, { visibility: "PUBLIC" as const }] } : { isSystem: false, visibility: "PUBLIC" as const };
    const rows = await prisma.menuTemplate.findMany({
      where: { AND: [scope, ...(status ? [{ status }] : []), ...(input.query ? [{ OR: [{ name: { contains: input.query } }, { description: { contains: input.query } }, { tenant: { name: { contains: input.query } } }, { tenant: { slug: { contains: input.query } } }] }] : [])] },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }, { id: "asc" }],
    });
    const items: SuperadminTemplateView[] = rows.map((row) => ({ ...toView(row), owner: row.tenant ? { tenantId: row.tenant.id, name: row.tenant.name, slug: row.tenant.slug } : null }));
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
    await prisma.$transaction(async (transaction) => {
      const template = await transaction.menuTemplate.findFirst({ where: { id: templateId, visibility: "PUBLIC", isSystem: false }, include: { assets: { select: { storageKey: true } } } });
      if (!template) throw new NotFoundError("Plantilla");
      for (const asset of template.assets) await enqueueAssetCleanup(asset.storageKey, transaction);
      await transaction.menuTemplate.delete({ where: { id: template.id } });
    });
  }

  async moderate(templateId: string, action: "publish" | "reject" | "archive" | "restore", reason?: string): Promise<MenuTemplateView> {
    const template = await prisma.menuTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.visibility !== "PUBLIC" || template.isSystem) throw new NotFoundError("Plantilla");
    const validTransitions = { publish: "PENDING", reject: "PENDING", archive: "PUBLISHED", restore: "ARCHIVED" } as const;
    if (template.status !== validTransitions[action]) throw new ConflictError("La plantilla no está en un estado válido para esta acción.");
    const status = action === "publish" || action === "restore" ? "PUBLISHED" : action === "reject" ? "REJECTED" : "ARCHIVED";
    const row = await prisma.menuTemplate.update({ where: { id: templateId }, data: { status, rejectionReason: action === "reject" ? reason ?? null : null, publishedAt: action === "publish" ? new Date() : null } });
    return toView(row);
  }
}

function toView(row: { id: string; name: string; description: string; visibility: string; status: string; isSystem: boolean; tenantId: string | null; documentJson: string; rejectionReason: string | null; createdAt: Date; updatedAt: Date }): MenuTemplateView {
  return { id: row.id, name: row.name, description: row.description, visibility: row.visibility as MenuTemplateView["visibility"], status: row.status as MenuTemplateView["status"], isSystem: row.isSystem, tenantId: row.tenantId, document: validateCanvasDocument(JSON.parse(row.documentJson)), rejectionReason: row.rejectionReason, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

async function assertTenantAssets(transaction: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], tenantId: string, document: CanvasDocumentV1) {
  const ids = [...documentAssetIds(document)];
  if (!ids.length) return;
  const assets = await transaction.menuAsset.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } });
  if (assets.length !== ids.length) throw new NotFoundError("Asset");
}

function remapDocumentAssets(document: CanvasDocumentV1, remap: Map<string, string>): CanvasDocumentV1 {
  return { ...document, nodes: document.nodes.map((node) => {
    if (node.type === "image") return { ...node, assetId: remap.get(node.assetId) ?? node.assetId };
    if (node.type !== "text") return node;
    return { ...node, fontAssetId: node.fontAssetId ? remap.get(node.fontAssetId) ?? node.fontAssetId : null, modalAssetId: node.modalAssetId ? remap.get(node.modalAssetId) ?? node.modalAssetId : null };
  }) };
}
