import { describe, expect, it, vi } from "vitest";
import { createLandingUseCases } from "./landing-use-cases";
import type { LandingRepository, TenantInfo } from "./ports";
import type {
  LandingCustomModuleView,
  LandingPageData,
  LandingTemplateView,
} from "../contracts";
import { createDefaultLandingDocument } from "../domain/landing-compiler";

function createMockRepository(): LandingRepository {
  const store = new Map<string, LandingPageData>();
  const storage = new Map<string, string>();
  const customModules = new Map<string, LandingCustomModuleView>();
  const templates = new Map<string, LandingTemplateView>();

  const tenant: TenantInfo = {
    id: "tenant-123",
    name: "La Trattoria",
    slug: "la-trattoria",
    status: "ACTIVE",
    landingEnabled: true,
  };

  return {
    findByTenantId: vi.fn(async (tenantId) => store.get(tenantId) ?? null),
    save: vi.fn(async (command) => {
      const data: LandingPageData = {
        id: "landing-1",
        tenantId: command.tenantId,
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        document: command.document ?? null,
        published: false,
        publishedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.set(command.tenantId, data);
      return data;
    }),
    publish: vi.fn(async (command, compiledHtml) => {
      const data: LandingPageData = {
        id: "landing-1",
        tenantId: command.tenantId,
        htmlContent: command.htmlContent,
        cssContent: command.cssContent,
        jsContent: command.jsContent,
        document: command.document ?? null,
        published: true,
        publishedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.set(command.tenantId, data);
      storage.set(command.tenantId, compiledHtml);
      return data;
    }),
    getPublishedHtmlFromStorage: vi.fn(async (tenantId) => storage.get(tenantId) ?? null),
    findTenantBySlug: vi.fn(async (slug) => (slug === tenant.slug ? tenant : null)),
    findTenantById: vi.fn(async (id) => (id === tenant.id ? tenant : null)),
    isLandingEnabledForTenant: vi.fn(async (id) => (id === tenant.id ? tenant.landingEnabled : false)),
    listCustomModules: vi.fn(async (tenantId) =>
      Array.from(customModules.values()).filter((m) => m.tenantId === tenantId),
    ),
    createCustomModule: vi.fn(async (command) => {
      const created: LandingCustomModuleView = {
        id: `mod-${customModules.size + 1}`,
        tenantId: command.tenantId,
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
    deleteCustomModule: vi.fn(async (tenantId, moduleId) => {
      const mod = customModules.get(moduleId);
      if (mod?.tenantId === tenantId) customModules.delete(moduleId);
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
        tenantId: command.tenantId,
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
        tenantId: command.tenantId,
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
    deletePrivateTemplate: vi.fn(async (_tenantId, templateId) => {
      templates.delete(templateId);
    }),
    exportPortableTemplate: vi.fn(async () => ({
      name: "Exportada",
      description: "Desc",
      document: createDefaultLandingDocument(tenant.name, tenant.slug),
      htmlContent: "<section>Export</section>",
      cssContent: "",
      jsContent: "",
    })),
    importPortableTemplate: vi.fn(async (_tenantId, portable) => {
      const tpl: LandingTemplateView = {
        id: "tpl-imported",
        name: portable.name,
        description: portable.description,
        visibility: "PRIVATE",
        status: "DRAFT",
        isSystem: false,
        tenantId: tenant.id,
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

    const data = await useCases.getLandingEditorData("tenant-123");
    expect(data.landingPage.htmlContent).toContain("La Trattoria");
    expect(data.landingPage.document?.blocks.length).toBeGreaterThan(0);
    expect(data.landingPage.published).toBe(false);
    expect(data.tenant.landingEnabled).toBe(true);
  });

  it("saves a draft and publishes a landing page to storage", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);

    // Save draft
    const saved = await useCases.saveDraft({
      tenantId: "tenant-123",
      htmlContent: "<h1>Custom HTML</h1>",
      cssContent: "h1 { font-size: 20px; }",
      jsContent: "console.log('test');",
    });

    expect(saved.htmlContent).toBe("<h1>Custom HTML</h1>");
    expect(saved.published).toBe(false);

    // Publish
    const published = await useCases.publishLanding({
      tenantId: "tenant-123",
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
      tenantId: "tenant-123",
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

    // 1. Missing tenant
    const missing = await useCases.getPublicLanding("unknown-slug");
    expect(missing).toEqual({ kind: "not_found" });

    // 2. Unpublished tenant landing
    const prep = await useCases.getPublicLanding("la-trattoria");
    expect(prep).toEqual({
      kind: "preparation",
      restaurantName: "La Trattoria",
      restaurantSlug: "la-trattoria",
    });

    // 3. Published tenant landing
    await useCases.publishLanding({
      tenantId: "tenant-123",
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

  it("returns disabled when tenant landingEnabled is false", async () => {
    const repository = createMockRepository();
    vi.mocked(repository.findTenantBySlug).mockResolvedValue({
      id: "tenant-off",
      name: "Resto Off",
      slug: "resto-off",
      status: "ACTIVE",
      landingEnabled: false,
    });

    const useCases = createLandingUseCases(repository);
    const result = await useCases.getPublicLanding("resto-off");
    expect(result).toEqual({ kind: "disabled" });
  });
});

