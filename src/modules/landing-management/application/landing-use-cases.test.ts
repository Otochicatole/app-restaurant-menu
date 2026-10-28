import { describe, expect, it, vi } from "vitest";
import { createLandingUseCases } from "./landing-use-cases";
import type { LandingRepository, RestaurantInfo } from "./ports";
import type {
  LandingCustomModuleView,
  LandingPageData,
  LandingTemplateView,
} from "../contracts";
import { createDefaultLandingDocument } from "../domain/landing-compiler";
import { decodeLandingTemplateBundle } from "../domain/landing-template-bundle";
import { markLandingContext } from "../domain/landing-route-context";

function createMockRepository(): LandingRepository {
  const store = new Map<string, LandingPageData>();
  const storage = new Map<string, string>();
  const customModules = new Map<string, LandingCustomModuleView>();
  const templates = new Map<string, LandingTemplateView>();

  const restaurant: RestaurantInfo = {
    id: "restaurant-123",
    organizationId: "organization-1",
    name: "La Trattoria",
    slug: "la-trattoria",
    landingSlug: "la-trattoria",
    status: "ACTIVE",
    organizationStatus: "ACTIVE",
    landingEnabled: true,
  };

  return {
    findByRestaurantId: vi.fn(async (restaurantId) => store.get(restaurantId) ?? null),
    save: vi.fn(async (command) => {
      const data: LandingPageData = {
        id: "landing-1",
        restaurantId: command.restaurantId,
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        document: command.document ?? null,
        published: false,
        publishedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.set(command.restaurantId, data);
      return data;
    }),
    publish: vi.fn(async (command, compiledHtml) => {
      const data: LandingPageData = {
        id: "landing-1",
        restaurantId: command.restaurantId,
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        document: command.document ?? null,
        published: true,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.set(command.restaurantId, data);
      storage.set(command.restaurantId, compiledHtml);
      return data;
    }),
    getPublishedHtmlFromStorage: vi.fn(async (restaurantId) => storage.get(restaurantId) ?? null),
    findRestaurantByLandingSlug: vi.fn(async (slug) => (slug === restaurant.slug ? restaurant : null)),
    findRestaurantById: vi.fn(async (id) => (id === restaurant.id ? restaurant : null)),
    isLandingEnabledForRestaurant: vi.fn(async (id) => (id === restaurant.id ? restaurant.landingEnabled : false)),
    listCustomModules: vi.fn(async (restaurantId) =>
      Array.from(customModules.values()).filter((m) => m.restaurantId === restaurantId),
    ),
    createCustomModule: vi.fn(async (command) => {
      const created: LandingCustomModuleView = {
        id: `mod-${customModules.size + 1}`,
        restaurantId: command.restaurantId,
        name: command.name,
        description: command.description,
        category: command.category,
        htmlTemplate: command.htmlTemplate,
        cssTemplate: command.cssTemplate,
        jsTemplate: command.jsTemplate,
        fields: command.fields,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      customModules.set(created.id, created);
      return created;
    }),
    deleteCustomModule: vi.fn(async (restaurantId, moduleId) => {
      const mod = customModules.get(moduleId);
      if (mod?.restaurantId === restaurantId) customModules.delete(moduleId);
    }),
    listTemplates: vi.fn(async () => Array.from(templates.values())),
    createPrivateTemplate: vi.fn(async (command) => {
      const tpl: LandingTemplateView = {
        id: `tpl-${templates.size + 1}`,
        name: command.name,
        description: command.description,
        visibility: "PRIVATE",
        status: "DRAFT",
        isSystem: false,
        restaurantId: command.restaurantId,
        rejectionReason: null,
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        document: command.document,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      templates.set(tpl.id, tpl);
      return tpl;
    }),
    submitPublicTemplate: vi.fn(async (command) => {
      const tpl: LandingTemplateView = {
        id: `tpl-${templates.size + 1}`,
        name: command.name,
        description: command.description,
        visibility: "PUBLIC",
        status: "PENDING",
        isSystem: false,
        restaurantId: command.restaurantId,
        rejectionReason: null,
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        document: command.document,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      templates.set(tpl.id, tpl);
      return tpl;
    }),
    deletePrivateTemplate: vi.fn(async (_restaurantId, templateId) => {
      templates.delete(templateId);
    }),
    exportPortableTemplate: vi.fn(async (_restaurantId, templateId) => {
      const saved = templates.get(templateId);
      if (saved) return {
        name: saved.name, description: saved.description, document: saved.document,
        htmlContent: saved.htmlContent, cssContent: saved.cssContent, jsContent: saved.jsContent,
      };
      return {
      name: "Exportada",
      description: "Desc",
      document: createDefaultLandingDocument(restaurant.name, restaurant.slug),
      htmlContent: "<section>Export</section>",
      cssContent: "",
      jsContent: "",
      };
    }),
    importPortableTemplate: vi.fn(async (restaurantId, portable) => {
      const tpl: LandingTemplateView = {
        id: "tpl-imported",
        name: portable.name,
        description: portable.description,
        visibility: "PRIVATE",
        status: "DRAFT",
        isSystem: false,
        restaurantId,
        rejectionReason: null,
        htmlContent: portable.htmlContent,
        cssContent: portable.cssContent,
        jsContent: portable.jsContent,
        document: portable.document,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      templates.set(tpl.id, tpl);
      return tpl;
    }),
    listTemplatesForSuperadmin: vi.fn(async () => ({
      items: Array.from(templates.values()).map((t) => ({ ...t, owner: null })),
      total: templates.size,
      page: 1,
      pageSize: 24,
    })),
    moderateTemplate: vi.fn(async (templateId) => {
      const existing = templates.get(templateId);
      if (existing) return existing;
      throw new Error("Not found");
    }),
    deletePublicTemplate: vi.fn(async (templateId) => {
      templates.delete(templateId);
    }),
  };
}

describe("landing-use-cases", () => {
  it("provides initial starter template with visual document and templates when no landing exists yet", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);

    const data = await useCases.getLandingEditorData("restaurant-123");
    expect(data.landingPage.htmlContent).toContain("La Trattoria");
    expect(data.landingPage.document?.blocks.length).toBeGreaterThan(0);
    expect(data.landingPage.published).toBe(false);
    expect(data.restaurant.landingEnabled).toBe(true);
  });

  it("saves a draft and publishes a landing page to storage", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);

    // Save draft
    const saved = await useCases.saveDraft({
      restaurantId: "restaurant-123",
      htmlContent: "<h1>Custom HTML</h1>",
      cssContent: "h1 { font-size: 20px; }",
      jsContent: "console.log('test');",
    });

    expect(saved.htmlContent).toContain("<h1>Custom HTML</h1>");
    expect(saved.published).toBe(false);

    // Publish
    const published = await useCases.publishLanding({
      restaurantId: "restaurant-123",
      htmlContent: "<h1>Custom HTML</h1>",
      cssContent: "h1 { font-size: 20px; }",
      jsContent: "console.log('test');",
    });

    expect(published.published).toBe(true);
    expect(repository.publish).toHaveBeenCalled();
  });

  it("creates custom reusable modules with synced {{variables}}", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);

    const mod = await useCases.createCustomModule({
      restaurantId: "restaurant-123",
      name: "Card Promo",
      description: "Card con precio y badge",
      category: "card",
      htmlTemplate: "<div><h3>{{title}}</h3><span>{{price}}</span></div>",
      cssTemplate: "div { padding: 1rem; }",
      jsTemplate: "",
      fields: [],
    });

    expect(mod.name).toBe("Card Promo");
    expect(mod.fields.map((f) => f.key)).toEqual(["title", "price"]);
  });

  it("resolves public landing page status correctly", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);

    // 1. Missing restaurant
    const missing = await useCases.getPublicLanding("unknown-slug");
    expect(missing).toEqual({ kind: "not_found" });

    // 2. Unpublished restaurant landing
    const prep = await useCases.getPublicLanding("la-trattoria");
    expect(prep).toEqual({
      kind: "preparation",
      restaurantName: "La Trattoria",
      restaurantSlug: "la-trattoria",
      menuSlug: "la-trattoria",
    });

    // 3. Published restaurant landing
    await useCases.publishLanding({
      restaurantId: "restaurant-123",
      htmlContent: "<p>Hola</p>",
      cssContent: "",
      jsContent: "",
    });

    const ready = await useCases.getPublicLanding("la-trattoria");
    expect(ready.kind).toBe("ready");
    if (ready.kind === "ready") {
      expect(ready.html).toContain("<p>Hola</p>");
      expect(ready.restaurantName).toBe("La Trattoria");
    }
  });

  it("returns disabled when restaurant landingEnabled is false", async () => {
    const repository = createMockRepository();
    vi.mocked(repository.findRestaurantByLandingSlug).mockResolvedValue({
      id: "restaurant-off",
      organizationId: "organization-1",
      name: "Resto Off",
      slug: "resto-off",
      landingSlug: "resto-off",
      status: "ACTIVE",
      organizationStatus: "ACTIVE",
      landingEnabled: false,
    });

    const useCases = createLandingUseCases(repository);
    const result = await useCases.getPublicLanding("resto-off");
    expect(result).toEqual({ kind: "disabled" });
  });

  it("hides a restaurant landing when its organization is suspended", async () => {
    const repository = createMockRepository();
    const restaurant = await repository.findRestaurantById("restaurant-123");
    vi.mocked(repository.findRestaurantByLandingSlug).mockResolvedValue({
      ...restaurant!,
      organizationStatus: "SUSPENDED",
    });
    const result = await createLandingUseCases(repository).getPublicLanding("la-trattoria");
    expect(result).toEqual({ kind: "disabled" });
    expect(repository.getPublishedHtmlFromStorage).not.toHaveBeenCalled();
  });

  it("does not serve stored HTML for an unpublished landing", async () => {
    const repository = createMockRepository();
    vi.mocked(repository.getPublishedHtmlFromStorage).mockResolvedValue("<p>Stale publication</p>");
    const result = await createLandingUseCases(repository).getPublicLanding("la-trattoria");
    expect(result.kind).toBe("preparation");
    expect(repository.getPublishedHtmlFromStorage).not.toHaveBeenCalled();
  });

  it("keeps published landing storage separate between restaurants", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);
    await useCases.publishLanding({
      restaurantId: "restaurant-123",
      htmlContent: "<p>Primero</p>", cssContent: "", jsContent: "",
    });
    await useCases.publishLanding({
      restaurantId: "restaurant-456",
      htmlContent: "<p>Segundo</p>", cssContent: "", jsContent: "",
    });
    expect(await repository.getPublishedHtmlFromStorage("restaurant-123")).toContain("Primero");
    expect(await repository.getPublishedHtmlFromStorage("restaurant-456")).toContain("Segundo");
  });

  it("restores a published landing when its generated HTML file is missing", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);
    await useCases.publishLanding({ restaurantId: "restaurant-123", htmlContent: "<p>Publicada</p>", cssContent: "p{color:red}", jsContent: "window.ready=true;" });
    vi.mocked(repository.getPublishedHtmlFromStorage).mockResolvedValueOnce(null);
    const restored = await useCases.getPublicLanding("la-trattoria");
    expect(restored.kind).toBe("ready");
    if (restored.kind === "ready") expect(restored.html).toContain("<p>Publicada</p>");
    expect(await useCases.isLandingPublished("restaurant-123")).toBe(true);
  });

  it("keeps a saved raw draft while supplying an editable starter document", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);
    expect(await useCases.isLandingPublished("restaurant-123")).toBe(false);
    await useCases.saveDraft({ restaurantId: "restaurant-123", htmlContent: "<main>Mi diseño</main>", cssContent: "", jsContent: "" });
    const editor = await useCases.getLandingEditorData("restaurant-123");
    expect(editor.landingPage.htmlContent).toContain("<main>Mi diseño</main>");
    expect(editor.landingPage.document?.blocks.length).toBeGreaterThan(0);
    expect(editor.hasPublishedStorage).toBe(false);
    await expect(useCases.getLandingEditorData("missing")).rejects.toThrow("no encontrado");
  });

  it("exports a private visual template and imports an independent copy into another restaurant", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);
    const document = createDefaultLandingDocument("La Trattoria", "la-trattoria");
    const saved = await useCases.createTemplate("restaurant-123", document, { name: "Nuestra portada", description: "Diseño de marca", submitPublic: false });
    expect(saved.visibility).toBe("PRIVATE");
    expect(saved.htmlContent).toContain("/m/la-trattoria");
    const exported = await useCases.exportTemplate("restaurant-123", saved.id);
    expect(exported.filename).toBe("Nuestra-portada.landingtemplate");
    expect(decodeLandingTemplateBundle(exported.bytes).name).toBe("Nuestra portada");
    const imported = await useCases.importTemplate("restaurant-other", exported.bytes);
    expect(imported.restaurantId).toBe("restaurant-other");
    expect(imported.id).not.toBe(saved.id);
    expect(imported.document).toEqual(saved.document);
    expect(imported.visibility).toBe("PRIVATE");
    await useCases.deletePrivateTemplate("restaurant-123", saved.id);
    expect((await useCases.listTemplates("restaurant-other")).some((item) => item.id === saved.id)).toBe(false);
  });

  it("submits a community template for moderation and rejects a missing rejection reason", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);
    const saved = await useCases.createTemplate("restaurant-123", createDefaultLandingDocument("Resto", "resto"), { name: "Compartida", description: "", submitPublic: true });
    expect(saved).toMatchObject({ visibility: "PUBLIC", status: "PENDING", restaurantId: "restaurant-123" });
    expect((await useCases.listTemplatesForSuperadmin({ tab: "pending" })).items).toHaveLength(1);
    await expect(useCases.moderateTemplate(saved.id, "reject", "   ")).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(repository.moderateTemplate).not.toHaveBeenCalled();
    await useCases.moderateTemplate(saved.id, "reject", "  Revisar contenido  ");
    expect(repository.moderateTemplate).toHaveBeenCalledWith(saved.id, "reject", "Revisar contenido");
    await useCases.deletePublicTemplate(saved.id);
    expect((await useCases.listTemplatesForSuperadmin({ tab: "all" })).items).toEqual([]);
  });

  it("manages saved custom modules without changing another restaurant's collection", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);
    const savedModule = await useCases.createCustomModule({ restaurantId: "restaurant-123", name: "Promoción", description: "", category: "custom", fields: [], htmlTemplate: "<h2>{{title}}</h2>", cssTemplate: "", jsTemplate: "" });
    expect(await useCases.listCustomModules("restaurant-other")).toEqual([]);
    await useCases.deleteCustomModule("restaurant-other", savedModule.id);
    expect(await useCases.listCustomModules("restaurant-123")).toHaveLength(1);
    await useCases.deleteCustomModule("restaurant-123", savedModule.id);
    expect(await useCases.listCustomModules("restaurant-123")).toEqual([]);
  });

  it("rejects malformed template and module requests before persistence", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);
    await expect(useCases.listTemplates("")).rejects.toThrow();
    await expect(useCases.listCustomModules("")).rejects.toThrow();
    await expect(useCases.deleteCustomModule("restaurant-123", "")).rejects.toThrow();
    await expect(useCases.deletePrivateTemplate("", "template")).rejects.toThrow();
    await expect(useCases.importTemplate("restaurant-123", new Uint8Array([1, 2]))).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(repository.createPrivateTemplate).not.toHaveBeenCalled();
    expect(repository.importPortableTemplate).not.toHaveBeenCalled();
    expect(repository.deleteCustomModule).not.toHaveBeenCalled();
    await expect(useCases.getRestaurant("restaurant-123")).resolves.toMatchObject({ organizationId: "organization-1" });
    await expect(useCases.getRestaurantByLandingSlug("missing")).resolves.toBeNull();
    expect(await useCases.isLandingEnabled("restaurant-123")).toBe(true);
  });

  it("uses current profile routes for a published snapshot without publishing a newer draft", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);
    const oldContext = { menuSlug: "old-menu", landingSlug: "old-site" };
    const snapshot = markLandingContext('<a href="/m/old-menu">Carta publicada</a><section data-restaurant-slug="old-site"></section>', oldContext);
    await repository.publish({ restaurantId: "restaurant-123", htmlContent: "<p>Borrador nuevo sin publicar</p>", cssContent: "", jsContent: "" }, snapshot);
    const restaurant = await repository.findRestaurantById("restaurant-123");
    vi.mocked(repository.findRestaurantByLandingSlug).mockResolvedValue({ ...restaurant!, slug: "new-menu", landingSlug: "new-site" });
    vi.mocked(repository.publish).mockClear();
    const result = await useCases.getPublicLanding("new-site");
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.html).toContain('href="/m/new-menu"');
      expect(result.html).toContain('data-restaurant-slug="new-site"');
      expect(result.html).not.toContain("Borrador nuevo sin publicar");
    }
    expect(repository.publish).not.toHaveBeenCalled();
    expect(await repository.getPublishedHtmlFromStorage("restaurant-123")).toBe(snapshot);
  });
});

