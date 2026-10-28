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
export default async function globalSetup() {
 const database = requireDisposableTestDatabase();
 const storageRoot = await prepareOwnedStorage();
 const prisma = createSqlitePrismaClient(database.connectionString);
 try {
  await cleanE2eRows(prisma);
  await prisma.admin.create({ data: { id: "e2e-admin-super", email: E2E.superAdmin.email, passwordHash: await bcrypt.hash(E2E.superAdmin.password, 4), role: "SUPER_ADMIN" } });
  await prisma.organization.create({ data: { id: "e2e-organization-cafe", name: "E2E Grupo Café", slug: "e2e-group-cafe", maxRestaurants: 4, admin: { create: { id: "e2e-admin-tenant", email: E2E.tenantAdmin.email, passwordHash: await bcrypt.hash(E2E.tenantAdmin.password, 4), role: "TENANT_ADMIN" } } } });
  for (const fixture of [
   { id: E2E.tenantAdmin.restaurantId, name: "E2E Café", slug: E2E.tenantAdmin.slug, assetId: "e2e-asset-cafe", assetName: "Café E2E", projectId: "e2e-project-cafe" },
   { id: E2E.branch.restaurantId, name: E2E.branch.name, slug: E2E.branch.slug, assetId: "e2e-asset-branch", assetName: "Sucursal E2E", projectId: "e2e-project-branch" },
  ]) {
   await prisma.restaurant.create({ data: { id: fixture.id, organizationId: "e2e-organization-cafe", name: fixture.name, slug: fixture.slug, landingSlug: fixture.slug, publicDescription: "Fixture Canvas", landingEnabled: true } });
   const storageKey = "restaurants/" + fixture.id + "/editor-assets/fixture.png";
   await writeFixtureAsset(storageRoot, storageKey);
   const image = await prisma.menuAsset.create({ data: { id: fixture.assetId, restaurantId: fixture.id, kind: "IMAGE", name: fixture.assetName, storageKey, mimeType: "image/png", byteSize: 68, checksum: "e2e-" + fixture.assetId, width: 1, height: 1 } });
   const document = createCanvasFixture(fixture.name, image.id);
   const project = await prisma.menuProject.create({ data: { id: fixture.projectId, restaurantId: fixture.id, name: fixture.name, slug: fixture.slug, publicDescription: "Fixture Canvas", isPrimary: true, draftJson: JSON.stringify(document), publishedJson: JSON.stringify(document), draftRevision: 0, publishedRevision: 0, publishedAt: new Date(), schemaVersion: 1 } });
   await prisma.menuAssetReference.createMany({ data: ["DRAFT", "PUBLISHED"].map((scope) => ({ restaurantId: fixture.id, projectId: project.id, assetId: image.id, scope: scope as "DRAFT" | "PUBLISHED" })) });
   await prisma.landingPage.create({ data: { restaurantId: fixture.id, htmlContent: "<h1>Landing de " + fixture.name + "</h1>", published: true, publishedAt: new Date() } });
   await prisma.reservationTimeSlot.create({ data: { restaurantId: fixture.id, time: fixture.id === E2E.tenantAdmin.restaurantId ? "20:00" : "21:00" } });
   await prisma.tableReservation.create({ data: { restaurantId: fixture.id, code: fixture.id, customerName: "Cliente de " + fixture.name, customerPhone: "5491112345678", date: "2099-12-20", time: "20:00", status: "CONFIRMED" } });
  }
  for (const fixture of [
   { account: E2E.forcedPasswordAdmin, id: "e2e-organization-force", name: "E2E Cambio", mustChangePassword: true },
   { account: E2E.otherTenant, id: "e2e-organization-other", name: "E2E Otro", mustChangePassword: false },
  ]) {
   await prisma.organization.create({ data: { id: fixture.id, name: fixture.name, slug: fixture.account.slug, admin: { create: { id: fixture.id + "-admin", email: fixture.account.email, passwordHash: await bcrypt.hash(fixture.account.password, 4), role: "TENANT_ADMIN", mustChangePassword: fixture.mustChangePassword } }, restaurants: { create: { id: fixture.account.restaurantId, name: fixture.name, slug: fixture.account.slug, landingSlug: fixture.account.slug, menuProject: { create: { id: fixture.id + "-project", name: fixture.name, slug: fixture.account.slug, draftJson: JSON.stringify(createCanvasFixture(fixture.name)), isPrimary: true } } } } } });
  }
  await prisma.organization.create({ data: { id: "e2e-organization-zoom", name: "E2E Zoom", slug: E2E.zoomMenu.slug, restaurants: { create: { id: "e2e-restaurant-zoom", name: "E2E Zoom", slug: E2E.zoomMenu.slug, landingSlug: E2E.zoomMenu.slug, menuProject: { create: { id: "e2e-project-zoom", name: "E2E Zoom", slug: E2E.zoomMenu.slug, draftJson: JSON.stringify(createZoomFixture()), publishedJson: JSON.stringify(createZoomFixture()), publishedRevision: 0, publishedAt: new Date(), isPrimary: true } } } } } });
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

async function cleanE2eRows(prisma: SqlitePrismaClient): Promise<void> {
 await prisma.$transaction([
  prisma.assetCleanupJob.deleteMany({ where: { OR: [{ storageKey: { startsWith: "restaurants/e2e-" } }, { storageKey: { startsWith: "tenants/e2e-" } }] } }),
  prisma.organization.deleteMany({ where: { OR: [{ id: { startsWith: E2E_ID_PREFIX } }, { slug: { startsWith: E2E_ID_PREFIX } }] } }),
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
