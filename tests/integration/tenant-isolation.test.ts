import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createTemplateDocument } from "../../src/modules/menu-editor/domain/template";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { requireDisposableTestDatabase } from "../../scripts/require-test-database";

const integration = Boolean(process.env.TEST_DATABASE_URL);
const suite = integration ? describe : describe.skip;
const database = integration ? requireDisposableTestDatabase() : null;
const prisma = database ? createSqlitePrismaClient(database.connectionString) : null;
let tenantA = "";
let tenantB = "";

suite("tenant isolation in Canvas", () => {
  beforeAll(async () => {
    tenantA = (await prisma!.tenant.create({ data: { name: "A", slug: `test-a-${Date.now()}` } })).id;
    tenantB = (await prisma!.tenant.create({ data: { name: "B", slug: `test-b-${Date.now()}` } })).id;
    const projectA = await prisma!.menuProject.create({ data: { tenantId: tenantA, draftJson: JSON.stringify(createTemplateDocument("A")), publishedJson: JSON.stringify(createTemplateDocument("A")), publishedRevision: 0, publishedAt: new Date(), schemaVersion: 1 } });
    const projectB = await prisma!.menuProject.create({ data: { tenantId: tenantB, draftJson: JSON.stringify(createTemplateDocument("B")), schemaVersion: 1 } });
    const assetA = await prisma!.menuAsset.create({ data: { tenantId: tenantA, kind: "IMAGE", name: "A", storageKey: `tenants/${tenantA}/a.png`, mimeType: "image/png", byteSize: 1, checksum: `a-${Date.now()}` } });
    await prisma!.menuAssetReference.create({ data: { tenantId: tenantA, projectId: projectA.id, assetId: assetA.id, scope: "PUBLISHED" } });
    expect(projectB.tenantId).toBe(tenantB);
  });

  afterAll(async () => {
    await prisma?.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await prisma?.$disconnect();
  });

  it("keeps projects and assets isolated by tenant", async () => {
    expect(await prisma!.menuProject.count({ where: { tenantId: tenantA } })).toBe(1);
    expect(await prisma!.menuAsset.count({ where: { tenantId: tenantB } })).toBe(0);
    expect(await prisma!.menuAssetReference.count({ where: { tenantId: tenantA, scope: "PUBLISHED" } })).toBe(1);
  });

  it("rejects cross-tenant asset references at the database boundary", async () => {
    const projectA = await prisma!.menuProject.findUniqueOrThrow({ where: { tenantId: tenantA } });
    const assetB = await prisma!.menuAsset.create({ data: { tenantId: tenantB, kind: "IMAGE", name: "B", storageKey: `tenants/${tenantB}/b.png`, mimeType: "image/png", byteSize: 1, checksum: `b-${Date.now()}` } });
    await expect(prisma!.menuAssetReference.create({ data: { tenantId: tenantA, projectId: projectA.id, assetId: assetB.id, scope: "DRAFT" } })).rejects.toBeDefined();
  });

  it("hides suspended tenants from active publication queries", async () => {
    await prisma!.tenant.update({ where: { id: tenantB }, data: { status: "SUSPENDED" } });
    expect(await prisma!.tenant.findFirst({ where: { id: tenantB, status: "ACTIVE" } })).toBeNull();
    expect(await prisma!.tenant.findFirst({ where: { id: tenantA, status: "ACTIVE" } })).not.toBeNull();
  });

  it("keeps cleanup jobs idempotent and exposes operational indexes", async () => {
    const key = `integration/${Date.now()}.bin`;
    await prisma!.assetCleanupJob.create({ data: { storageKey: key } });
    await expect(prisma!.assetCleanupJob.create({ data: { storageKey: key } })).rejects.toBeDefined();
    const indexes = await prisma!.$queryRaw<Array<{ name: string }>>`SELECT name FROM sqlite_schema WHERE type = 'index' AND name IN ('Session_adminId_idx', 'Session_expiresAt_idx', 'LoginThrottle_updatedAt_idx', 'AssetCleanupJob_availableAt_idx')`;
    expect(new Set(indexes.map(({ name }) => name))).toEqual(new Set(["Session_adminId_idx", "Session_expiresAt_idx", "LoginThrottle_updatedAt_idx", "AssetCleanupJob_availableAt_idx"]));
    expect(await prisma!.$queryRawUnsafe<unknown[]>("PRAGMA foreign_key_check")).toEqual([]);
  });
});
