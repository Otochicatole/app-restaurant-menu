import { describe, expect, it, vi } from "vitest";
import { createTemplateDocument } from "../domain/template";
import { createMenuEditorUseCases } from "./menu-editor-use-cases";
import type { MenuEditorRepository } from "./ports";

function projectView(document = createTemplateDocument("Café")) {
  return {
    id: "project-1",
    name: "Café",
    slug: "cafe",
    publicDescription: "Carta",
    isPrimary: true,
    document,
    draftRevision: 0,
    publishedRevision: null,
    publishedAt: null,
    hasPublishedDocument: false,
  };
}

function repository(): MenuEditorRepository {
  const document = createTemplateDocument("Café");
  const view = projectView(document);
  return {
    listProjects: vi.fn(async () => [{ id: view.id, name: view.name, slug: view.slug, publicDescription: view.publicDescription, isPrimary: true, hasPublishedDocument: false }]),
    getProject: vi.fn(async () => view),
    getPrimaryProject: vi.fn(async () => view),
    saveDraft: vi.fn(async () => ({ ...view, draftRevision: 1 })),
    publish: vi.fn(async () => ({ ...view, draftRevision: 1, publishedRevision: 1, publishedAt: new Date().toISOString(), hasPublishedDocument: true })),
    listAssets: vi.fn(async () => [{ id: "font-1", kind: "FONT" as const, name: "Marca", mimeType: "font/woff2", byteSize: 10, width: null, height: null, fontFamily: null, url: "/font", createdAt: new Date().toISOString() }]),
    createAsset: vi.fn(async (input) => ({ id: "new", kind: input.kind, name: input.name, mimeType: input.mimeType, byteSize: input.byteSize, width: null, height: null, fontFamily: null, url: "/asset", createdAt: new Date().toISOString() })),
    deleteAsset: vi.fn(async () => undefined),
    getAsset: vi.fn(async () => null),
    getProfile: vi.fn(async () => ({ name: "Café", publicDescription: "Carta", slug: "cafe", landingSlug: "cafe" })),
    updateProfile: vi.fn(async (_tenant, _project, profile) => profile),
    isSlugTaken: vi.fn(async () => false),
  };
}

describe("menu editor use cases", () => {
  it("loads the restaurant's sole project and saves/publishes with CAS", async () => {
    const repo = repository();
    const service = createMenuEditorUseCases(repo);
    const document = createTemplateDocument("Café");
    await service.getPrimaryProject("tenant");
    await service.saveDraft("tenant", "project-1", { baseRevision: 0, document });
    await service.publish("tenant", "project-1", { baseRevision: 1, document });
    expect(repo.getPrimaryProject).toHaveBeenCalledWith("tenant");
    expect(repo.saveDraft).toHaveBeenCalledWith("tenant", "project-1", 0, document);
    expect(repo.publish).toHaveBeenCalledWith("tenant", "project-1", 1, document);
  });

  it("does not recreate a missing project during a read", async () => {
    const repo = repository();
    vi.mocked(repo.getPrimaryProject).mockResolvedValue(null);
    await expect(createMenuEditorUseCases(repo).getPrimaryProject("restaurant")).rejects.toThrow("Carta");
  });

  it("checks asset kind and exposes profile/assets operations", async () => {
    const repo = repository();
    const service = createMenuEditorUseCases(repo);
    const document = { ...createTemplateDocument("Café"), nodes: [{ ...createTemplateDocument("Café").nodes[0], fontAssetId: "font-1" }] };
    await service.saveDraft("tenant", "project-1", { baseRevision: 0, document });
    await service.listAssets("tenant", "FONT");
    await service.createAsset("tenant", { restaurantId: "tenant", kind: "FONT", name: "Nueva", mimeType: "font/woff", byteSize: 2, checksum: "x", storageKey: "key" });
    await service.getProfile("tenant", "project-1");
    await service.updateProfile("tenant", "project-1", { name: "Nuevo", publicDescription: "Descripción", slug: "nuevo-cafe", landingSlug: "nueva-landing" });
    expect(repo.createAsset).toHaveBeenCalled();
    expect(repo.updateProfile).toHaveBeenCalledWith("tenant", "project-1", {
      name: "Nuevo",
      publicDescription: "Descripción",
      slug: "nuevo-cafe", landingSlug: "nueva-landing",
    });
  });

  it("rejects reserved or taken slugs when updating a profile", async () => {
    const repo = repository();
    const service = createMenuEditorUseCases(repo);
    await expect(
      service.updateProfile("tenant", "project-1", { name: "Nuevo", publicDescription: "Desc", slug: "admin", landingSlug: "landing" }),
    ).rejects.toThrow(/reservado/i);
    vi.mocked(repo.isSlugTaken).mockResolvedValueOnce(true);
    await expect(
      service.updateProfile("tenant", "project-1", { name: "Nuevo", publicDescription: "Desc", slug: "otro", landingSlug: "landing" }),
    ).rejects.toThrow(/slug/i);
  });

  it("rejects an asset whose restaurant differs from the explicit target", () => {
    const service = createMenuEditorUseCases(repository());
    expect(() => service.createAsset("restaurant-a", { restaurantId: "restaurant-b", kind: "IMAGE", name: "Imagen", mimeType: "image/png", byteSize: 1, checksum: "x", storageKey: "key" })).toThrow();
  });

  it("does not return a project from a different restaurant", async () => {
    const repo = repository();
    vi.mocked(repo.getProject).mockResolvedValueOnce(null);
    await expect(createMenuEditorUseCases(repo).getProject("restaurant-a", "project-from-b")).rejects.toThrow();
    expect(repo.getProject).toHaveBeenCalledWith("restaurant-a", "project-from-b");
  });
});
