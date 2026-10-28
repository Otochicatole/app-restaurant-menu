import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../src/generated/prisma/client";
import { canvasDocumentSchema, type MenuAssetKind } from "../../src/modules/menu-editor/contracts";
import type { PortableTemplate, PortableTemplateAsset } from "../../src/modules/menu-editor/domain/template-bundle";
import type { BlobStore } from "../../src/platform/storage/blob-store";
import { createSqlitePrismaClient } from "../../src/platform/database/sqlite-client";
import { prepareDisposableTestDatabase, requireDisposableTestDatabase } from "../../scripts/require-test-database";

const baseDatabase = process.env.TEST_DATABASE_URL ? requireDisposableTestDatabase() : null;
const suite = baseDatabase ? describe : describe.skip;

class MemoryBlobStore implements BlobStore {
  readonly files = new Map<string, Buffer>();
  reads = 0;
  failOnPut: number | null = null;
  private puts = 0;
  async put(key: string, content: Buffer) {
    this.files.set(key, content);
    if (++this.puts === this.failOnPut) throw new Error("storage unavailable");
  }
  async read(key: string) {
    this.reads += 1;
    const content = this.files.get(key);
    if (!content) throw new Error("missing file");
    return content;
  }
  async readRange(key: string, start: number, end: number) { return (await this.read(key)).subarray(start, end + 1); }
  open(key: string) {
    const content = this.files.get(key);
    return new ReadableStream<Uint8Array>({ start(controller) { if (content) controller.enqueue(content); controller.close(); } });
  }
  async stat(key: string) { const content = this.files.get(key); return content ? { size: content.length, updatedAt: new Date() } : null; }
  async exists(key: string) { return this.files.has(key); }
  async delete(key: string) { this.files.delete(key); }
  async deletePrefix(prefix: string) { for (const key of this.files.keys()) if (key.startsWith(prefix)) this.files.delete(key); }
  async move(source: string, destination: string) { this.files.set(destination, await this.read(source)); this.files.delete(source); }
}

function asset(id: string, size = 6, fill = "a"): PortableTemplateAsset {
  const content = Buffer.alloc(size, fill);
  return { id, name: `${id}.png`, kind: "IMAGE", mimeType: "image/png", byteSize: size,
    checksum: createHash("sha256").update(content).digest("hex"), width: null, height: null, fontFamily: null, content };
}

function portable(assets: PortableTemplateAsset[]): PortableTemplate {
  return { name: "Quota fixture", description: "", assets, document: canvasDocumentSchema.parse({
    schemaVersion: 1, background: "#FFFFFF", initialViewport: { x: 0, y: 0, width: 1240, height: 900 },
    canvasBounds: { x: 0, y: 0, width: 1240, height: 900 }, groups: [],
    nodes: assets.map((item, index) => ({ id: `image-${index}`, type: "image", assetId: item.id,
      x: index * 100, y: 0, width: 100, height: 100, link: null })),
  }) };
}

