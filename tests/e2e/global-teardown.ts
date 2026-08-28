import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { requireDisposableTestDatabase } from "../../scripts/require-test-database";

const E2E_ID_PREFIX = "e2e-";
const STORAGE_MARKER = ".playwright-storage-owner";
const STORAGE_MARKER_CONTENT = "app-restaurant-menu:e2e:v1\n";

export default async function globalTeardown() {
  const database = requireDisposableTestDatabase();
  const results = await Promise.allSettled([
    cleanE2eRows(database.connectionString),
    removeOwnedStorage(),
  ]);
  const errors = results.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
  if (errors.length > 0) {
    throw new AggregateError(errors, "Playwright teardown failed");
  }
}

async function cleanE2eRows(connectionString: string): Promise<void> {
  const prisma = createSqlitePrismaClient(connectionString);
  try {
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
  } finally {
    await prisma.$disconnect();
  }
}

async function removeOwnedStorage(): Promise<void> {
  const root = path.resolve(process.env.PLAYWRIGHT_STORAGE_ROOT ?? path.join("test-results", "e2e-storage"));
  assertSafeStorageRoot(root);

  let marker: string;
  try {
    marker = await readFile(path.join(root, STORAGE_MARKER), "utf8");
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }

  if (marker !== STORAGE_MARKER_CONTENT) {
    throw new Error(`Refusing to remove unowned Playwright storage: ${root}`);
  }
  await rm(root, { recursive: true, force: true });
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

function isMissing(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
