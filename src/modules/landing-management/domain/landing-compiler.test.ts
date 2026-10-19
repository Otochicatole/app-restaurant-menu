import { describe, expect, it } from "vitest";
import {
  compileLandingDocument,
  compileLandingFromDocument,
  createDefaultLandingDocument,
  createDefaultLandingTemplate,
  extractTemplateVariables,
  syncFieldsWithHtmlTemplate,
} from "./landing-compiler";
import {
  decodeLandingTemplateBundle,
  encodeLandingTemplateBundle,
} from "./landing-template-bundle";

describe("landing-compiler", () => {
  it("compiles html, css, and js into a complete responsive HTML5 document", () => {
    const compiled = compileLandingDocument({
      htmlContent: "<section><h1>Hola Mundo</h1></section>",
      cssContent: "h1 { color: red; }",
      jsContent: "console.log('ready');",
      title: "Mi Restaurante",
    });

    expect(compiled).toContain("<!DOCTYPE html>");
    expect(compiled).toContain("<title>Mi Restaurante</title>");
    expect(compiled).toContain("h1 { color: red; }");
    expect(compiled).toContain("<h1>Hola Mundo</h1>");
    expect(compiled).toContain("console.log('ready');");
  });

  it("injects style and script into an existing full HTML document", () => {
    const existing = `<!DOCTYPE html><html><head><title>Test</title></head><body><div>Contenido</div></body></html>`;
    const compiled = compileLandingDocument({
      htmlContent: existing,
      cssContent: "body { margin: 0; }",
      jsContent: "window.loaded = true;",
    });

    expect(compiled).toContain('<style id="custom-landing-css">\nbody { margin: 0; }\n</style>');
    expect(compiled).toContain('<script id="custom-landing-js">\nwindow.loaded = true;\n</script>');
  });

  it("generates a default starter restaurant template customized with name and menu link", () => {
    const template = createDefaultLandingTemplate("Parrilla Don Julio", "don-julio");

    expect(template.html).toContain("Parrilla Don Julio");
    expect(template.html).toContain("/m/don-julio");
    expect(template.css).toContain("--color-primary");
    expect(template.js).toContain("DOMContentLoaded");
    expect(template.document.blocks.length).toBeGreaterThan(0);
  });

  it("extracts {{variables}} from HTML and syncs field definitions", () => {
    const vars = extractTemplateVariables(
      '<article><h3>{{title}}</h3><p>{{price}}</p><a href="{{ctaHref}}">{{title}}</a></article>',
    );
    expect(vars).toEqual(["title", "price", "ctaHref"]);

    const synced = syncFieldsWithHtmlTemplate(
      [{ key: "title", label: "Título Custom", type: "text", defaultValue: "Mi Card" }],
      { title: "Bife", badge: "Nuevo" },
      '<article><h3>{{title}}</h3><p>{{badge}}</p></article>',
    );

    expect(synced.fields).toHaveLength(2);
    expect(synced.fields[0]?.label).toBe("Título Custom");
    expect(synced.fields[1]?.key).toBe("badge");
    expect(synced.values.badge).toBe("Nuevo");
  });

  it("compiles a visual modular LandingDocument into HTML, CSS, and JS", () => {
    const doc = createDefaultLandingDocument("Casa Brasa", "casa-brasa");
    const compiled = compileLandingFromDocument(doc, {
      restaurantName: "Casa Brasa",
      restaurantSlug: "casa-brasa",
    });

    expect(compiled.htmlContent).toContain("Casa Brasa");
    expect(compiled.cssContent).toContain("--color-primary");
    expect(compiled.fullHtml).toContain("<!DOCTYPE html>");
  });

  it("compiles interactive editor assets with live DOM patching and link neutralization", () => {
    const doc = createDefaultLandingDocument("Casa Brasa", "casa-brasa");
    const compiled = compileLandingFromDocument(
      doc,
      {
        restaurantName: "Casa Brasa",
        restaurantSlug: "casa-brasa",
      },
      {
        interactiveEditor: true,
      },
    );

    expect(compiled.fullHtml).toContain('id="__landing-blocks-root"');
    expect(compiled.fullHtml).toContain("LANDING_LIVE_PATCH");
    expect(compiled.fullHtml).toContain("neutralizeLinks");
    expect(compiled.previewCss).toContain("--color-primary");
    expect(compiled.previewCss).toContain("__landing-editor-toolbar");
  });

  it("encodes and decodes a portable .landingtemplate bundle (RLAND001)", () => {
    const doc = createDefaultLandingDocument("Bistro Sur", "bistro-sur");
    const compiled = compileLandingFromDocument(doc, {
      restaurantName: "Bistro Sur",
      restaurantSlug: "bistro-sur",
    });

    const encoded = encodeLandingTemplateBundle({
      name: "Plantilla Bistro",
      description: "Ideal para bistrós modernos",
      htmlContent: compiled.htmlContent,
      cssContent: compiled.cssContent,
      jsContent: compiled.jsContent,
      document: doc,
    });

    const headerStr = new TextDecoder().decode(encoded.subarray(0, 8));
    expect(headerStr).toBe("RLAND001");

    const decoded = decodeLandingTemplateBundle(encoded);
    expect(decoded.name).toBe("Plantilla Bistro");
    expect(decoded.document.blocks.length).toBe(doc.blocks.length);
  });
});


