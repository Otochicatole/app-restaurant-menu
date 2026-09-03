import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createTemplateDocument } from "../../src/modules/menu-editor/domain/template";
import { canvasNodeSchema, type CanvasNode } from "../../src/modules/menu-editor/contracts";
import { createSqlitePrismaClient, type SqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { requireDisposableTestDatabase } from "../../scripts/require-test-database";
import { E2E } from "./fixtures";

const E2E_ID_PREFIX = "e2e-";
const STORAGE_MARKER = ".playwright-storage-owner";
const STORAGE_MARKER_CONTENT = "app-restaurant-menu:e2e:v2\n";
const FIXTURE_IDS = {
  superAdmin: "e2e-admin-super",
  tenant: "e2e-tenant-cafe",
  tenantAdmin: "e2e-admin-tenant",
  forcedTenant: "e2e-tenant-force",
  forcedAdmin: "e2e-admin-force",
  otherTenant: "e2e-tenant-other",
  otherAdmin: "e2e-admin-other",
} as const;

export default async function globalSetup() {
  const database = requireDisposableTestDatabase();
  const storageRoot = await prepareOwnedStorage();
  const prisma = createSqlitePrismaClient(database.connectionString);
  try {
    await cleanE2eRows(prisma);
    await prisma.admin.create({ data: { id: FIXTURE_IDS.superAdmin, email: E2E.superAdmin.email, passwordHash: await bcrypt.hash(E2E.superAdmin.password, 4), role: "SUPER_ADMIN" } });

    const tenant = await createTenantFixture(prisma, { id: FIXTURE_IDS.tenant, adminId: FIXTURE_IDS.tenantAdmin, name: "E2E Café", ...E2E.tenantAdmin, mustChangePassword: false });
    const imageKey = `tenants/${tenant.id}/editor-assets/cafe-fixture.png`;
    await writeFixtureAsset(storageRoot, imageKey);
    const image = await prisma.menuAsset.create({ data: { id: "e2e-asset-cafe", tenantId: tenant.id, kind: "IMAGE", name: "Café E2E", storageKey: imageKey, mimeType: "image/png", byteSize: 68, checksum: "e2e-cafe-checksum", width: 1, height: 1 } });
    const document = createCanvasFixture(tenant.name, image.id);
    const project = await prisma.menuProject.create({ data: { id: "e2e-project-cafe", tenantId: tenant.id, draftJson: JSON.stringify(document), publishedJson: JSON.stringify(document), draftRevision: 0, publishedRevision: 0, publishedAt: new Date(), schemaVersion: 1 } });
    await prisma.menuAssetReference.create({ data: { tenantId: tenant.id, projectId: project.id, assetId: image.id, scope: "DRAFT" } });
    await prisma.menuAssetReference.create({ data: { tenantId: tenant.id, projectId: project.id, assetId: image.id, scope: "PUBLISHED" } });

    await createTenantFixture(prisma, { id: FIXTURE_IDS.forcedTenant, adminId: FIXTURE_IDS.forcedAdmin, name: "E2E Cambio", ...E2E.forcedPasswordAdmin, mustChangePassword: true });
    const other = await createTenantFixture(prisma, { id: FIXTURE_IDS.otherTenant, adminId: FIXTURE_IDS.otherAdmin, name: "E2E Otro", ...E2E.otherTenant, mustChangePassword: false });
    const otherDocument = createCanvasFixture(other.name);
    await prisma.menuProject.create({ data: { id: "e2e-project-other", tenantId: other.id, draftJson: JSON.stringify(otherDocument), schemaVersion: 1 } });

    const zoomDocument = createZoomFixture();
    await prisma.tenant.create({ data: { id: "e2e-tenant-zoom", name: "E2E Zoom", slug: E2E.zoomMenu.slug, menuProject: { create: { id: "e2e-project-zoom", draftJson: JSON.stringify(zoomDocument), publishedJson: JSON.stringify(zoomDocument), publishedRevision: 0, publishedAt: new Date(), schemaVersion: 1 } } } });
  } finally { await prisma.$disconnect(); }
}

function createZoomFixture() {
  const bounds = { x: -120, y: -80, width: E2E.zoomMenu.width, height: E2E.zoomMenu.height };
  const stripe = (id: string, offset: number, fill: string) => canvasNodeSchema.parse({ id, type: "shape", shape: "rect", link: null, x: bounds.x + bounds.width * offset, y: bounds.y, width: bounds.width / 10, height: bounds.height, fill });
  return {
    ...createTemplateDocument("E2E Zoom"),
    background: "#FFFFFF",
    canvasBounds: bounds,
    // Simulate a document published while the editor was zoomed in and panned.
    initialViewport: { x: 2380, y: 5000, width: 1000, height: 2000 },
    nodes: [stripe("zoom-left", 0, "#FF0000"), stripe("zoom-center", 0.45, "#00FF00"), stripe("zoom-right", 0.9, "#0000FF")],
  };
}

function createCanvasFixture(name: string, imageId?: string) {
  const document = createTemplateDocument(name);
  const nodes: CanvasNode[] = [...document.nodes, { id: `${name}-product`, name: "Café E2E", type: "text", x: 120, y: 560, width: 500, height: 50, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, layerOrder: document.nodes.length, link: null, text: "Café E2E", modalAssetId: imageId ?? null, fontAssetId: null, fontFamily: "Arial", fontSize: 34, fontWeight: "700", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "middle", lineHeight: 1.2, letterSpacing: 0, fill: "#171717", semanticRole: "label" }];
  if (imageId) nodes.push({ id: `${name}-image`, name: "Imagen Café E2E", type: "image", assetId: imageId, x: 700, y: 540, width: 240, height: 160, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, layerOrder: nodes.length, link: null, fit: "contain", cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, cornerRadius: 8, alt: "Café E2E" });
  return { ...document, nodes };
}

async function createTenantFixture(prisma: SqlitePrismaClient, input: { id: string; adminId: string; name: string; email: string; password: string; slug: string; mustChangePassword: boolean }) {
  return prisma.tenant.create({ data: { id: input.id, name: input.name, slug: input.slug, publicDescription: "Fixture Canvas", admin: { create: { id: input.adminId, email: input.email, passwordHash: await bcrypt.hash(input.password, 4), role: "TENANT_ADMIN", mustChangePassword: input.mustChangePassword } } } });
}

async function cleanE2eRows(prisma: SqlitePrismaClient): Promise<void> {
  await prisma.$transaction([
    prisma.assetCleanupJob.deleteMany({ where: { storageKey: { startsWith: `tenants/${E2E_ID_PREFIX}` } } }),
    prisma.tenant.deleteMany({ where: { OR: [{ id: { startsWith: E2E_ID_PREFIX } }, { slug: { startsWith: E2E_ID_PREFIX } }] } }),
    prisma.admin.deleteMany({ where: { OR: [{ id: { startsWith: E2E_ID_PREFIX } }, { email: { startsWith: E2E_ID_PREFIX } }] } }),
    prisma.loginThrottle.deleteMany(),
  ]);
}

async function prepareOwnedStorage(): Promise<string> {
  const root = playwrightStorageRoot();
  assertSafeStorageRoot(root);
  try {
    const entries = await readdir(root);
    const marker = await readMarker(root);
    if (entries.length > 0 && marker !== STORAGE_MARKER_CONTENT) throw new Error(`Refusing to clean unowned Playwright storage: ${root}`);
    if (marker === STORAGE_MARKER_CONTENT) await rm(root, { recursive: true, force: true });
  } catch (error) { if (!isMissing(error)) throw error; }
  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, STORAGE_MARKER), STORAGE_MARKER_CONTENT, { flag: "wx" });
  return root;
}

async function writeFixtureAsset(root: string, storageKey: string): Promise<void> {
  const target = path.resolve(root, storageKey);
  if (!target.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  await mkdir(path.dirname(target), { recursive: true });
  const onePixelPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  await writeFile(target, onePixelPng, { flag: "wx" });
}

function playwrightStorageRoot(): string { return path.resolve(process.env.PLAYWRIGHT_STORAGE_ROOT ?? path.join("test-results", "e2e-storage")); }
function assertSafeStorageRoot(root: string): void { const workspace = path.resolve(process.cwd()); if (root === workspace || root === path.parse(root).root) throw new Error("Playwright storage cannot be the workspace or filesystem root"); if (!/(?:^|[-_.])(playwright|e2e|test|ci)(?:[-_.]|$)/i.test(path.basename(root))) throw new Error("PLAYWRIGHT_STORAGE_ROOT must have a dedicated playwright, e2e, test, or ci directory name"); }
async function readMarker(root: string): Promise<string | null> { try { return await readFile(path.join(root, STORAGE_MARKER), "utf8"); } catch (error) { if (isMissing(error)) return null; throw error; } }
function isMissing(error: unknown): error is NodeJS.ErrnoException { return error instanceof Error && "code" in error && error.code === "ENOENT"; }
