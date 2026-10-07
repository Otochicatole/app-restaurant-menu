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
    getPrimaryProject: vi.fn(async () => null),
    ensurePrimaryProject: vi.fn(async () => view),
    createProject: vi.fn(async () => ({ ...view, id: "project-2", isPrimary: false, slug: "extra" })),
    deleteProjects: vi.fn(async (_tenant, ids) => ({ deletedIds: ids, remainingCount: 0 })),
    saveDraft: vi.fn(async () => ({ ...view, draftRevision: 1 })),
    publish: vi.fn(async () => ({ ...view, draftRevision: 1, publishedRevision: 1, publishedAt: new Date().toISOString(), hasPublishedDocument: true })),
    listAssets: vi.fn(async () => [{ id: "font-1", kind: "FONT" as const, name: "Marca", mimeType: "font/woff2", byteSize: 10, width: null, height: null, fontFamily: null, url: "/font", createdAt: new Date().toISOString() }]),
    createAsset: vi.fn(async (input) => ({ id: "new", kind: input.kind, name: input.name, mimeType: input.mimeType, byteSize: input.byteSize, width: null, height: null, fontFamily: null, url: "/asset", createdAt: new Date().toISOString() })),
    deleteAsset: vi.fn(async () => undefined),
    getAsset: vi.fn(async () => null),
    getProfile: vi.fn(async () => ({ name: "Café", publicDescription: "Carta", slug: "cafe" })),
    updateProfile: vi.fn(async (_tenant, _project, profile) => ({ ...profile, slug: "cafe" })),
    isSlugTaken: vi.fn(async () => false),
    getTenantMultiMenuEnabled: vi.fn(async () => false),
    getTenantMenuQuota: vi.fn(async () => ({ multiMenuEnabled: false, maxMenus: 1, currentMenus: 1 })),
  };
}

describe("menu editor use cases", () => {
  it("ensures a primary project when missing and saves/publishes with CAS", async () => {
    const repo = repository();
    const service = createMenuEditorUseCases(repo);
    const document = createTemplateDocument("Café");
    await service.getPrimaryProject("tenant", document);
    await service.saveDraft("tenant", "project-1", { baseRevision: 0, document });
    await service.publish("tenant", "project-1", { baseRevision: 1, document });
    expect(repo.ensurePrimaryProject).toHaveBeenCalled();
    expect(repo.saveDraft).toHaveBeenCalledWith("tenant", "project-1", 0, document);
    expect(repo.publish).toHaveBeenCalledWith("tenant", "project-1", 1, document);
  });

  it("checks asset kind and exposes profile/assets operations", async () => {
    const repo = repository();
    const service = createMenuEditorUseCases(repo);
    const document = { ...createTemplateDocument("Café"), nodes: [{ ...createTemplateDocument("Café").nodes[0], fontAssetId: "font-1" }] };
    await service.saveDraft("tenant", "project-1", { baseRevision: 0, document });
    await service.listAssets("tenant", "FONT");
    await service.createAsset("tenant", { tenantId: "tenant", kind: "FONT", name: "Nueva", mimeType: "font/woff", byteSize: 2, checksum: "x", storageKey: "key" });
    await service.getProfile("tenant", "project-1");
    await service.updateProfile("tenant", "project-1", { name: "Nuevo", publicDescription: "Descripción" });
    expect(repo.createAsset).toHaveBeenCalled();
  });

  it("deletes selected menus and all menus", async () => {
    const repo = repository();
    const service = createMenuEditorUseCases(repo);
    await service.deleteProjects("tenant", ["project-1", "project-1"]);
    expect(repo.deleteProjects).toHaveBeenCalledWith("tenant", ["project-1"]);
    await service.deleteAllProjects("tenant");
    expect(repo.listProjects).toHaveBeenCalled();
    expect(repo.deleteProjects).toHaveBeenCalledWith("tenant", ["project-1"]);
  });
});
