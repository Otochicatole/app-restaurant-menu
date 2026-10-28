import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { createTemplateDocument } from "../../src/modules/menu-editor/domain/template";
import { validateCanvasDocument } from "../../src/modules/menu-editor/domain/document-policy";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { requireDisposableTestDatabase } from "../../scripts/require-test-database";

const integration = Boolean(process.env.TEST_DATABASE_URL);
const suite = integration ? describe : describe.skip;
const database = integration ? requireDisposableTestDatabase() : null;
const prisma = database ? createSqlitePrismaClient(database.connectionString) : null;
let organizationA = "";
let organizationB = "";
let restaurantA = "";
let restaurantB = "";
let restaurantC = "";

suite("organization and restaurant isolation", () => {
  beforeAll(async () => {
    const suffix = `${Date.now()}`;
    organizationA = (await prisma!.organization.create({ data: { name: "A", slug: `test-org-a-${suffix}`, maxRestaurants: 2 } })).id;
    organizationB = (await prisma!.organization.create({ data: { name: "B", slug: `test-org-b-${suffix}` } })).id;
    for (const [index, organizationId] of [organizationA, organizationA, organizationB].entries()) {
      const slug = `test-restaurant-${index}-${suffix}`;
      const restaurant = await prisma!.restaurant.create({ data: { organizationId, name: slug, slug, landingSlug: slug } });
      if (index === 0) restaurantA = restaurant.id;
      if (index === 1) restaurantB = restaurant.id;
      if (index === 2) restaurantC = restaurant.id;
      await prisma!.menuProject.create({ data: { restaurantId: restaurant.id, name: slug, slug, isPrimary: true, draftJson: JSON.stringify(createTemplateDocument(slug)) } });
    }
    const project = await prisma!.menuProject.findUniqueOrThrow({ where: { restaurantId: restaurantA } });
    const asset = await prisma!.menuAsset.create({ data: { restaurantId: restaurantA, kind: "IMAGE", name: "A", storageKey: `restaurants/${restaurantA}/a.png`, mimeType: "image/png", byteSize: 1, checksum: `a-${suffix}` } });
    await prisma!.menuAssetReference.create({ data: { restaurantId: restaurantA, projectId: project.id, assetId: asset.id, scope: "PUBLISHED" } });
  });

  afterAll(async () => {
    await prisma?.organization.deleteMany({ where: { id: { in: [organizationA, organizationB] } } });
    await prisma?.$disconnect();
  });

  it("keeps sibling restaurants and separate organizations isolated", async () => {
    expect(await prisma!.restaurant.count({ where: { organizationId: organizationA } })).toBe(2);
    expect(await prisma!.menuProject.count({ where: { restaurantId: restaurantA } })).toBe(1);
    expect(await prisma!.menuAsset.count({ where: { restaurantId: { in: [restaurantB, restaurantC] } } })).toBe(0);
    expect(await prisma!.menuAssetReference.count({ where: { restaurantId: restaurantA, scope: "PUBLISHED" } })).toBe(1);
  });

  it("rejects cross-restaurant asset references and duplicate cards at the database boundary", async () => {
    const projectA = await prisma!.menuProject.findUniqueOrThrow({ where: { restaurantId: restaurantA } });
    const assetB = await prisma!.menuAsset.create({ data: { restaurantId: restaurantB, kind: "IMAGE", name: "B", storageKey: `restaurants/${restaurantB}/b.png`, mimeType: "image/png", byteSize: 1, checksum: `b-${Date.now()}` } });
    await expect(prisma!.menuAssetReference.create({ data: { restaurantId: restaurantA, projectId: projectA.id, assetId: assetB.id, scope: "DRAFT" } })).rejects.toBeDefined();
    await expect(prisma!.menuProject.create({ data: { restaurantId: restaurantA, name: "Duplicate", slug: `duplicate-${Date.now()}`, draftJson: "{}" } })).rejects.toBeDefined();
  });

  it("rejects a reservation linked to an event in a sibling restaurant", async () => {
    const event = await prisma!.restaurantEvent.create({ data: { restaurantId: restaurantA, title: "A", date: "2026-11-01", startTime: "20:00" } });
    await expect(prisma!.tableReservation.create({ data: { restaurantId: restaurantB, eventId: event.id, code: "CROSS", customerName: "Test", customerPhone: "12345678", date: "2026-11-01", time: "20:00" } })).rejects.toBeDefined();
  });

  it("rejects private-template references across sibling restaurants", async () => {
    const asset = await prisma!.menuAsset.findFirstOrThrow({ where: { restaurantId: restaurantA } });
    const template = await prisma!.menuTemplate.create({ data: { restaurantId: restaurantB, name: "B", documentJson: JSON.stringify(createTemplateDocument("B")) } });
    await expect(prisma!.menuTemplateAssetReference.create({ data: { restaurantId: restaurantA, templateId: template.id, assetId: asset.id } })).rejects.toBeDefined();
  });

  it("creates an organization and additional restaurants with exactly one valid blank card and enforces its quota", async () => {
    process.env.DATABASE_URL = database!.connectionString;
    process.env.JWT_SECRET ??= "integration-test-secret-organization-isolation";
    const { createRestaurant } = await import("../../src/modules/restaurant-management/infrastructure/prisma-restaurant-repository");
    const { PrismaOrganizationRepository } = await import("../../src/modules/organization-management/infrastructure/prisma-organization-repository");
    const suffix = `create-${Date.now()}`;
    const organization = await new PrismaOrganizationRepository().create({ name: "Franquicia", restaurantName: "Primero", slug: suffix, email: `${suffix}@integration.test`, passwordHash: "integration-hash" });
    try {
      expect(organization.restaurants).toHaveLength(1);
      const initialCard = await prisma!.menuProject.findUniqueOrThrow({ where: { restaurantId: organization.restaurants[0].id } });
      expect(validateCanvasDocument(JSON.parse(initialCard.draftJson)).nodes).toEqual([]);
      await prisma!.organization.update({ where: { id: organization.id }, data: { maxRestaurants: 2 } });
      const additional = await createRestaurant(organization.id, { name: "Segundo", slug: `${suffix}-second`, publicDescription: "Otra carta" });
      expect(await prisma!.menuProject.count({ where: { restaurantId: additional.id } })).toBe(1);
      const additionalCard = await prisma!.menuProject.findUniqueOrThrow({ where: { restaurantId: additional.id } });
      expect(validateCanvasDocument(JSON.parse(additionalCard.draftJson)).nodes).toEqual([]);
      await expect(createRestaurant(organization.id, { name: "Tercero", slug: `${suffix}-third`, publicDescription: "" })).rejects.toMatchObject({ code: "CONFLICT" });
      expect(await prisma!.restaurant.count({ where: { organizationId: organization.id } })).toBe(2);
    } finally {
      await prisma!.organization.delete({ where: { id: organization.id } });
    }
  });

  it("retains operational indexes and foreign-key integrity", async () => {
    const key = `integration/${Date.now()}.bin`;
    await prisma!.assetCleanupJob.create({ data: { storageKey: key } });
    await expect(prisma!.assetCleanupJob.create({ data: { storageKey: key } })).rejects.toBeDefined();
    const indexes = await prisma!.$queryRaw<Array<{ name: string }>>`SELECT name FROM sqlite_schema WHERE type = 'index' AND name IN ('Session_adminId_idx', 'Session_expiresAt_idx', 'LoginThrottle_updatedAt_idx', 'AssetCleanupJob_availableAt_idx')`;
    expect(indexes).toHaveLength(4);
    expect(await prisma!.$queryRawUnsafe<unknown[]>("PRAGMA foreign_key_check")).toEqual([]);
    await prisma!.assetCleanupJob.delete({ where: { storageKey: key } });
  });

  it.each(["restaurant", "organization"])("cleans owned public-template snapshots when deleting a %s", async (kind) => {
    process.env.DATABASE_URL = database!.connectionString;
    process.env.JWT_SECRET ??= "integration-test-secret-organization-isolation";
    const { deleteRestaurants } = await import("../../src/modules/restaurant-management/infrastructure/prisma-restaurant-repository");
    const { PrismaOrganizationRepository } = await import("../../src/modules/organization-management/infrastructure/prisma-organization-repository");
    const suffix = `${kind}-${Date.now()}`;
    const organization = await prisma!.organization.create({ data: { name: suffix, slug: suffix } });
    const restaurant = await prisma!.restaurant.create({ data: { organizationId: organization.id, name: suffix, slug: suffix, landingSlug: suffix } });
    const ownedKey = `templates/integration-${suffix}/owned.png`;
    const globalKey = `templates/integration-${suffix}/global.png`;
    const makeTemplate = (restaurantId: string | null, storageKey: string) => prisma!.menuTemplate.create({ data: {
      restaurantId, name: suffix, documentJson: JSON.stringify(createTemplateDocument(suffix)), visibility: "PUBLIC", status: "PUBLISHED",
      assets: { create: { kind: "IMAGE", name: "fixture", storageKey, mimeType: "image/png", byteSize: 1, checksum: suffix } },
    } });
    const owned = await makeTemplate(restaurant.id, ownedKey);
    const global = await makeTemplate(null, globalKey);
    try {
      if (kind === "restaurant") await deleteRestaurants(organization.id, [restaurant.id]);
      else await new PrismaOrganizationRepository().delete(organization.id, organization.slug);
      expect(await prisma!.menuTemplate.findUnique({ where: { id: owned.id } })).toBeNull();
      expect(await prisma!.menuTemplate.findUnique({ where: { id: global.id } })).not.toBeNull();
      expect(await prisma!.assetCleanupJob.findUnique({ where: { storageKey: ownedKey } })).not.toBeNull();
      expect(await prisma!.assetCleanupJob.findUnique({ where: { storageKey: globalKey } })).toBeNull();
      expect(await prisma!.assetCleanupJob.findUnique({ where: { storageKey: `restaurants/${restaurant.id}` } })).toMatchObject({ deletePrefix: true });
    } finally {
      await prisma!.organization.deleteMany({ where: { id: organization.id } });
      await prisma!.menuTemplate.deleteMany({ where: { id: global.id } });
      await prisma!.assetCleanupJob.deleteMany({ where: { storageKey: { in: [ownedKey, globalKey, `restaurants/${restaurant.id}`] } } });
    }
  });
});
