import { describe, expect, it } from "vitest";
import {
  buildBlockSubLayerTree,
  buildSubElementScopedCss,
  compileLandingDocument,
  compileLandingFromDocument,
  createBlankContainerBlock,
  createDefaultLandingDocument,
  createDefaultLandingTemplate,
  deleteSubElementInBlock,
  duplicateSubElementInBlock,
  extractTemplateVariables,
  insertInnerElementInBlock,
  moveSubElementInBlock,
  parseSubElementStyles,
  serializeSubElementStyles,
  syncFieldsWithHtmlTemplate,
  updateSubElementAttributeInBlock,
} from "./landing-compiler";
import {
  BUILTIN_LANDING_MODULES,
  createBlockFromBuiltinModule,
} from "./landing-module-catalog";
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
      '<article><h3>{{title}}</h3><p>{{price}}</p><a href="{{ctaHref}}">{{title}}</a><img src="{{dishImage}}" /></article>',
    );
    expect(vars).toEqual(["title", "price", "ctaHref", "dishImage"]);

    const synced = syncFieldsWithHtmlTemplate(
      [{ key: "title", label: "Título Custom", type: "text", defaultValue: "Mi Card" }],
      { title: "Bife", badge: "Nuevo", dishImage: "https://example.com/a.jpg" },
      '<article><h3>{{title}}</h3><p>{{badge}}</p><img src="{{dishImage}}" /></article>',
    );

    expect(synced.fields).toHaveLength(3);
    expect(synced.fields[0]?.label).toBe("Título Custom");
    expect(synced.fields[1]?.key).toBe("badge");
    expect(synced.fields[2]?.key).toBe("dishImage");
    expect(synced.fields[2]?.type).toBe("image");
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

  it("compiles interactive editor assets with live DOM patching, <l-field>, and sub-element selection", () => {
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
    expect(compiled.fullHtml).toContain("LANDING_SELECT_SUBELEMENT");
    expect(compiled.fullHtml).toContain("<l-field data-landing-field=");
    expect(compiled.fullHtml).toContain("neutralizeLinks");
    expect(compiled.previewCss).toContain("--color-primary");
    expect(compiled.previewCss).toContain("__landing-editor-toolbar");
    expect(compiled.previewCss).toContain('[data-sub-selected="true"]');
  });

  it("compiles granular sub-element scoped CSS from __subStyles", () => {
    const stylesMap = {
      "section:nth-of-type(1) > div:nth-of-type(1) > h1:nth-of-type(1)": {
        color: "#ff5500",
        fontSize: "52px",
        textAlign: "center",
      },
    };
    const serialized = serializeSubElementStyles(stylesMap);
    const parsed = parseSubElementStyles(serialized);
    expect(parsed).toEqual(stylesMap);

    const css = buildSubElementScopedCss("blk-hero-1", {
      __subStyles: serialized,
    });
    expect(css).toContain(
      '[data-landing-block="blk-hero-1"] > section:nth-of-type(1) > div:nth-of-type(1) > h1:nth-of-type(1)',
    );
    expect(css).toContain("color: #ff5500 !important;");
    expect(css).toContain("font-size: 52px !important;");
    expect(css).toContain("text-align: center !important;");
  });

  it("duplicates, moves, and deletes sub-elements in a block AST with independent {{variables}}", () => {
    const specialtiesMod = BUILTIN_LANDING_MODULES.find(
      (m) => m.moduleKey === "specialties-grid",
    )!;
    const block = createBlockFromBuiltinModule(specialtiesMod);
    const firstCardSelector =
      "section:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > article:nth-of-type(1)";

    // Add a sub-element style to the first card
    block.values.__subStyles = serializeSubElementStyles({
      [firstCardSelector]: { backgroundColor: "#112233" },
    });

    // Duplicate first card -> becomes article:nth-of-type(2) with fresh {{variables}}
    const dupResult = duplicateSubElementInBlock(block, firstCardSelector);
    expect(dupResult).not.toBeNull();
    const afterDup = dupResult!.block;
    expect(dupResult!.newSelector).toBe(
      "section:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > article:nth-of-type(2)",
    );
    expect(afterDup.fields.length).toBeGreaterThan(block.fields.length);

    const dupSubStyles = parseSubElementStyles(afterDup.values.__subStyles);
    expect(dupSubStyles[dupResult!.newSelector]?.backgroundColor).toBe("#112233");

    // Move duplicated card (nth-of-type(2)) to next -> becomes article:nth-of-type(3)
    const moveResult = moveSubElementInBlock(
      afterDup,
      dupResult!.newSelector,
      "next",
    );
    expect(moveResult).not.toBeNull();
    expect(moveResult!.newSelector).toBe(
      "section:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > article:nth-of-type(3)",
    );

    // Delete the card
    const afterDelete = deleteSubElementInBlock(
      moveResult!.block,
      moveResult!.newSelector,
    );
    expect(afterDelete).not.toBeNull();
    expect(afterDelete!.fields.length).toBe(block.fields.length);
  });

  it("inserts inner elements and updates sub-element attributes in a block", () => {
    const heroMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
    const block = createBlockFromBuiltinModule(heroMod);

    const withImage = insertInnerElementInBlock(
      block,
      "section:nth-of-type(1) > div:nth-of-type(1)",
      "image",
    );
    expect(withImage.htmlTemplate).toContain("<img");
    expect(withImage.fields.some((f) => f.type === "image")).toBe(true);

    const imgSelector =
      "section:nth-of-type(1) > div:nth-of-type(1) > img:nth-of-type(1)";
    const updatedImg = updateSubElementAttributeInBlock(
      withImage,
      imgSelector,
      "src",
      "https://example.com/custom-dish.jpg",
    );
    const imgField = updatedImg.fields.find((f) => f.type === "image")!;
    expect(updatedImg.values[imgField.key]).toBe(
      "https://example.com/custom-dish.jpg",
    );
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

  describe("buildBlockSubLayerTree (Figma-style nested layers)", () => {
    it("builds a nested tree for header module with nav and links", () => {
      const headerMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "header")!;
      const block = createBlockFromBuiltinModule(headerMod);

      const tree = buildBlockSubLayerTree(block);
      expect(tree.length).toBeGreaterThan(0);

      // Root node
      const rootNode = tree[0];
      expect(rootNode.tag).toBe("header");
      expect(rootNode.children.length).toBeGreaterThan(0);

      // Find nav node among descendants
      const containerNode = rootNode.children[0];
      const navNode = containerNode.children.find((c) => c.tag === "nav");
      expect(navNode).toBeDefined();
      expect(navNode?.label).toContain("Menú");

      // navNode should have its children links nested inside it
      expect(navNode?.children.length).toBeGreaterThanOrEqual(3);
      expect(navNode?.children[0].iconType).toBe("link");
      expect(navNode?.children[0].label).toContain("Inicio");
    });

    it("builds a nested tree for specialties-grid with cards and inner elements", () => {
      const specMod = BUILTIN_LANDING_MODULES.find(
        (m) => m.moduleKey === "specialties-grid",
      )!;
      const block = createBlockFromBuiltinModule(specMod);

      const tree = buildBlockSubLayerTree(block);
      expect(tree.length).toBeGreaterThan(0);

      const root = tree[0];
      expect(root.tag).toBe("section");

      // Container -> cards grid -> card articles
      const container = root.children[0];
      const cardsGrid = container.children.find((c) =>
        c.label.includes("Grilla"),
      );
      expect(cardsGrid).toBeDefined();
      expect(cardsGrid?.children.length).toBeGreaterThanOrEqual(3);

      const firstCard = cardsGrid?.children[0];
      expect(firstCard?.tag).toBe("article");
      expect(firstCard?.iconType).toBe("card");

      // Inside the card, children are nested (div/img, h3, p)
      expect(firstCard?.children.length).toBeGreaterThanOrEqual(3);
      const cardTitle = firstCard?.children.find((c) => c.tag === "h3");
      expect(cardTitle).toBeDefined();
      expect(cardTitle?.iconType).toBe("text");
    });

    it("computes selectors that match the block root relative path", () => {
      const heroMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
      const block = createBlockFromBuiltinModule(heroMod);

      const tree = buildBlockSubLayerTree(block);
      const root = tree[0];

      expect(root.selector).toBe("section:nth-of-type(1)");
      if (root.children.length > 0) {
        expect(root.children[0].selector).toContain("section:nth-of-type(1) >");
      }
    });
  });

  describe("createBlankContainerBlock and nested container insertion", () => {
    it("creates an empty blank container block", () => {
      const containerBlock = createBlankContainerBlock();
      expect(containerBlock.id).toContain("container-");
      expect(containerBlock.moduleKey).toBe("blank-container");
      expect(containerBlock.htmlTemplate).toContain("content-container");
      expect(containerBlock.htmlTemplate).toContain("Arrastrá componentes");

      const tree = buildBlockSubLayerTree(containerBlock);
      expect(tree.length).toBeGreaterThan(0);
      const innerContainer = tree[0].children[0]?.children[0];
      expect(innerContainer?.label).toContain("Contenedor");
    });

    it("creates a container block pre-populated with 2 columns", () => {
      const colBlock = createBlankContainerBlock("columns-2");
      expect(colBlock.htmlTemplate).toContain("grid-columns-2");
      expect(colBlock.htmlTemplate).toContain("repeat(auto-fit, minmax(280px, 1fr))");

      const tree = buildBlockSubLayerTree(colBlock);
      expect(tree.length).toBeGreaterThan(0);
      const root = tree[0];
      const grid = root.children[0]?.children.find((c) =>
        c.label.includes("Grilla"),
      );
      expect(grid).toBeDefined();
    });

    it("inserts layout elements (columns-3, flex-row, card, divider, link, button-secondary) into a block", () => {
      let block = createBlankContainerBlock();

      // Insert columns-3
      block = insertInnerElementInBlock(
        block,
        "section:nth-of-type(1) > div:nth-of-type(1)",
        "columns-3",
      );
      expect(block.htmlTemplate).toContain("grid-columns-3");
      expect(block.htmlTemplate).toContain("repeat(auto-fit, minmax(220px, 1fr))");

      // Insert flex-row
      block = insertInnerElementInBlock(
        block,
        "section:nth-of-type(1) > div:nth-of-type(1)",
        "flex-row",
      );
      expect(block.htmlTemplate).toContain("display: flex");

      // Insert button-secondary
      block = insertInnerElementInBlock(
        block,
        "section:nth-of-type(1) > div:nth-of-type(1)",
        "button-secondary",
      );
      expect(block.htmlTemplate).toContain("btn-secondary");

      // Insert link
      block = insertInnerElementInBlock(
        block,
        "section:nth-of-type(1) > div:nth-of-type(1)",
        "link",
      );
      expect(block.htmlTemplate).toContain("text-decoration: underline");

      // Insert divider
      block = insertInnerElementInBlock(
        block,
        "section:nth-of-type(1) > div:nth-of-type(1)",
        "divider",
      );
      expect(block.htmlTemplate).toContain("<hr");
    });

    it("cleanly replaces placeholder paragraph when inserting into a blank container", () => {
      let block = createBlankContainerBlock();
      expect(block.htmlTemplate).toContain("Contenedor Libre — Arrastrá componentes");

      // Insert heading into the content container
      block = insertInnerElementInBlock(
        block,
        "section:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1)",
        "heading",
      );

      expect(block.htmlTemplate).not.toContain("Contenedor Libre — Arrastrá componentes");
      expect(block.htmlTemplate).toContain("<h3");
      const headingKey = Object.keys(block.values).find((k) => k.startsWith("heading"));
      expect(headingKey).toBeDefined();
      expect(block.values[headingKey!]).toBe("Nuevo Título Destacado");
    });

    it("cleanly replaces placeholder paragraph when inserting into a grid column and labels columns", () => {
      let block = createBlankContainerBlock("columns-2");
      const tree = buildBlockSubLayerTree(block);
      const root = tree[0];
      const grid = root.children[0]?.children.find((c) => c.label.includes("Grilla"));
      expect(grid).toBeDefined();
      expect(grid?.children.length).toBe(2);
      expect(grid?.children[0].label).toBe("Columna 1");
      expect(grid?.children[1].label).toBe("Columna 2");

      // Insert image into Columna 1
      const col1Selector = grid!.children[0].selector;
      block = insertInnerElementInBlock(block, col1Selector, "image");

      expect(block.htmlTemplate).not.toContain("Columna 1 — Arrastrá componentes aquí");
      expect(block.htmlTemplate).toContain("Columna 2 — Arrastrá componentes aquí");
      expect(block.htmlTemplate).toContain("<img");

      // Insert button into Columna 2
      const col2Selector = grid!.children[1].selector;
      block = insertInnerElementInBlock(block, col2Selector, "button");

      expect(block.htmlTemplate).not.toContain("Columna 2 — Arrastrá componentes aquí");
      expect(block.htmlTemplate).toContain("btn-primary");
    });
  });
});




