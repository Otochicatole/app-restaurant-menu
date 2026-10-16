import { describe, expect, it, vi } from "vitest";
import { createLandingUseCases } from "./landing-use-cases";
import type { LandingRepository, TenantInfo } from "./ports";
import type { LandingPageData } from "../contracts";

function createMockRepository(): LandingRepository {
  const store = new Map<string, LandingPageData>();
  const storage = new Map<string, string>();
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
  };
}

describe("landing-use-cases", () => {
  it("provides initial starter template when no landing exists yet", async () => {
    const repository = createMockRepository();
    const useCases = createLandingUseCases(repository);

    const data = await useCases.getLandingEditorData("tenant-123");
    expect(data.landingPage.htmlContent).toContain("La Trattoria");
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
