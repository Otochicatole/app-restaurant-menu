import { createHash } from "node:crypto";
import { createClient, type Client } from "@libsql/client";
import type { InArgs } from "@libsql/core/api";
import { assertLocalSqliteUrl } from "../src/platform/config/sqlite-url";
import { canvasDocumentSchema, type CanvasDocumentV1, type CanvasNode } from "../src/modules/menu-editor/contracts";
import { normalizeLegacyCanvasDocument, validateCanvasDocument } from "../src/modules/menu-editor/domain/document-policy";
import { blobStore } from "../src/platform/storage";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria.");
assertLocalSqliteUrl(databaseUrl);

const client = createClient({ url: databaseUrl.trim() });

type TenantRow = { id: string; name: string; publicDescription: string };
type LegacyGroup = { id: string; name: string; description: string };
type LegacyProduct = { id: string; groupId: string; name: string; description: string; price: number; sortOrder: number; mediaPath: string | null; mediaType: string | null };
type LegacyFont = { id: string; name: string; source: string; filePath: string | null };
type ExistingProject = { id: string; draftJson: string; publishedJson: string | null; draftRevision: number; publishedRevision: number | null };
type DbSource = Client | Awaited<ReturnType<Client["transaction"]>>;

function textNode(id: string, text: string, x: number, y: number, width: number, height: number, role: "heading" | "paragraph" | "label" | "price" = "paragraph", fontAssetId: string | null = null): CanvasNode {
  return { id, name: text.slice(0, 120), type: "text", x, y, width, height, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, text, fontAssetId, fontSize: role === "heading" ? 42 : 22, fontWeight: role === "heading" ? "700" : "400", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "middle", lineHeight: 1.2, letterSpacing: 0, fill: "#171717", semanticRole: role };
}

function documentFor(tenant: TenantRow, groups: LegacyGroup[], products: LegacyProduct[], assets: Map<string, string>, fontAssetId: string | null): CanvasDocumentV1 {
  const nodes: CanvasNode[] = [
    textNode("legacy-title", tenant.name, 80, 60, 900, 70, "heading", fontAssetId),
    textNode("legacy-description", tenant.publicDescription || "Menú digital", 84, 140, 900, 48, "paragraph", fontAssetId),
  ];
  let y = 240;
  for (const group of groups) {
    nodes.push(textNode(`legacy-group-${group.id}`, group.name, 80, y, 900, 52, "heading", fontAssetId));
    y += 64;
    if (group.description) {
      nodes.push(textNode(`legacy-group-description-${group.id}`, group.description, 84, y, 900, 40, "paragraph", fontAssetId));
      y += 52;
    }
    for (const product of products.filter((item) => item.groupId === group.id).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))) {
      nodes.push(textNode(`legacy-product-${product.id}`, product.name, 100, y, 570, 40, "label", fontAssetId));
      nodes.push(textNode(`legacy-price-${product.id}`, `${product.price.toFixed(2)}`, 700, y, 220, 40, "price", fontAssetId));
      y += 44;
      if (product.description) {
        nodes.push(textNode(`legacy-product-description-${product.id}`, product.description, 120, y, 800, 42, "paragraph", fontAssetId));
        y += 52;
      }
      if (product.mediaType?.toLowerCase() === "video") {
        nodes.push(textNode(`legacy-video-warning-${product.id}`, "Video heredado: reemplazalo por una imagen antes de publicar.", 120, y, 800, 42, "paragraph", fontAssetId));
        y += 52;
      }
      const assetId = product.mediaPath ? assets.get(product.mediaPath) : undefined;
      if (assetId) {
        nodes.push({ id: `legacy-image-${product.id}`, name: product.name, type: "image", assetId, x: 120, y, width: 260, height: 170, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, fit: "contain", cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, cornerRadius: 12, alt: product.name });
        y += 190;
      }
      y += 28;
    }
    y += 40;
  }
  const bounds = { x: 0, y: 0, width: 1100, height: Math.max(900, y + 80) };
  return validateCanvasDocument(canvasDocumentSchema.parse({ schemaVersion: 1, background: "#F3EEDC", initialViewport: bounds, canvasBounds: bounds, nodes, groups: [] }));
}

