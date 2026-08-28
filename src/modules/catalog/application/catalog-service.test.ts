import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/platform/application/errors";
import { createCatalogService } from "./catalog-service";
import { CatalogRuleViolation } from "../domain/catalog-rules";
import type { CatalogRepository, GroupRecord, ProductMediaStorage, ProductRecord } from "./ports";

const baseGroup: GroupRecord = {
  id: "group-1",
  name: "Bebidas",
  description: "Calientes",
  productCount: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const baseProduct: ProductRecord = {
  id: "product-1",
  name: "Café",
  description: "",
  price: 3,
  groupId: "group-1",
  groupName: "Bebidas",
  sortOrder: 0,
  mediaKey: null,
  mediaType: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("catalog service media flow", () => {
  it("writes the new blob before committing its database reference", async () => {
    const events: string[] = [];
    const repository = repositoryStub({
      findProduct: vi.fn(async () => { events.push("find-product"); return baseProduct; }),
      replaceProductMedia: vi.fn(async (command) => {
        events.push("commit-reference-and-cleanup-job");
        return { ...baseProduct, mediaKey: command.storageKey, mediaType: command.mediaType, updatedAt: new Date("2026-01-02T00:00:00.000Z") };
      }),
    });
    const storage = storageStub({
      putProductMedia: vi.fn(async () => { events.push("write-new-blob"); return "tenants/t/products/p-new.png"; }),
    });
    const service = createCatalogService({
      repository,
      mediaStorage: storage,
      productMediaUrl: ({ productId, version }) => `/media/${productId}?v=${version}`,
    });
    const content = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const product = await service.saveProductMedia({
      tenantId: "tenant-1",
      tenantSlug: "cafe",
      productId: baseProduct.id,
      file: { type: "image/png", size: content.byteLength, content },
    });

    expect(events).toEqual(["find-product", "write-new-blob", "commit-reference-and-cleanup-job"]);
    expect(product.mediaUrl).toBe(`/media/product-1?v=${new Date("2026-01-02T00:00:00.000Z").getTime()}`);
  });

  it("does not report success when the new reference cannot be committed", async () => {
    const repository = repositoryStub({
      findProduct: vi.fn(async () => baseProduct),
      replaceProductMedia: vi.fn(async () => { throw new Error("database unavailable"); }),
    });
    const storage = storageStub({ putProductMedia: vi.fn(async () => "recoverable/orphan.png") });
    const service = createCatalogService({ repository, mediaStorage: storage, productMediaUrl: () => "/media" });
    const content = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    await expect(service.saveProductMedia({
      tenantId: "tenant-1",
      tenantSlug: "cafe",
      productId: baseProduct.id,
      file: { type: "image/png", size: content.byteLength, content },
    })).rejects.toThrow("database unavailable");
  });

  it("keeps every catalog operation tenant scoped and maps records to public contracts", async () => {
    const repository = repositoryStub({
      listGroups: vi.fn(async () => [baseGroup]),
      findGroup: vi.fn(async () => baseGroup),
      createGroup: vi.fn(async () => baseGroup),
      updateGroup: vi.fn(async () => baseGroup),
      deleteGroup: vi.fn(async () => true),
      countGroups: vi.fn(async () => 1),
      listProducts: vi.fn(async () => [baseProduct]),
      findProduct: vi.fn(async () => baseProduct),
      createProduct: vi.fn(async () => baseProduct),
      updateProduct: vi.fn(async () => baseProduct),
      deleteProduct: vi.fn(async () => true),
      replaceProductOrder: vi.fn(async () => undefined),
      removeProductMedia: vi.fn(async () => baseProduct),
      countProducts: vi.fn(async () => 1),
    });
    const service = createCatalogService({
      repository,
      mediaStorage: storageStub({}),
      productMediaUrl: ({ productId }) => `/media/${productId}`,
    });

    await expect(service.listGroups({ tenantId: "tenant-1" })).resolves.toMatchObject([{ id: "group-1" }]);
    await expect(service.getGroup({ tenantId: "tenant-1", groupId: "group-1" })).resolves.toMatchObject({ name: "Bebidas" });
    await expect(service.createGroup({ tenantId: "tenant-1", input: { name: "Bebidas", description: "" } })).resolves.toMatchObject({ id: "group-1" });
    await expect(service.updateGroup({ tenantId: "tenant-1", groupId: "group-1", input: { name: "Frías" } })).resolves.toMatchObject({ id: "group-1" });
    await expect(service.countGroups({ tenantId: "tenant-1" })).resolves.toBe(1);
    await expect(service.listProducts({ tenantId: "tenant-1", tenantSlug: "cafe" })).resolves.toMatchObject([{ id: "product-1", mediaUrl: null }]);
    await expect(service.getProduct({ tenantId: "tenant-1", tenantSlug: "cafe", productId: "product-1" })).resolves.toMatchObject({ groupName: "Bebidas" });
    await expect(service.createProduct({ tenantId: "tenant-1", tenantSlug: "cafe", input: { name: "Café", description: "", price: 3, groupId: "group-1" } })).resolves.toMatchObject({ id: "product-1" });
    await expect(service.updateProduct({ tenantId: "tenant-1", tenantSlug: "cafe", productId: "product-1", input: { price: 4 } })).resolves.toMatchObject({ price: 3 });
    await expect(service.countProducts({ tenantId: "tenant-1" })).resolves.toBe(1);
    await expect(service.getSnapshot({ tenantId: "tenant-1", tenantSlug: "cafe" })).resolves.toMatchObject({ groups: [{ id: "group-1" }], products: [{ id: "product-1" }] });
    await expect(service.removeProductMedia({ tenantId: "tenant-1", tenantSlug: "cafe", productId: "product-1" })).resolves.toMatchObject({ mediaUrl: null });
    await expect(service.reorderProducts({ tenantId: "tenant-1", groupId: "group-1", productIds: ["product-1"] })).resolves.toBeUndefined();
    await expect(service.deleteProduct({ tenantId: "tenant-1", productId: "product-1" })).resolves.toBeUndefined();
    await expect(service.deleteGroup({ tenantId: "tenant-1", groupId: "group-1" })).resolves.toBeUndefined();
  });

  it("translates missing records and catalog rules into application errors", async () => {
    const service = createCatalogService({
      repository: repositoryStub({
        replaceProductOrder: vi.fn(async () => { throw new CatalogRuleViolation("orden inválido"); }),
      }),
      mediaStorage: storageStub({}),
      productMediaUrl: () => "/media",
    });

    await expect(service.getGroup({ tenantId: "t", groupId: "g" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.updateGroup({ tenantId: "t", groupId: "g", input: {} })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.deleteGroup({ tenantId: "t", groupId: "g" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.getProduct({ tenantId: "t", tenantSlug: "slug", productId: "p" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.updateProduct({ tenantId: "t", tenantSlug: "slug", productId: "p", input: {} })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.deleteProduct({ tenantId: "t", productId: "p" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.removeProductMedia({ tenantId: "t", tenantSlug: "slug", productId: "p" })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.reorderProducts({ tenantId: "t", groupId: "g", productIds: [] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("describes and streams tenant media without exposing its storage key", async () => {
    const opened = new ReadableStream<Uint8Array>();
    const repository = repositoryStub({
      findProductMedia: vi.fn(async () => ({ storageKey: "opaque/product.png", mediaType: "image" as const })),
    });
    const storage = storageStub({
      stat: vi.fn(async () => ({ size: 8, updatedAt: new Date("2026-01-03T00:00:00.000Z"), contentType: "image/png" })),
      open: vi.fn(() => opened),
    });
    const service = createCatalogService({ repository, mediaStorage: storage, productMediaUrl: () => "/media" });
    const scope = { tenantId: "tenant-1", productId: "product-1" };

    await expect(service.getProductMediaDescriptor(scope)).resolves.toMatchObject({ size: 8, contentType: "image/png" });
    await expect(service.openProductMedia(scope)).resolves.toBe(opened);
  });

  it("returns null when media metadata or references disappear concurrently", async () => {
    const missingReference = createCatalogService({
      repository: repositoryStub({}),
      mediaStorage: storageStub({}),
      productMediaUrl: () => "/media",
    });
    const missingBlob = createCatalogService({
      repository: repositoryStub({ findProductMedia: vi.fn(async () => ({ storageKey: "missing", mediaType: "video" as const })) }),
      mediaStorage: storageStub({ stat: vi.fn(async () => null) }),
      productMediaUrl: () => "/media",
    });
    const scope = { tenantId: "tenant-1", productId: "product-1" };
    await expect(missingReference.getProductMediaDescriptor(scope)).resolves.toBeNull();
    await expect(missingReference.openProductMedia(scope)).resolves.toBeNull();
    await expect(missingBlob.getProductMediaDescriptor(scope)).resolves.toBeNull();
  });
});

function repositoryStub(overrides: Partial<CatalogRepository>): CatalogRepository {
  return {
    listGroups: async () => [],
    findGroup: async () => null,
    createGroup: async () => { throw new Error("not implemented"); },
    updateGroup: async () => null,
    deleteGroup: async () => false,
    countGroups: async () => 0,
    listProducts: async () => [],
    findProduct: async () => null,
    createProduct: async () => { throw new Error("not implemented"); },
    updateProduct: async () => null,
    deleteProduct: async () => false,
    replaceProductOrder: async () => undefined,
    replaceProductMedia: async () => null,
    removeProductMedia: async () => null,
    findProductMedia: async () => null,
    countProducts: async () => 0,
    ...overrides,
  };
}

function storageStub(overrides: Partial<ProductMediaStorage>): ProductMediaStorage {
  return {
    putProductMedia: async () => { throw new Error("not implemented"); },
    open: () => new ReadableStream<Uint8Array>(),
    stat: async () => null,
    ...overrides,
  };
}
