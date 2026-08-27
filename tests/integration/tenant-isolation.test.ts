import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const integration = Boolean(process.env.TEST_DATABASE_URL);
const suite = integration ? describe : describe.skip;
const prisma = integration ? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL! }) }) : null;
let tenantA = "";
let tenantB = "";

suite("tenant isolation", () => {
  beforeAll(async () => {
    tenantA = (await prisma!.tenant.create({ data: { name: "A", slug: `test-a-${Date.now()}` } })).id;
    tenantB = (await prisma!.tenant.create({ data: { name: "B", slug: `test-b-${Date.now()}` } })).id;
    await prisma!.group.create({ data: { tenantId: tenantA, name: "Bebidas" } });
    await prisma!.group.create({ data: { tenantId: tenantB, name: "Bebidas" } });
  });

  afterAll(async () => {
    await prisma?.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await prisma?.$disconnect();
  });

  it("permits equal names but keeps rows separated by tenant", async () => {
    expect(await prisma!.group.count({ where: { tenantId: tenantA, name: "Bebidas" } })).toBe(1);
    expect(await prisma!.group.count({ where: { tenantId: tenantB, name: "Bebidas" } })).toBe(1);
    expect(await prisma!.group.count({ where: { tenantId: tenantA } })).toBe(1);
  });
});