async function main() {
  await client.execute("PRAGMA foreign_keys = ON");
  const legacyTables = await rows<{ name: string }>(client, `SELECT name FROM sqlite_schema WHERE type = 'table' AND name IN ('Group', 'Product', 'FeaturedProduct', 'HomePage', 'Font', 'Setting')`);
  if (legacyTables.length === 0) {
    console.log("No se encontraron tablas legacy; el cutover ya fue ejecutado.");
    return;
  }

  const tenants = await rows<TenantRow>(client, `SELECT id, name, publicDescription FROM Tenant ORDER BY id`);
  for (const tenant of tenants) await migrateTenant(tenant);
  await verifyCutover(tenants);
  console.log(`Cutover Canvas completado para ${tenants.length} tenant(s).`);
}

async function migrateTenant(tenant: TenantRow): Promise<void> {
  const existing = await oneOrNull<ExistingProject>(client, `SELECT id, draftJson, publishedJson, draftRevision, publishedRevision FROM MenuProject WHERE tenantId = ?`, [tenant.id]);
  const groups = await rows<LegacyGroup>(client, `SELECT id, name, description FROM "Group" WHERE tenantId = ? ORDER BY name, id`, [tenant.id]);
  const products = await rows<LegacyProduct>(client, `SELECT id, groupId, name, description, price, sortOrder, mediaPath, mediaType FROM "Product" WHERE tenantId = ? ORDER BY sortOrder, name, id`, [tenant.id]);
  const fonts = await rows<LegacyFont>(client, `SELECT id, name, source, filePath FROM "Font" WHERE tenantId = ? ORDER BY id`, [tenant.id]);
  const assetIds = new Map<string, string>();
  let fontAssetId: string | null = null;
  const projectId = existing?.id ?? deterministicId("project", tenant.id);
  const transaction = await client.transaction("write");
  try {
    for (const product of products) {
      if (!product.mediaPath || product.mediaType?.toLowerCase() === "video") continue;
      const assetId = await ensureAsset(transaction, tenant.id, "IMAGE", product.name, product.mediaPath, imageMime(product.mediaPath));
      assetIds.set(product.mediaPath, assetId);
    }
    for (const font of fonts) {
      if (!font.filePath || font.source !== "custom") continue;
      const id = await ensureAsset(transaction, tenant.id, "FONT", font.name, font.filePath, fontMime(font.filePath));
      fontAssetId ??= id;
    }
    const document = existing
      ? validateCanvasDocument(canvasDocumentSchema.parse(normalizeLegacyCanvasDocument(JSON.parse(existing.draftJson))))
      : documentFor(tenant, groups, products, assetIds, fontAssetId);
    const publishedJson = existing?.publishedJson ?? JSON.stringify(document);
    const draftJson = JSON.stringify(document);
    const revision = existing?.draftRevision ?? 0;
    const publishedRevision = existing?.publishedRevision ?? revision;
    await transaction.execute({ sql: `INSERT INTO MenuProject (id, tenantId, draftJson, draftRevision, publishedJson, publishedRevision, publishedAt, schemaVersion, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, CURRENT_TIMESTAMP) ON CONFLICT(tenantId) DO UPDATE SET draftJson = excluded.draftJson, publishedJson = COALESCE(MenuProject.publishedJson, excluded.publishedJson), publishedRevision = COALESCE(MenuProject.publishedRevision, excluded.publishedRevision), publishedAt = COALESCE(MenuProject.publishedAt, CURRENT_TIMESTAMP), schemaVersion = 1, updatedAt = CURRENT_TIMESTAMP`, args: [projectId, tenant.id, draftJson, revision, publishedJson, publishedRevision] });
    const project = await oneOrNull<{ id: string }>(transaction, `SELECT id FROM MenuProject WHERE tenantId = ?`, [tenant.id]);
    if (!project) throw new Error(`No se pudo crear MenuProject para ${tenant.id}.`);
    const ids = [...new Set([...document.nodes.flatMap((node) => node.type === "image" ? [node.assetId] : node.type === "text" && node.fontAssetId ? [node.fontAssetId] : [])])];
    for (const scope of ["DRAFT", "PUBLISHED"] as const) {
      await transaction.execute({ sql: `DELETE FROM MenuAssetReference WHERE projectId = ? AND scope = ?`, args: [project.id, scope] });
      for (const assetId of ids) await transaction.execute({ sql: `INSERT OR IGNORE INTO MenuAssetReference (tenantId, projectId, assetId, scope) VALUES (?, ?, ?, ?)`, args: [tenant.id, project.id, assetId, scope] });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function ensureAsset(source: DbSource, tenantId: string, kind: "IMAGE" | "FONT", name: string, sourceKey: string, mimeType: string): Promise<string> {
  const existing = await oneOrNull<{ id: string }>(source, `SELECT id FROM MenuAsset WHERE tenantId = ? AND storageKey LIKE ? LIMIT 1`, [tenantId, `%/${sourceKey.split("/").pop()}`]);
  if (existing) return existing.id;
  const stat = await blobStore.stat(sourceKey);
  if (!stat) throw new Error(`Archivo legacy referenciado no encontrado: ${sourceKey}`);
  const content = await blobStore.read(sourceKey);
  const digest = createHash("sha256").update(content).digest("hex");
  const extension = sourceKey.includes(".") ? sourceKey.slice(sourceKey.lastIndexOf(".")).toLowerCase() : "";
  const storageKey = `tenants/${tenantId}/legacy/${digest}${extension}`;
  if (!(await blobStore.exists(storageKey))) await blobStore.put(storageKey, content);
  const id = deterministicId("asset", `${tenantId}:${kind}:${digest}`);
  await source.execute({ sql: `INSERT OR IGNORE INTO MenuAsset (id, tenantId, kind, name, storageKey, mimeType, byteSize, checksum, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`, args: [id, tenantId, kind, name, storageKey, mimeType, stat.size, digest] });
  const asset = await oneOrNull<{ id: string }>(source, `SELECT id FROM MenuAsset WHERE tenantId = ? AND checksum = ? LIMIT 1`, [tenantId, digest]);
  if (!asset) throw new Error(`No se pudo registrar el asset legacy ${sourceKey}.`);
  return asset.id;
}

async function verifyCutover(tenants: TenantRow[]): Promise<void> {
  for (const tenant of tenants) {
    const project = await oneOrNull<{ publishedJson: string | null }>(client, `SELECT publishedJson FROM MenuProject WHERE tenantId = ?`, [tenant.id]);
    if (!project?.publishedJson) throw new Error(`El tenant ${tenant.id} quedó sin publicación Canvas.`);
    validateCanvasDocument(canvasDocumentSchema.parse(JSON.parse(project.publishedJson)));
  }
}

function deterministicId(prefix: string, value: string): string {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 30)}`;
}

function imageMime(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function fontMime(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith(".woff2")) return "font/woff2";
  if (lower.endsWith(".woff")) return "font/woff";
  if (lower.endsWith(".ttf")) return "font/ttf";
  return "font/otf";
}

async function rows<T>(source: DbSource, sql: string, args: InArgs = []): Promise<T[]> {
  const result = await source.execute({ sql, args });
  return result.rows as T[];
}

async function oneOrNull<T>(source: DbSource, sql: string, args: InArgs = []): Promise<T | null> {
  return (await rows<T>(source, sql, args))[0] ?? null;
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => client.close());
