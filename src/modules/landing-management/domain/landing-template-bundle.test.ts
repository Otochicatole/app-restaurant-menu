import { describe, expect, it } from "vitest";
import type { LandingCustomModuleView } from "../contracts";
import { createDefaultLandingDocument, compileLandingFromDocument } from "./landing-compiler";
import { createBlockFromCustomModule } from "./landing-module-catalog";
import { LANDING_TEMPLATE_PRESETS, presetAsLandingTemplateView } from "./landing-template-presets";
import {
  decodeLandingTemplateBundle,
  encodeLandingTemplateBundle,
  ensureDocumentForLanding,
  landingTemplateBundleFilename,
  MAX_LANDING_TEMPLATE_BUNDLE_BYTES,
  type PortableLandingTemplate,
} from "./landing-template-bundle";

const template = (): PortableLandingTemplate => ({
  name: "Carta de presentación", description: "Diseño reutilizable",
  document: createDefaultLandingDocument("Centro", "centro-web", "centro-carta"),
  htmlContent: "<main>Centro</main>", cssContent: "main{color:red}", jsContent: "window.ready=true;",
});

function rawBundle(content: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(12 + content.length);
  bytes.set(new TextEncoder().encode("RLAND001"));
  new DataView(bytes.buffer).setUint32(8, content.length, false);
  bytes.set(content, 12);
  return bytes;
}

describe("portable landing templates", () => {
  it("keeps system presets global while generating a restaurant-specific preview", () => {
    const preset = LANDING_TEMPLATE_PRESETS[0]!;
    const generic = presetAsLandingTemplateView(preset);
    const preview = presetAsLandingTemplateView(preset, "Sucursal Centro", "centro");
    expect(generic).toMatchObject({ isSystem: true, visibility: "PUBLIC", status: "PUBLISHED", restaurantId: null });
    expect(preview.restaurantId).toBeNull();
    expect(preview.document).toEqual(preset.document);
    expect(generic.document).toEqual(preview.document);
    expect(preview.htmlContent).not.toContain("{{restaurantSlug}}");
  });

  it("round-trips visual content and custom HTML, CSS and JavaScript", () => {
    const original = template();
    expect(decodeLandingTemplateBundle(encodeLandingTemplateBundle(original))).toEqual(original);
    expect(landingTemplateBundleFilename("  Café / Centro  ")).toBe("Cafe-Centro.landingtemplate");
    expect(landingTemplateBundleFilename("***")).toBe("landing-template.landingtemplate");
  });

  it("rejects files with invalid size, magic or a truncated manifest", () => {
    expect(() => decodeLandingTemplateBundle(new Uint8Array(3))).toThrow("tamaño");
    expect(() => decodeLandingTemplateBundle(new Uint8Array(MAX_LANDING_TEMPLATE_BUNDLE_BYTES + 1))).toThrow("tamaño");
    const wrongType = encodeLandingTemplateBundle(template());
    wrongType[0] = 0;
    expect(() => decodeLandingTemplateBundle(wrongType)).toThrow("compatible");
    const truncated = encodeLandingTemplateBundle(template()).slice(0, -1);
    expect(() => decodeLandingTemplateBundle(truncated)).toThrow("dañado");
    expect(() => decodeLandingTemplateBundle(rawBundle(new Uint8Array()))).toThrow("dañado");
  });

  it("rejects malformed JSON, invalid UTF-8 and unsupported schema versions", () => {
    expect(() => decodeLandingTemplateBundle(rawBundle(new TextEncoder().encode("{broken")))).toThrow("JSON válido");
    expect(() => decodeLandingTemplateBundle(rawBundle(new Uint8Array([255])))).toThrow("JSON válido");
    const unsupported = { format: "restaurant-landing-template", formatVersion: 2, template: template() };
    expect(() => decodeLandingTemplateBundle(rawBundle(new TextEncoder().encode(JSON.stringify(unsupported))))).toThrow("formato esperado");
    expect(() => encodeLandingTemplateBundle({ ...template(), name: "" })).toThrow("no son válidos");
  });

  it("rejects an oversized complete template even when individual blocks are valid", () => {
    const large = template();
    const block = large.document.blocks[0]!;
    large.document.blocks = Array.from({ length: 25 }, (_, index) => ({ ...block, id: `block-${index}`, htmlTemplate: "x".repeat(250_000) }));
    expect(() => encodeLandingTemplateBundle(large)).toThrow("tamaño máximo");
  });

  it("uses a safe document fallback for missing or obsolete visual documents", () => {
    const fallback = () => createDefaultLandingDocument("Nuevo", "nuevo");
    expect(ensureDocumentForLanding(null, fallback)).toEqual(fallback());
    expect(ensureDocumentForLanding({ ...fallback(), schemaVersion: 2 } as never, fallback)).toEqual(fallback());
    expect(ensureDocumentForLanding(template().document, fallback)).toEqual(template().document);
  });

  it("creates independent editable instances of a saved custom module", () => {
    const custom: LandingCustomModuleView = {
      id: "custom-menu", restaurantId: "restaurant-a", name: "Enlace a la carta", description: "", category: "custom",
      fields: [{ key: "label", label: "Texto", type: "text", defaultValue: "Ver carta" }],
      htmlTemplate: '<a href="{{menuUrl}}">{{label}}</a>', cssTemplate: "a{font-weight:bold}", jsTemplate: "",
      createdAt: "", updatedAt: "",
    };
    const first = createBlockFromCustomModule(custom);
    const second = createBlockFromCustomModule(custom, "second");
    first.values.label = "Carta del Centro";
    first.fields[0]!.label = "Modificado";
    expect(second.id).not.toBe(first.id);
    expect(second.values.label).toBe("Ver carta");
    expect(custom.fields[0]!.label).toBe("Texto");
    const document = createDefaultLandingDocument("Sucursal", "sucursal-web", "sucursal-carta");
    document.blocks = [second];
    const compiled = compileLandingFromDocument(document, { restaurantName: "Sucursal", restaurantSlug: "sucursal-web", menuSlug: "sucursal-carta" });
    expect(compiled.htmlContent).toContain('href="/m/sucursal-carta"');
    expect(compiled.htmlContent).toContain("Ver carta");
  });
});
