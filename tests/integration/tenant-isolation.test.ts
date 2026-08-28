import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { requireDisposableTestDatabase } from "../../scripts/require-test-database";

const integration = Boolean(process.env.TEST_DATABASE_URL);
const suite = integration ? describe : describe.skip;
const testDatabase = integration ? requireDisposableTestDatabase() : null;
const prisma = testDatabase ? createSqlitePrismaClient(testDatabase.connectionString) : null;
let tenantA = "";
let tenantB = "";
let groupA = "";
let groupB = "";
let productA = "";
let productB = "";
const cleanupKey = `integration/${Date.now()}.bin`;

suite("tenant isolation", () => {
  beforeAll(async () => {
    tenantA = (await prisma!.tenant.create({ data: { name: "A", slug: `test-a-${Date.now()}` } })).id;
    tenantB = (await prisma!.tenant.create({ data: { name: "B", slug: `test-b-${Date.now()}` } })).id;
    groupA = (await prisma!.group.create({ data: { tenantId: tenantA, name: "Bebidas" } })).id;
    groupB = (await prisma!.group.create({ data: { tenantId: tenantB, name: "Bebidas" } })).id;
    productA = (await prisma!.product.create({ data: { tenantId: tenantA, groupId: groupA, name: "Café", price: 3 } })).id;
    productB = (await prisma!.product.create({ data: { tenantId: tenantB, groupId: groupB, name: "Té", price: 2 } })).id;
  });

  afterAll(async () => {
    await prisma?.assetCleanupJob.deleteMany({ where: { storageKey: cleanupKey } });
    await prisma?.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await prisma?.$disconnect();
  });

  it("permits equal names but keeps rows separated by tenant", async () => {
    expect(await prisma!.group.count({ where: { tenantId: tenantA, name: "Bebidas" } })).toBe(1);
    expect(await prisma!.group.count({ where: { tenantId: tenantB, name: "Bebidas" } })).toBe(1);
    expect(await prisma!.group.count({ where: { tenantId: tenantA } })).toBe(1);
    expect((await prisma!.product.findMany({ where: { tenantId: tenantA } })).map(({ id }) => id)).toEqual([productA]);
    expect((await prisma!.product.findMany({ where: { tenantId: tenantB } })).map(({ id }) => id)).toEqual([productB]);
  });

  it("rejects cross-tenant group and product identifiers at the database boundary", async () => {
    await expect(prisma!.product.create({
      data: { tenantId: tenantA, groupId: groupB, name: "Intruso", price: 1 },
    })).rejects.toBeDefined();
    await expect(prisma!.featuredProduct.create({
      data: { tenantId: tenantA, productId: productB, position: 1 },
    })).rejects.toBeDefined();
    await expect(prisma!.group.update({
      where: { id_tenantId: { id: groupB, tenantId: tenantA } },
      data: { name: "No permitido" },
    })).rejects.toBeDefined();
  });

  it("enforces highlight slots 1-3 and one slot per product", async () => {
    await prisma!.featuredProduct.create({ data: { tenantId: tenantA, productId: productA, position: 1 } });
    await expect(prisma!.featuredProduct.create({
      data: { tenantId: tenantA, productId: productA, position: 2 },
    })).rejects.toBeDefined();
    await expect(prisma!.featuredProduct.create({
      data: { tenantId: tenantB, productId: productB, position: 4 },
    })).rejects.toBeDefined();
    expect(await prisma!.featuredProduct.count({ where: { tenantId: tenantA } })).toBe(1);
  });

  it("hides suspended tenants from active publication queries", async () => {
    const tenant = await prisma!.tenant.findUniqueOrThrow({ where: { id: tenantB } });
    await prisma!.tenant.update({ where: { id: tenantB }, data: { status: "SUSPENDED" } });
    expect(await prisma!.tenant.findFirst({ where: { slug: tenant.slug, status: "ACTIVE" } })).toBeNull();
    expect(await prisma!.tenant.findFirst({ where: { id: tenantA, status: "ACTIVE" } })).not.toBeNull();
  });

  it("keeps cleanup jobs idempotent and exposes the new operational indexes", async () => {
    await prisma!.assetCleanupJob.create({ data: { storageKey: cleanupKey } });
    await expect(prisma!.assetCleanupJob.create({ data: { storageKey: cleanupKey } })).rejects.toBeDefined();

    const indexes = await prisma!.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_schema
      WHERE type = 'index'
        AND name IN ('Session_adminId_idx', 'Session_expiresAt_idx', 'LoginThrottle_updatedAt_idx', 'AssetCleanupJob_availableAt_idx')
    `;
    expect(new Set(indexes.map(({ name }) => name))).toEqual(new Set([
      "Session_adminId_idx",
      "Session_expiresAt_idx",
      "LoginThrottle_updatedAt_idx",
      "AssetCleanupJob_availableAt_idx",
    ]));

    const foreignKeys = await prisma!.$queryRawUnsafe<Array<{ foreign_keys: number | bigint }>>("PRAGMA foreign_keys");
    expect(Number(foreignKeys[0]?.foreign_keys)).toBe(1);
    expect(await prisma!.$queryRawUnsafe<unknown[]>("PRAGMA foreign_key_check")).toEqual([]);
  });
});
