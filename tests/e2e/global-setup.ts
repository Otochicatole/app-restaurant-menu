import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { createSqlitePrismaClient, type SqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { requireDisposableTestDatabase } from "../../scripts/require-test-database";
import { E2E } from "./fixtures";

const E2E_ID_PREFIX = "e2e-";
const STORAGE_MARKER = ".playwright-storage-owner";
const STORAGE_MARKER_CONTENT = "app-restaurant-menu:e2e:v1\n";
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

    await prisma.admin.create({
      data: {
        id: FIXTURE_IDS.superAdmin,
        email: E2E.superAdmin.email,
        passwordHash: await bcrypt.hash(E2E.superAdmin.password, 4),
        role: "SUPER_ADMIN",
      },
    });

    const tenant = await createTenantFixture(prisma, {
      id: FIXTURE_IDS.tenant,
      adminId: FIXTURE_IDS.tenantAdmin,
      name: "E2E Café",
      ...E2E.tenantAdmin,
      mustChangePassword: false,
    });
    const group = await prisma.group.create({
      data: { tenantId: tenant.id, name: "Bebidas", description: "Calientes y frías" },
    });
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        groupId: group.id,
        name: "Café E2E",
        description: "Tostado reciente",
        price: 4.5,
        sortOrder: 0,
      },
    });
    const storageKey = `tenants/${tenant.id}/products/${product.id}-fixture.png`;
    await prisma.product.update({
      where: { id: product.id },
      data: { mediaPath: storageKey, mediaType: "image" },
    });
    await prisma.featuredProduct.create({
      data: { tenantId: tenant.id, productId: product.id, position: 1 },
    });
    await writeFixtureAsset(storageRoot, storageKey);

    await createTenantFixture(prisma, {
      id: FIXTURE_IDS.forcedTenant,
      adminId: FIXTURE_IDS.forcedAdmin,
      name: "E2E Cambio",
      ...E2E.forcedPasswordAdmin,
      mustChangePassword: true,
    });
    const other = await createTenantFixture(prisma, {
      id: FIXTURE_IDS.otherTenant,
      adminId: FIXTURE_IDS.otherAdmin,
      name: "E2E Otro",
      ...E2E.otherTenant,
      mustChangePassword: false,
    });
    const otherGroup = await prisma.group.create({
      data: { tenantId: other.id, name: "Privado", description: "Otro tenant" },
    });
    await prisma.product.create({
      data: { tenantId: other.id, groupId: otherGroup.id, name: "Producto secreto E2E", price: 99 },
    });
  } finally {
    await prisma.$disconnect();
  }
}

async function createTenantFixture(
  prisma: SqlitePrismaClient,
  input: {
    id: string;
    adminId: string;
    name: string;
    email: string;
    password: string;
    slug: string;
    mustChangePassword: boolean;
  },
) {
  return prisma.tenant.create({
    data: {
      id: input.id,
      name: input.name,
      slug: input.slug,
      homePage: { create: { title: `Carta de ${input.name}`, description: "Fixture Playwright" } },
      admin: {
        create: {
          id: input.adminId,
          email: input.email,
          passwordHash: await bcrypt.hash(input.password, 4),
          role: "TENANT_ADMIN",
          mustChangePassword: input.mustChangePassword,
        },
      },
    },
  });
}

async function cleanE2eRows(prisma: SqlitePrismaClient): Promise<void> {
  await prisma.$transaction([
    prisma.assetCleanupJob.deleteMany({ where: { storageKey: { startsWith: `tenants/${E2E_ID_PREFIX}` } } }),
    prisma.tenant.deleteMany({
      where: { OR: [{ id: { startsWith: E2E_ID_PREFIX } }, { slug: { startsWith: E2E_ID_PREFIX } }] },
    }),
    prisma.admin.deleteMany({
      where: { OR: [{ id: { startsWith: E2E_ID_PREFIX } }, { email: { startsWith: E2E_ID_PREFIX } }] },
    }),
    prisma.loginThrottle.deleteMany(),
  ]);
}

async function prepareOwnedStorage(): Promise<string> {
  const root = playwrightStorageRoot();
  assertSafeStorageRoot(root);

  try {
    const entries = await readdir(root);
    const marker = await readMarker(root);
    if (entries.length > 0 && marker !== STORAGE_MARKER_CONTENT) {
      throw new Error(`Refusing to clean unowned Playwright storage: ${root}`);
    }
    if (marker === STORAGE_MARKER_CONTENT) {
      await rm(root, { recursive: true, force: true });
    }
  } catch (error) {
    if (!isMissing(error)) throw error;
  }

  await mkdir(root, { recursive: true });
  await writeFile(path.join(root, STORAGE_MARKER), STORAGE_MARKER_CONTENT, { flag: "wx" });
  return root;
}

async function writeFixtureAsset(root: string, storageKey: string): Promise<void> {
  const target = path.resolve(root, storageKey);
  if (!target.startsWith(root + path.sep)) throw new Error("Invalid E2E storage key");
  await mkdir(path.dirname(target), { recursive: true });
  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await writeFile(target, onePixelPng, { flag: "wx" });
}

function playwrightStorageRoot(): string {
  return path.resolve(process.env.PLAYWRIGHT_STORAGE_ROOT ?? path.join("test-results", "e2e-storage"));
}

function assertSafeStorageRoot(root: string): void {
  const workspace = path.resolve(process.cwd());
  if (root === workspace || root === path.parse(root).root) {
    throw new Error("Playwright storage cannot be the workspace or filesystem root");
  }
  if (!/(?:^|[-_.])(playwright|e2e|test|ci)(?:[-_.]|$)/i.test(path.basename(root))) {
    throw new Error("PLAYWRIGHT_STORAGE_ROOT must have a dedicated playwright, e2e, test, or ci directory name");
  }
}

async function readMarker(root: string): Promise<string | null> {
  try {
    return await readFile(path.join(root, STORAGE_MARKER), "utf8");
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
}

function isMissing(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
