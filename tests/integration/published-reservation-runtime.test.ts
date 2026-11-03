import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { BUILTIN_LANDING_MODULES, createBlockFromBuiltinModule } from "../../src/modules/landing-management/domain/landing-module-catalog";
import { compileLandingFromDocument, createDefaultLandingDocument } from "../../src/modules/landing-management/domain/landing-compiler";
import { inspectPublishedReservationRuntime, upgradePublishedReservationRuntime } from "../../src/modules/landing-management/domain/published-reservation-runtime";
import { createLandingUseCases } from "../../src/modules/landing-management/application/landing-use-cases";
import type { LandingRepository } from "../../src/modules/landing-management/application/ports";

async function publication(moduleKey: string, legacy = true) {
  const definition = BUILTIN_LANDING_MODULES.find((entry) => entry.moduleKey === moduleKey)!;
  const block = createBlockFromBuiltinModule(definition);
  block.name = 'Reservas "Terraza" & patio';
  if (legacy) block.jsTemplate = await readFile(path.resolve("tests/fixtures/landing-runtime", `${moduleKey}-v1.txt`), "utf8");
  const document = createDefaultLandingDocument("Compatibilidad", "compatibilidad");
  document.blocks.push(block);
  document.globalJs = `\n// Módulo: un nombre personalizado no delimita código administrado\nwindow.customPublication = { exact: "Sólo publicado, nunca el borrador" };\n`;
  return { document, block, compiled: compileLandingFromDocument(document, { restaurantName: "Compatibilidad", restaurantSlug: "compatibilidad" }) };
}

describe("published managed reservation runtime compatibility", () => {
  it.each(["reservations-table", "reservations-booking", "reservations-events"])("recognizes the frozen legacy %s body and preserves publication content", async (key) => {
    const { compiled, document } = await publication(key);
    const result = upgradePublishedReservationRuntime(compiled.fullHtml);
    expect(result.compatibility).toEqual({ status: "compatible", hasManagedReservations: true });
    expect(result.html).toContain(document.globalJs.trim());
    expect(result.html).toContain(compiled.htmlContent);
    expect(result.html).toContain(compiled.cssContent);
    expect(upgradePublishedReservationRuntime(result.html).html).toBe(result.html);
  });

  it("does not rewrite already current runtimes", async () => {
    const { compiled } = await publication("reservations-table", false);
    expect(upgradePublishedReservationRuntime(compiled.fullHtml).html).toBe(compiled.fullHtml);
  });

  it("retains custom suffix bytes and line endings", async () => {
    const { compiled, document } = await publication("reservations-booking");
    const source = compiled.fullHtml.replaceAll("\n", "\r\n");
    const suffix = document.globalJs.trim().replaceAll("\n", "\r\n") + "\r\n  </script>\r\n</body>\r\n</html>";
    const result = upgradePublishedReservationRuntime(source);
    expect(result.compatibility.status).toBe("compatible");
    expect(source.endsWith(suffix)).toBe(true);
    expect(result.html.endsWith(suffix)).toBe(true);
  });

  it("leaves customized and ambiguous publications untouched", async () => {
    const { compiled } = await publication("reservations-table");
    for (const source of [
      compiled.fullHtml.replace("function setupTableWidget(root)", "function setupCustomTableWidget(root)"),
      compiled.fullHtml.replace("</body>", '<script id="custom-landing-js">window.another = true;</script></body>'),
      compiled.fullHtml.replace('data-module-key="reservations-table"', 'data-module-key="custom-reservations"'),
    ]) {
      expect(upgradePublishedReservationRuntime(source)).toMatchObject({ html: source, compatibility: { status: "manual-update-required" } });
    }
    expect(inspectPublishedReservationRuntime('<script>fetch("/api/public/landing/custom/reservations/tables/availability")</script>').status).toBe("manual-update-required");
    expect(inspectPublishedReservationRuntime("<h1>Sin integración de reservas</h1>")).toEqual({ status: "compatible", hasManagedReservations: false });
  });

  it("adapts the saved publication without saving or publishing a different draft", async () => {
    const { compiled } = await publication("reservations-table");
    const repository = {
      findRestaurantByLandingSlug: vi.fn().mockResolvedValue({ id: "restaurant", name: "Publicado", slug: "compatibilidad", landingSlug: "compatibilidad", status: "ACTIVE", organizationStatus: "ACTIVE", landingEnabled: true }),
      findByRestaurantId: vi.fn().mockResolvedValue({ published: true, htmlContent: "<h1>Borrador privado nuevo</h1>", jsContent: "window.newDraft = true" }),
      getPublishedHtmlFromStorage: vi.fn().mockResolvedValue(compiled.fullHtml),
      publish: vi.fn(),
      save: vi.fn(),
    };
    const service = createLandingUseCases(repository as unknown as LandingRepository);
    const result = await service.getPublicLanding("compatibilidad");
    expect(result.kind).toBe("ready");
    if (result.kind === "ready") {
      expect(result.html).toContain("customPublication");
      expect(result.html).not.toContain("Borrador privado nuevo");
      expect(result.html).not.toContain("window.newDraft");
    }
    expect(await service.getReservationRuntimeCompatibility("restaurant")).toMatchObject({ status: "compatible" });
    expect(repository.publish).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    vi.mocked(repository.getPublishedHtmlFromStorage).mockResolvedValue(null);
    expect(await service.getReservationRuntimeCompatibility("restaurant")).toMatchObject({ status: "manual-update-required" });
    expect(repository.publish).not.toHaveBeenCalled();
  });
});
