import { describe, expect, it, vi } from "vitest";
import { createTemplateDocument } from "../domain/template";
import { createMenuEditorUseCases } from "./menu-editor-use-cases";
import type { MenuEditorRepository } from "./ports";

function repository(): MenuEditorRepository {
  const document = createTemplateDocument("Café");
  return {
    getProject: vi.fn(async () => null),
    ensureProject: vi.fn(async () => ({ document, draftRevision: 0, publishedRevision: null, publishedAt: null, hasPublishedDocument: false })),
    saveDraft: vi.fn(async () => ({ document, draftRevision: 1, publishedRevision: null, publishedAt: null, hasPublishedDocument: false })),
    publish: vi.fn(async () => ({ document, draftRevision: 1, publishedRevision: 1, publishedAt: new Date().toISOString(), hasPublishedDocument: true })),
    listAssets: vi.fn(async () => [{ id: "font-1", kind: "FONT" as const, name: "Marca", mimeType: "font/woff2", byteSize: 10, width: null, height: null, fontFamily: null, url: "/font", createdAt: new Date().toISOString() }]),
    createAsset: vi.fn(async (input) => ({ id: "new", kind: input.kind, name: input.name, mimeType: input.mimeType, byteSize: input.byteSize, width: null, height: null, fontFamily: null, url: "/asset", createdAt: new Date().toISOString() })),
    deleteAsset: vi.fn(async () => undefined),
    getAsset: vi.fn(async () => null),
    getProfile: vi.fn(async () => ({ name: "Café", publicDescription: "Carta" })),
    updateProfile: vi.fn(async (_tenant, profile) => profile),
  };
}

describe("menu editor use cases", () => {
  it("creates a project when missing and saves/publishes with CAS", async () => {
    const repo = repository();
    const service = createMenuEditorUseCases(repo);
    const document = createTemplateDocument("Café");
    await service.getProject("tenant", document);
    await service.saveDraft("tenant", { baseRevision: 0, document });
    await service.publish("tenant", { baseRevision: 1, document });
    expect(repo.ensureProject).toHaveBeenCalled();
    expect(repo.saveDraft).toHaveBeenCalledWith("tenant", 0, document);
    expect(repo.publish).toHaveBeenCalledWith("tenant", 1, document);
  });

  it("checks asset kind and exposes profile/assets operations", async () => {
    const repo = repository();
    const service = createMenuEditorUseCases(repo);
    const document = { ...createTemplateDocument("Café"), nodes: [{ ...createTemplateDocument("Café").nodes[0], fontAssetId: "font-1" }] };
    await service.saveDraft("tenant", { baseRevision: 0, document });
    await service.listAssets("tenant", "FONT");
    await service.createAsset("tenant", { tenantId: "tenant", kind: "FONT", name: "Nueva", mimeType: "font/woff", byteSize: 2, checksum: "x", storageKey: "key" });
    await service.getProfile("tenant");
    await service.updateProfile("tenant", { name: "Nuevo", publicDescription: "Descripción" });
    expect(repo.createAsset).toHaveBeenCalled();
  });
});
