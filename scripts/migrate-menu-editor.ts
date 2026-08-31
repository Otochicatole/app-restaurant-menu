import { randomUUID } from "node:crypto";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import { canvasDocumentSchema, type CanvasDocumentV1, type CanvasNode } from "../src/modules/menu-editor/contracts";
import { blobStore } from "../src/platform/storage";
import { checksum } from "../src/modules/menu-editor/infrastructure/prisma-menu-editor-repository";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url: databaseUrl.trim(), timeout: 5_000 }) });

function textNode(id: string, text: string, x: number, y: number, width: number, height: number, role: "heading" | "paragraph" | "label" | "price" = "paragraph"): CanvasNode {
  return { id, type: "text", x, y, width, height, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, text, fontAssetId: null, fontSize: role === "heading" ? 42 : 22, fontWeight: role === "heading" ? "700" : "400", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "middle", lineHeight: 1.2, letterSpacing: 0, fill: "#171717", semanticRole: role };
}

function documentFor(tenantName: string, description: string, groups: Array<{ id: string; name: string; description: string; products: Array<{ id: string; name: string; description: string; price: number; mediaPath: string | null; mediaType: string | null }> }>, assets: Map<string, string>): CanvasDocumentV1 {
  const nodes: CanvasNode[] = [textNode("legacy-title", tenantName, 80, 60, 900, 70, "heading"), textNode("legacy-description", description, 84, 140, 900, 48)];
  let y = 240;
  for (const group of groups) {
    nodes.push(textNode(`legacy-group-${group.id}`, group.name, 80, y, 900, 52, "heading"));
    y += 64;
    if (group.description) { nodes.push(textNode(`legacy-group-description-${group.id}`, group.description, 84, y, 900, 40)); y += 52; }
    for (const product of group.products) {
      nodes.push(textNode(`legacy-product-${product.id}`, product.name, 100, y, 570, 40, "label"));
      nodes.push(textNode(`legacy-price-${product.id}`, `${product.price.toFixed(2)}`, 700, y, 220, 40, "price"));
      y += 44;
      if (product.description) { nodes.push(textNode(`legacy-product-description-${product.id}`, product.description, 120, y, 800, 42)); y += 52; }
      if (product.mediaType === "video") { nodes.push(textNode(`legacy-video-warning-${product.id}`, "Video heredado: reemplazalo por una imagen antes de publicar.", 120, y, 800, 42, "paragraph")); y += 52; }
      const assetId = product.mediaPath ? assets.get(product.mediaPath) : undefined;
      if (assetId) { nodes.push({ id: `legacy-image-${product.id}`, type: "image", assetId, x: 120, y, width: 260, height: 170, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, fit: "contain", cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, cornerRadius: 12, alt: product.name }); y += 190; }
      y += 28;
    }
    y += 40;
  }
  const canvasBounds = { x: 0, y: 0, width: 1100, height: Math.max(900, y + 80) };
  return canvasDocumentSchema.parse({ schemaVersion: 1, background: "#F3EEDC", initialViewport: { ...canvasBounds }, canvasBounds, nodes, groups: [] });
}

async function registerAsset(tenantId: string, kind: "IMAGE" | "FONT", name: string, storageKey: string, mimeType: string): Promise<string | null> {
  const stat = await blobStore.stat(storageKey);
  if (!stat) return null;
  const existing = await prisma.menuAsset.findFirst({ where: { tenantId, storageKey }, select: { id: true } });
  if (existing) return existing.id;
  const content = await blobStore.read(storageKey);
  const asset = await prisma.menuAsset.create({ data: { id: randomUUID(), tenantId, kind, name, storageKey, mimeType, byteSize: stat.size, checksum: checksum(content) } });
  return asset.id;
}

async function main() {
  const tenants = await prisma.tenant.findMany({ include: { homePage: true, groups: { include: { products: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } } }, fonts: true } });
  for (const tenant of tenants) {
    const existing = await prisma.menuProject.findUnique({ where: { tenantId: tenant.id } });
    if (existing) {
      const document = canvasDocumentSchema.parse(JSON.parse(existing.draftJson));
      const ids = new Set(document.nodes.flatMap((node) => node.type === "image" ? [node.assetId] : node.type === "text" && node.fontAssetId ? [node.fontAssetId] : []));
      await prisma.menuAssetReference.deleteMany({ where: { tenantId: tenant.id, projectId: existing.id, scope: "DRAFT" } });
      if (ids.size) await prisma.menuAssetReference.createMany({ data: [...ids].map((assetId) => ({ tenantId: tenant.id, projectId: existing.id, assetId, scope: "DRAFT" as const })) });
      continue;
    }
    const assetIds = new Map<string, string>();
    for (const product of tenant.groups.flatMap((group) => group.products)) {
      if (!product.mediaPath || product.mediaType === "video") continue;
      const mimeType = product.mediaType === "image" ? (product.mediaPath.endsWith(".png") ? "image/png" : product.mediaPath.endsWith(".webp") ? "image/webp" : "image/jpeg") : "application/octet-stream";
      const id = await registerAsset(tenant.id, "IMAGE", product.name, product.mediaPath, mimeType);
      if (id) assetIds.set(product.mediaPath, id);
    }
    for (const font of tenant.fonts) {
      if (!font.filePath || font.source !== "custom") continue;
      const mime = font.filePath.endsWith(".woff2") ? "font/woff2" : font.filePath.endsWith(".woff") ? "font/woff" : font.filePath.endsWith(".ttf") ? "font/ttf" : "font/otf";
      await registerAsset(tenant.id, "FONT", font.name, font.filePath, mime);
    }
    const document = documentFor(tenant.name, tenant.homePage?.description ?? tenant.publicDescription, tenant.groups, assetIds);
    const project = await prisma.menuProject.create({ data: { tenantId: tenant.id, draftJson: JSON.stringify(document), schemaVersion: 1, legacyFallback: true } });
    if (assetIds.size) await prisma.menuAssetReference.createMany({ data: [...new Set(assetIds.values())].map((assetId) => ({ tenantId: tenant.id, projectId: project.id, assetId, scope: "DRAFT" as const })) });
    if (tenant.homePage?.description && tenant.publicDescription === "Menú digital") {
      await prisma.tenant.update({ where: { id: tenant.id }, data: { publicDescription: tenant.homePage.description } });
    }
    console.log(`Migrated ${tenant.slug}`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