suite("transactional asset quotas", () => {
  let first: PrismaClient;
  let second: PrismaClient;
  let storage: MemoryBlobStore;
  let TemplateRepository: typeof import("../../src/modules/menu-editor/infrastructure/prisma-template-repository").PrismaTemplateRepository;
  let EditorRepository: typeof import("../../src/modules/menu-editor/infrastructure/prisma-menu-editor-repository").PrismaMenuEditorRepository;
  const organizations: string[] = [];

  beforeAll(async () => {
    const databasePath = path.join(path.dirname(baseDatabase!.databasePath), `asset-quota-${randomUUID()}-test.db`);
    const database = await prepareDisposableTestDatabase(`file:${databasePath.replaceAll(path.sep, "/")}`);
    process.env.DATABASE_URL = database.connectionString;
    process.env.JWT_SECRET ??= "asset-quota-integration-secret-at-least-32-characters";
    first = createSqlitePrismaClient(database.connectionString);
    second = createSqlitePrismaClient(database.connectionString);
    ({ PrismaTemplateRepository: TemplateRepository } = await import("../../src/modules/menu-editor/infrastructure/prisma-template-repository"));
    ({ PrismaMenuEditorRepository: EditorRepository } = await import("../../src/modules/menu-editor/infrastructure/prisma-menu-editor-repository"));
  }, 30_000);
  beforeEach(() => { storage = new MemoryBlobStore(); });
  afterEach(async () => {
    await first.organization.deleteMany({ where: { id: { in: organizations.splice(0) } } });
  });
  afterAll(async () => { await Promise.all([first?.$disconnect(), second?.$disconnect()]); });

  async function restaurant(quota: number) {
    const slug = `asset-quota-${randomUUID()}`;
    const organization = await first.organization.create({ data: { name: slug, slug } });
    organizations.push(organization.id);
    return first.restaurant.create({ data: { organizationId: organization.id, name: slug, slug, landingSlug: slug, assetQuotaBytes: quota } });
  }

  async function createStoredAsset(restaurantId: string, input: PortableTemplateAsset, kind: MenuAssetKind = input.kind, mimeType = input.mimeType) {
    const storageKey = `restaurants/${restaurantId}/fixture/${randomUUID()}`;
    storage.files.set(storageKey, Buffer.from(input.content));
    return first.menuAsset.create({ data: { restaurantId, kind, name: input.name, storageKey,
      mimeType, byteSize: input.byteSize, checksum: input.checksum } });
  }

  async function publicTemplate(restaurantId: string, input: PortableTemplateAsset) {
    const template = portable([input]);
    const storageKey = `templates/${randomUUID()}`;
    storage.files.set(storageKey, Buffer.from(input.content));
    return first.menuTemplate.create({ data: { restaurantId, name: template.name, documentJson: JSON.stringify(template.document),
      visibility: "PUBLIC", status: "PUBLISHED", assets: { create: { id: input.id, kind: input.kind, name: input.name,
        storageKey, mimeType: input.mimeType, byteSize: input.byteSize, checksum: input.checksum } } } });
  }

  it("lets only one of two concurrent uploads consume the remaining quota", async () => {
    const owner = await restaurant(10);
    const input = asset("upload", 6);
    const commands = [first, second].map((client) => new EditorRepository(client).createAsset({
      restaurantId: owner.id, kind: input.kind, name: input.name, mimeType: input.mimeType,
      byteSize: input.byteSize, checksum: input.checksum, storageKey: `restaurants/${owner.id}/${randomUUID()}`,
    }));
    const results = await Promise.allSettled(commands);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { code: "BAD_REQUEST" } });
    expect(await first.menuAsset.count({ where: { restaurantId: owner.id } })).toBe(1);
  });

  it("keeps concurrent imports within quota and removes the rejected import's files", async () => {
    const owner = await restaurant(10);
    const results = await Promise.allSettled([first, second].map((client, index) =>
      new TemplateRepository(client, storage).importPortable(owner.id, portable([asset(`import-${index}`, 6, String(index))]))));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { code: "BAD_REQUEST" } });
    expect(await first.menuAsset.aggregate({ where: { restaurantId: owner.id }, _sum: { byteSize: true } })).toMatchObject({ _sum: { byteSize: 6 } });
    expect(await first.menuTemplate.count({ where: { restaurantId: owner.id } })).toBe(1);
    expect(storage.files.size).toBe(1);
  });

  it("deduplicates concurrent identical imports after taking a fresh transaction snapshot", async () => {
    const owner = await restaurant(6);
    const results = await Promise.all([first, second].map((client, index) =>
      new TemplateRepository(client, storage).importPortable(owner.id, portable([asset(`identical-${index}`)]))));
    expect(results).toHaveLength(2);
    expect(await first.menuAsset.count({ where: { restaurantId: owner.id } })).toBe(1);
    expect(await first.menuTemplateAssetReference.count({ where: { restaurantId: owner.id } })).toBe(2);
    expect(storage.files.size).toBe(1);
  });

  it("counts duplicate content inside one imported document only once", async () => {
    const owner = await restaurant(6);
    const template = await new TemplateRepository(first, storage).importPortable(owner.id, portable([asset("duplicate-a"), asset("duplicate-b")]));
    const ids = template.document.nodes.flatMap((node) => node.type === "image" ? [node.assetId] : []);
    expect(new Set(ids).size).toBe(1);
    expect(await first.menuAsset.count({ where: { restaurantId: owner.id } })).toBe(1);
    expect(storage.files.size).toBe(1);
  });

  it("checks quota atomically when two public templates are applied concurrently", async () => {
    const owner = await restaurant(10);
    const templates = await Promise.all([0, 1].map((index) => publicTemplate(owner.id, asset(`apply-${randomUUID()}`, 6, String(index)))));
    const results = await Promise.allSettled([first, second].map((client, index) => new TemplateRepository(client, storage).apply(owner.id, templates[index].id)));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { code: "BAD_REQUEST" } });
    const rows = await first.menuAsset.findMany({ where: { restaurantId: owner.id } });
    expect(rows).toHaveLength(1);
    expect(storage.files.has(rows[0].storageKey)).toBe(true);
    expect(storage.files.size).toBe(3);
  });

  it("reuses existing assets when applying a public template at the quota limit", async () => {
    const owner = await restaurant(6);
    const input = asset(`public-${randomUUID()}`);
    const existing = await createStoredAsset(owner.id, input);
    const template = await publicTemplate(owner.id, input);
    storage.failOnPut = 1;
    const document = await new TemplateRepository(first, storage).apply(owner.id, template.id);
    expect(document.nodes[0]).toMatchObject({ assetId: existing.id });
    expect(await first.menuAsset.count({ where: { restaurantId: owner.id } })).toBe(1);
    expect(storage.files.size).toBe(2);
    expect(storage.reads).toBe(0);
  });

  it.each([{ kind: "FONT" as const, mimeType: "font/woff" }, { kind: "IMAGE" as const, mimeType: "image/webp" }])(
    "does not reuse matching bytes with different kind or MIME ($kind / $mimeType)", async ({ kind, mimeType }) => {
      const owner = await restaurant(12);
      const input = asset(`distinct-${randomUUID()}`);
      const existing = await createStoredAsset(owner.id, input, kind, mimeType);
      const template = await publicTemplate(owner.id, input);
      const document = await new TemplateRepository(first, storage).apply(owner.id, template.id);
      expect(document.nodes[0]).not.toMatchObject({ assetId: existing.id });
      expect(await first.menuAsset.count({ where: { restaurantId: owner.id } })).toBe(2);
    },
  );

  it("removes partially staged files and creates no records after storage failure", async () => {
    const owner = await restaurant(20);
    storage.failOnPut = 2;
    await expect(new TemplateRepository(first, storage).importPortable(owner.id, portable([asset("first"), asset("second", 6, "b")]))).rejects.toThrow("storage unavailable");
    expect(await first.menuAsset.count({ where: { restaurantId: owner.id } })).toBe(0);
    expect(await first.menuTemplate.count({ where: { restaurantId: owner.id } })).toBe(0);
    expect(storage.files.size).toBe(0);
  });

  it("does not create an asset before copying a public template file successfully", async () => {
    const owner = await restaurant(20);
    const template = await publicTemplate(owner.id, asset(`failed-public-${randomUUID()}`));
    storage.failOnPut = 1;
    await expect(new TemplateRepository(first, storage).apply(owner.id, template.id)).rejects.toThrow("storage unavailable");
    expect(await first.menuAsset.count({ where: { restaurantId: owner.id } })).toBe(0);
    expect(storage.files.size).toBe(1);
  });

  it("rolls back imported assets and cleans files when creating their template fails", async () => {
    const owner = await restaurant(20);
    const broken = portable([asset("broken")]);
    broken.document.nodes = [{ ...broken.document.nodes[0], id: "" }];
    await expect(new TemplateRepository(first, storage).importPortable(owner.id, broken)).rejects.toBeDefined();
    expect(await first.menuAsset.count({ where: { restaurantId: owner.id } })).toBe(0);
    expect(storage.files.size).toBe(0);
  });

  it("reports a conflict if a reusable asset disappears while other files are being staged", async () => {
    const owner = await restaurant(12);
    const reusable = asset("removed-during-import");
    const existing = await createStoredAsset(owner.id, reusable);
    const put = storage.put.bind(storage);
    storage.put = async (key, content) => {
      await put(key, content);
      await first.menuAsset.delete({ where: { id: existing.id } });
    };
    await expect(new TemplateRepository(first, storage).importPortable(owner.id, portable([reusable, asset("new-file", 6, "b")]))).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await first.menuAsset.count({ where: { restaurantId: owner.id } })).toBe(0);
    expect(await first.menuTemplate.count({ where: { restaurantId: owner.id } })).toBe(0);
    expect([...storage.files.keys()]).toEqual([existing.storageKey]);
  });

  it("continues allowing separate uploads with identical content", async () => {
    const owner = await restaurant(12);
    const input = asset("duplicate-upload");
    const repository = new EditorRepository(first);
    for (let index = 0; index < 2; index += 1) await repository.createAsset({ restaurantId: owner.id, kind: input.kind,
      name: input.name, mimeType: input.mimeType, byteSize: input.byteSize, checksum: input.checksum,
      storageKey: `restaurants/${owner.id}/${randomUUID()}` });
    expect(await first.menuAsset.count({ where: { restaurantId: owner.id } })).toBe(2);
  });
});
