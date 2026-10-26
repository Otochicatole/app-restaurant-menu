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
  formatVerbatimHtmlLayerLabel,
  insertInnerElementInBlock,
  insertInnerElementInBlockWithSelector,
  moveBlockIntoBlock,
  moveSubElementBetweenBlocks,
  moveSubElementInBlock,
  parseSubElementStyles,
  reparentSubElementInBlock,
  serializeSubElementStyles,
  syncFieldsWithHtmlTemplate,
  updateSubElementAttributeInBlock,
  updateSubElementTextInBlock,
} from "./landing-compiler";
import {
  BUILTIN_LANDING_MODULES,
  createBlockFromBuiltinModule,
} from "./landing-module-catalog";
import {
  decodeLandingTemplateBundle,
  encodeLandingTemplateBundle,
} from "./landing-template-bundle";
import { LANDING_TEMPLATE_PRESETS } from "./landing-template-presets";

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
    expect(compiled.previewCss).toContain('[data-selected="true"]');
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

  it("compiles 4-direction padding and margin overrides into scoped CSS", () => {
    const stylesMap = {
      "div.card-container": {
        paddingTop: "15px",
        paddingRight: "25px",
        paddingBottom: "35px",
        paddingLeft: "45px",
        marginTop: "10px",
        marginRight: "auto",
        marginBottom: "20px",
        marginLeft: "auto",
      },
    };
    const serialized = serializeSubElementStyles(stylesMap);
    const css = buildSubElementScopedCss("blk-card-1", {
      __subStyles: serialized,
    });

    expect(css).toContain("padding-top: 15px !important;");
    expect(css).toContain("padding-right: 25px !important;");
    expect(css).toContain("padding-bottom: 35px !important;");
    expect(css).toContain("padding-left: 45px !important;");
    expect(css).toContain("margin-top: 10px !important;");
    expect(css).toContain("margin-right: auto !important;");
    expect(css).toContain("margin-bottom: 20px !important;");
    expect(css).toContain("margin-left: auto !important;");
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
      expect(navNode?.label).toContain("nav");

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
        c.label.includes("cards-grid"),
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

    it("represents ALL nested tags in header including brand icon/name spans and hamburger toggle spans", () => {
      const headerMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "header")!;
      const block = createBlockFromBuiltinModule(headerMod);
      const tree = buildBlockSubLayerTree(block);

      const root = tree[0];
      expect(root.tag).toBe("header");
      const navContainer = root.children[0];
      expect(navContainer.tag).toBe("div");

      // Brand logo <a> should have children: span.brand-icon and span.brand-name
      const brandLogo = navContainer.children.find((c) => c.selector.includes("a:nth-of-type(1)"));
      expect(brandLogo).toBeDefined();
      expect(brandLogo?.tag).toBe("a");
      expect(brandLogo?.children.length).toBe(2);
      expect(brandLogo?.children[0].tag).toBe("span");
      expect(brandLogo?.children[0].label).toContain("brand-icon");
      expect(brandLogo?.children[1].tag).toBe("span");
      expect(brandLogo?.children[1].label).toContain("brand-name");

      // Nav toggle <button> should have 3 span children for the hamburger bars
      const navToggle = navContainer.children.find((c) => c.tag === "button");
      expect(navToggle).toBeDefined();
      expect(navToggle?.children.length).toBe(3);
      expect(navToggle?.children.every((c) => c.tag === "span")).toBe(true);
    });

    it("represents ALL nested tags in hero including hero-actions and button text spans", () => {
      const heroMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
      const block = createBlockFromBuiltinModule(heroMod);
      const tree = buildBlockSubLayerTree(block);

      const root = tree[0];
      const container = root.children[0];
      const heroContent = container.children[0];
      expect(heroContent.tag).toBe("div");
      expect(heroContent.label).toContain("hero-content");

      // Badge, Title, Subtitle, Actions
      const heroActions = heroContent.children.find((c) => c.label.includes("hero-actions"));
      expect(heroActions).toBeDefined();
      expect(heroActions?.children.length).toBe(2);

      // Each button CTA should contain its inner span text tag
      const primaryBtn = heroActions?.children[0];
      expect(primaryBtn?.tag).toBe("a");
      expect(primaryBtn?.children.length).toBe(1);
      expect(primaryBtn?.children[0].tag).toBe("span");

      const secondaryBtn = heroActions?.children[1];
      expect(secondaryBtn?.tag).toBe("a");
      expect(secondaryBtn?.children.length).toBe(1);
      expect(secondaryBtn?.children[0].tag).toBe("span");
    });

    it("represents ALL nested tags in experience-split including features-list, check spans and strong tags", () => {
      const expMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "experience-split")!;
      const block = createBlockFromBuiltinModule(expMod);
      const tree = buildBlockSubLayerTree(block);

      const root = tree[0];
      const container = root.children[0];

      // Left column (visual)
      const visualCol = container.children.find((c) => c.label.includes("experience-visual"));
      expect(visualCol).toBeDefined();
      const badgeFloat = visualCol?.children[0];
      expect(badgeFloat?.children.length).toBe(2);
      expect(badgeFloat?.children[0].label).toContain("exp-number");
      expect(badgeFloat?.children[1].label).toContain("exp-label");

      const quoteBox = visualCol?.children[1];
      expect(quoteBox?.children[0].tag).toBe("p");

      // Right column (editorial content)
      const contentCol = container.children.find((c) => c.label.includes("experience-content"));
      expect(contentCol).toBeDefined();
      const featuresList = contentCol?.children.find((c) => c.label.includes("features-list"));
      expect(featuresList).toBeDefined();
      expect(featuresList?.children.length).toBe(3);

      const firstItem = featuresList?.children[0];
      expect(firstItem?.tag).toBe("div");
      expect(firstItem?.children.length).toBe(2);
      expect(firstItem?.children[0].tag).toBe("span");
      expect(firstItem?.children[0].label).toContain("feature-check");

      const itemTextBox = firstItem?.children[1];
      expect(itemTextBox?.tag).toBe("div");
      expect(itemTextBox?.children.length).toBe(1);
      expect(itemTextBox?.children[0].tag).toBe("strong");
      expect(itemTextBox?.children[0].label).toContain("strong");
    });

    it("represents ALL nested tags in footer including footer-brand, year span inside p, and footer-links", () => {
      const footerMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "footer")!;
      const block = createBlockFromBuiltinModule(footerMod);
      const tree = buildBlockSubLayerTree(block);

      const root = tree[0];
      expect(root.tag).toBe("footer");
      const container = root.children[0];

      const footerBrand = container.children.find((c) => c.label.includes("footer-brand"));
      expect(footerBrand).toBeDefined();
      expect(footerBrand?.children.length).toBe(2);
      expect(footerBrand?.children[0].tag).toBe("span");
      expect(footerBrand?.children[1].tag).toBe("p");

      // The p.footer-copy contains child span.js-current-year
      const copyParagraph = footerBrand?.children[1];
      expect(copyParagraph?.children.length).toBe(1);
      expect(copyParagraph?.children[0].tag).toBe("span");

      const footerLinks = container.children.find((c) => c.label.includes("footer-links"));
      expect(footerLinks).toBeDefined();
      expect(footerLinks?.children.length).toBe(2);
      expect(footerLinks?.children.every((c) => c.tag === "a")).toBe(true);
    });
  });

  describe("createBlankContainerBlock and nested container insertion", () => {
    it("creates an empty blank container block", () => {
      const containerBlock = createBlankContainerBlock();
      expect(containerBlock.id).toContain("container-");
      expect(containerBlock.moduleKey).toBe("blank-container");
      expect(containerBlock.htmlTemplate).not.toContain("content-container");
      expect(containerBlock.htmlTemplate).toContain("container");
      expect(containerBlock.htmlTemplate).toContain("Arrastrá componentes");

      const tree = buildBlockSubLayerTree(containerBlock);
      expect(tree.length).toBeGreaterThan(0);
      const root = tree[0];
      expect(root.tag).toBe("section");
      expect(root.children[0]?.tag).toBe("div");
      expect(root.children[0]?.label).toContain("container");
      // Direct child of container is the placeholder <p>, NOT a nested div
      expect(root.children[0]?.children[0]?.tag).toBe("p");
    });

    it("creates a container block pre-populated with 2 columns", () => {
      const colBlock = createBlankContainerBlock("columns-2");
      expect(colBlock.htmlTemplate).toContain("grid-columns-2");
      expect(colBlock.htmlTemplate).toContain("repeat(auto-fit, minmax(280px, 1fr))");

      const tree = buildBlockSubLayerTree(colBlock);
      expect(tree.length).toBeGreaterThan(0);
      const root = tree[0];
      const grid = root.children.find((c) =>
        c.label.includes("grid-columns-2"),
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
        "section:nth-of-type(1) > div:nth-of-type(1)",
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
      const grid = root.children.find((c) => c.label.includes("grid-columns-2"));
      expect(grid).toBeDefined();
      expect(grid?.children.length).toBe(2);
      expect(grid?.children[0].label).toContain("grid-column");
      expect(grid?.children[1].label).toContain("grid-column");

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

  describe("Drag and Drop layer moving & reparenting", () => {
    it("moves a sub-layer inside another container layer within the same block", () => {
      let block = createBlankContainerBlock("columns-2");
      // col 1 and col 2
      const tree = buildBlockSubLayerTree(block);
      const root = tree[0];
      const grid = root.children.find((c) => c.label.includes("grid-columns-2"));
      expect(grid).toBeDefined();
      const col1Selector = grid!.children[0].selector;
      const col2Selector = grid!.children[1].selector;

      // Insert button in col 1
      block = insertInnerElementInBlock(block, col1Selector, "button");
      const treeAfterBtn = buildBlockSubLayerTree(block);
      const col1 = treeAfterBtn[0].children.find((c) => c.label.includes("grid-columns-2"))?.children[0];
      const btnNode = col1?.children.find((c) => c.tag === "button" || c.tag === "a");
      expect(btnNode).toBeDefined();

      // Add a custom style to the button
      block.values.__subStyles = serializeSubElementStyles({
        [btnNode!.selector]: { backgroundColor: "#ff0000" },
      });

      // Move the button from Columna 1 INSIDE Columna 2
      const reparentResult = reparentSubElementInBlock(
        block,
        btnNode!.selector,
        col2Selector,
        "inside",
      );

      expect(reparentResult).not.toBeNull();
      const updatedBlock = reparentResult!.block;
      expect(reparentResult!.newSelector).toContain(col2Selector);

      // Verify the new tree has button inside col 2
      const treeAfterMove = buildBlockSubLayerTree(updatedBlock);
      const gridAfterMove = treeAfterMove[0].children.find((c) => c.label.includes("grid-columns-2"));
      expect(gridAfterMove).toBeDefined();
      const col1AfterMove = gridAfterMove!.children[0];
      const col2AfterMove = gridAfterMove!.children[1];

      expect(col1AfterMove.children.some((c) => c.tag === "a")).toBe(false);
      expect(col2AfterMove.children.some((c) => c.tag === "a")).toBe(true);

      // Verify sub-styles transferred to the new selector
      const subStyles = parseSubElementStyles(updatedBlock.values.__subStyles);
      expect(subStyles[reparentResult!.newSelector]?.backgroundColor).toBe("#ff0000");
    });

    it("prevents circular moves (moving a parent inside its child or itself)", () => {
      const heroMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
      const block = createBlockFromBuiltinModule(heroMod);
      const parentSelector = "section:nth-of-type(1) > div:nth-of-type(1)";
      const childSelector = "section:nth-of-type(1) > div:nth-of-type(1) > h1:nth-of-type(1)";

      // Attempting to move container into itself
      expect(reparentSubElementInBlock(block, parentSelector, parentSelector, "inside")).toBeNull();

      // Attempting to move container into its own child (h1)
      expect(reparentSubElementInBlock(block, parentSelector, childSelector, "inside")).toBeNull();
    });

    it("moves a sub-layer between two different blocks", () => {
      const heroMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
      const sourceBlock = createBlockFromBuiltinModule(heroMod);
      const targetBlock = createBlankContainerBlock("container");

      const sourceTree = buildBlockSubLayerTree(sourceBlock);
      const heroContent = sourceTree[0].children[0]?.children[0];
      const h1Node = heroContent?.children.find((c) => c.tag === "h1");
      expect(h1Node).toBeDefined();

      const targetTree = buildBlockSubLayerTree(targetBlock);
      const targetContainer = targetTree[0].children[0];
      expect(targetContainer).toBeDefined();

      const res = moveSubElementBetweenBlocks(
        sourceBlock,
        h1Node!.selector,
        targetBlock,
        targetContainer!.selector,
        "inside",
      );

      expect(res).not.toBeNull();
      expect(res!.sourceBlock.htmlTemplate).not.toContain("<h1");
      expect(res!.targetBlock.htmlTemplate).toContain("<h1");
      // Values/variables synced
      expect(res!.targetBlock.fields.some((f) => f.key.startsWith("title"))).toBe(true);
    });

    it("moves a whole block into another block container", () => {
      const heroMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
      const heroBlock = createBlockFromBuiltinModule(heroMod);
      const containerBlock = createBlankContainerBlock("container");

      const res = moveBlockIntoBlock(
        heroBlock,
        containerBlock,
      );

      expect(res).not.toBeNull();
      expect(res!.targetBlock.htmlTemplate).toContain("nested-block-hero");
    });

    it("compiles section opacity and sub-element opacity overrides", () => {
      const heroMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
      const heroBlock = createBlockFromBuiltinModule(heroMod);
      heroBlock.values.__opacity = "0.85";
      heroBlock.values.__bgColor = "#00000080";
      heroBlock.values.__subStyles = JSON.stringify({
        h1: { opacity: "0.9", backgroundColor: "transparent" },
      });

      const doc = createDefaultLandingDocument("Casa Brasa", "casa-brasa");
      doc.blocks = [heroBlock];

      const compiled = compileLandingFromDocument(doc, {
        restaurantName: "Casa Brasa",
        restaurantSlug: "casa-brasa",
      });

      expect(compiled.htmlContent).toContain("opacity: 0.85 !important");
      expect(compiled.htmlContent).toContain("background-color: #00000080 !important");
      expect(compiled.cssContent).toContain("opacity: 0.9 !important");
      expect(compiled.cssContent).toContain("background-color: transparent !important");
    });

    it("compiles individual borders and corner radius for blocks and sub-elements", () => {
      const heroMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
      const heroBlock = createBlockFromBuiltinModule(heroMod);
      heroBlock.values.__borderBottomWidth = "3px";
      heroBlock.values.__borderTopWidth = "0px";
      heroBlock.values.__borderColor = "#e2e8f0";
      heroBlock.values.__borderTopLeftRadius = "16px";
      heroBlock.values.__borderTopRightRadius = "16px";
      heroBlock.values.__subStyles = JSON.stringify({
        ".badge": {
          borderBottomWidth: "2px",
          borderTopWidth: "1px",
          borderColor: "#3b82f6",
          borderTopLeftRadius: "8px",
          borderBottomRightRadius: "8px",
        },
      });

      const doc = createDefaultLandingDocument("Casa Brasa", "casa-brasa");
      doc.blocks = [heroBlock];

      const compiled = compileLandingFromDocument(doc, {
        restaurantName: "Casa Brasa",
        restaurantSlug: "casa-brasa",
      });

      // Section block individual borders & corners
      expect(compiled.htmlContent).toContain("border-bottom-width: 3px !important");
      expect(compiled.htmlContent).toContain("border-top-width: 0px !important");
      expect(compiled.htmlContent).toContain("border-color: #e2e8f0 !important");
      expect(compiled.htmlContent).toContain("border-top-left-radius: 16px");
      expect(compiled.htmlContent).toContain("border-top-right-radius: 16px");

      // Sub-element individual borders & corners
      expect(compiled.cssContent).toContain("border-bottom-width: 2px !important");
      expect(compiled.cssContent).toContain("border-top-width: 1px !important");
      expect(compiled.cssContent).toContain("border-color: #3b82f6 !important");
      expect(compiled.cssContent).toContain("border-top-left-radius: 8px !important");
      expect(compiled.cssContent).toContain("border-bottom-right-radius: 8px !important");
    });

    it("compiles display, flexbox, grid, dimensions, position, and typography properties for blocks and sub-elements", () => {
      const heroMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
      const heroBlock = createBlockFromBuiltinModule(heroMod);
      heroBlock.values.__display = "flex";
      heroBlock.values.__flexDirection = "column";
      heroBlock.values.__justifyContent = "center";
      heroBlock.values.__alignItems = "center";
      heroBlock.values.__gap = "24px";
      heroBlock.values.__minHeight = "600px";
      heroBlock.values.__overflow = "hidden";
      heroBlock.values.__subStyles = JSON.stringify({
        ".hero-actions": {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          rowGap: "12px",
          columnGap: "20px",
        },
        ".grid-cards": {
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          justifyItems: "stretch",
          alignSelf: "stretch",
          flexGrow: "1",
          gridColumn: "1 / -1",
          minWidth: "280px",
          maxHeight: "480px",
          aspectRatio: "16/9",
          overflow: "clip",
          position: "relative",
          zIndex: "10",
          backdropFilter: "blur(12px)",
          fontFamily: "Georgia, serif",
          textTransform: "uppercase",
          textDecoration: "underline",
          fontStyle: "italic",
        },
      });

      const doc = createDefaultLandingDocument("Casa Brasa", "casa-brasa");
      doc.blocks = [heroBlock];

      const compiled = compileLandingFromDocument(doc, {
        restaurantName: "Casa Brasa",
        restaurantSlug: "casa-brasa",
      });

      // Block root layout overrides
      expect(compiled.htmlContent).toContain("display: flex !important");
      expect(compiled.htmlContent).toContain("flex-direction: column !important");
      expect(compiled.htmlContent).toContain("justify-content: center !important");
      expect(compiled.htmlContent).toContain("align-items: center !important");
      expect(compiled.htmlContent).toContain("gap: 24px !important");
      expect(compiled.htmlContent).toContain("min-height: 600px !important");
      expect(compiled.htmlContent).toContain("overflow: hidden !important");

      // Sub-element Flexbox & Grid overrides
      expect(compiled.cssContent).toContain("display: flex !important");
      expect(compiled.cssContent).toContain("flex-direction: row !important");
      expect(compiled.cssContent).toContain("flex-wrap: wrap !important");
      expect(compiled.cssContent).toContain("justify-content: space-between !important");
      expect(compiled.cssContent).toContain("row-gap: 12px !important");
      expect(compiled.cssContent).toContain("column-gap: 20px !important");
      expect(compiled.cssContent).toContain("display: grid !important");
      expect(compiled.cssContent).toContain("grid-template-columns: repeat(3, minmax(0, 1fr)) !important");
      expect(compiled.cssContent).toContain("grid-column: 1 / -1 !important");
      expect(compiled.cssContent).toContain("aspect-ratio: 16/9 !important");
      expect(compiled.cssContent).toContain("backdrop-filter: blur(12px) !important");
      expect(compiled.cssContent).toContain("text-transform: uppercase !important");
      expect(compiled.cssContent).toContain("font-style: italic !important");
    });

    it("compiles position, top, right, bottom, left, and z-index for sub-elements and sections", () => {
      const heroMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
      const heroBlock = createBlockFromBuiltinModule(heroMod);
      heroBlock.values.__position = "sticky";
      heroBlock.values.__top = "0px";
      heroBlock.values.__zIndex = "50";
      heroBlock.values.__subStyles = JSON.stringify({
        ".floating-badge": {
          position: "absolute",
          top: "12px",
          right: "16px",
          bottom: "auto",
          left: "auto",
          zIndex: "20",
        },
        ".fixed-whatsapp-button": {
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: "999",
        },
      });

      const doc = createDefaultLandingDocument("Casa Brasa", "casa-brasa");
      doc.blocks = [heroBlock];

      const compiled = compileLandingFromDocument(doc, {
        restaurantName: "Casa Brasa",
        restaurantSlug: "casa-brasa",
      });

      // Section wrapper position styles
      expect(compiled.htmlContent).toContain("position: sticky !important");
      expect(compiled.htmlContent).toContain("top: 0px !important");
      expect(compiled.htmlContent).toContain("z-index: 50 !important");

      // Sub-element absolute position & coordinates
      expect(compiled.cssContent).toContain("position: absolute !important");
      expect(compiled.cssContent).toContain("top: 12px !important");
      expect(compiled.cssContent).toContain("right: 16px !important");
      expect(compiled.cssContent).toContain("bottom: auto !important");
      expect(compiled.cssContent).toContain("left: auto !important");
      expect(compiled.cssContent).toContain("z-index: 20 !important");

      // Sub-element fixed position
      expect(compiled.cssContent).toContain("position: fixed !important");
      expect(compiled.cssContent).toContain("bottom: 24px !important");
      expect(compiled.cssContent).toContain("right: 24px !important");
      expect(compiled.cssContent).toContain("z-index: 999 !important");
    });

    it("inserts semantic HTML tag presets into blocks and standalone containers", () => {
      let block = createBlankContainerBlock("flex-col");
      expect(block.htmlTemplate).toContain("flex-col");

      block = insertInnerElementInBlock(block, null, "h1");
      expect(block.htmlTemplate).toContain("<h1");

      block = insertInnerElementInBlock(block, null, "blockquote");
      expect(block.htmlTemplate).toContain("<blockquote");

      block = insertInnerElementInBlock(block, null, "ul-list");
      expect(block.htmlTemplate).toContain("<ul");
      expect(block.htmlTemplate).toContain("<li");

      block = insertInnerElementInBlock(block, null, "html-button");
      expect(block.htmlTemplate).toContain("<button");

      block = insertInnerElementInBlock(block, null, "accordion");
      expect(block.htmlTemplate).toContain("<details");
      expect(block.htmlTemplate).toContain("<summary");

      block = insertInnerElementInBlock(block, null, "figure");
      expect(block.htmlTemplate).toContain("<figure");
      expect(block.htmlTemplate).toContain("<figcaption");

      block = insertInnerElementInBlock(block, null, "columns-4");
      expect(block.htmlTemplate).toContain("grid-columns-4");
      expect(block.htmlTemplate).toContain("Columna 4");
    });

    it("verifies canvas preview is free of floating toolbars and floating badges", () => {
      const doc = createDefaultLandingDocument("Casa Brasa", "casa-brasa");
      const compiled = compileLandingFromDocument(doc, {
        restaurantName: "Casa Brasa",
        restaurantSlug: "casa-brasa",
      }, { interactiveEditor: true });

      // Floating toolbar and floating badge must NOT be present in preview CSS or JS
      expect(compiled.previewCss).not.toContain("#__landing-editor-toolbar");
      expect(compiled.previewCss).not.toContain("[data-landing-block]::before");
      expect(compiled.previewJs).not.toContain("__landing-editor-toolbar");
      expect(compiled.previewJs).not.toContain("positionToolbar");

      // Clean selection outlines remain intact
      expect(compiled.previewCss).toContain('[data-selected="true"]');
      expect(compiled.previewCss).toContain('[data-sub-selected="true"]');

      // Drag preview indicator and inline editing styles
      expect(compiled.previewCss).toContain("#__landing-drop-indicator");
      expect(compiled.previewCss).toContain(".landing-drop-inside");
      expect(compiled.previewCss).toContain(".landing-inline-editing");
    });

    it("updates sub-element text content cleanly via inline editing", () => {
      const heroMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "hero")!;
      let block = createBlockFromBuiltinModule(heroMod);

      // 1. Update bound variable text
      const titleSelector = "section:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > h1:nth-of-type(1)";
      block = updateSubElementTextInBlock(block, titleSelector, "Nuevo Título Gourmet");
      expect(block.values.title).toBe("Nuevo Título Gourmet");

      // 2. Insert preset element and update its text (bound to unique variable)
      block = insertInnerElementInBlock(block, null, "h2", "after");
      expect(block.htmlTemplate).toContain("<h2");
      const h2Selector = "section:nth-of-type(1) > div:nth-of-type(1) > h2:nth-of-type(1)";
      block = updateSubElementTextInBlock(block, h2Selector, "Subtítulo de Prueba");
      expect(Object.values(block.values)).toContain("Subtítulo de Prueba");

      // 3. Raw HTML sub-element without variables in a blank container
      let blank = createBlankContainerBlock();
      blank.htmlTemplate = `<section><div class="container"><p class="raw-note">Texto Original</p></div></section>`;
      const rawSelector = "section:nth-of-type(1) > div:nth-of-type(1) > p:nth-of-type(1)";
      blank = updateSubElementTextInBlock(blank, rawSelector, "Texto Reemplazado");
      expect(blank.htmlTemplate).toContain("Texto Reemplazado");
    });

    it("inserts inner elements with specific positions (before, after, inside)", () => {
      let block = createBlankContainerBlock("flex-col");
      const colSelector = "section:nth-of-type(1) > div:nth-of-type(1)";

      // Insert button inside
      block = insertInnerElementInBlock(block, colSelector, "button", "inside");
      expect(block.htmlTemplate).toContain("btn-primary");

      // Insert heading before button
      const btnSelector = `${colSelector} > a:nth-of-type(1)`;
      block = insertInnerElementInBlock(block, btnSelector, "h1", "before");
      expect(block.htmlTemplate).toContain("<h1");
      const h1Idx = block.htmlTemplate.indexOf("<h1");
      const btnIdx = block.htmlTemplate.indexOf("btn-primary");
      expect(h1Idx).toBeLessThan(btnIdx);
    });

    it("compiles all landing template presets successfully including arco-bar", () => {
      expect(LANDING_TEMPLATE_PRESETS.length).toBeGreaterThanOrEqual(7);

      for (const preset of LANDING_TEMPLATE_PRESETS) {
        const compiled = compileLandingFromDocument(preset.document, {
          restaurantName: preset.name,
          restaurantSlug: "restaurante",
        });
        expect(compiled.htmlContent.length).toBeGreaterThan(100);
        expect(compiled.cssContent.length).toBeGreaterThan(50);
      }

      const arcoPreset = LANDING_TEMPLATE_PRESETS.find((p) => p.id === "landing-preset-arco-bar");
      expect(arcoPreset).toBeDefined();
      const compiledArco = compileLandingFromDocument(arcoPreset!.document, {
        restaurantName: "Arco",
        restaurantSlug: "arco",
      });
      expect(compiledArco.fullHtml).toContain("reservas-mesa");
      expect(compiledArco.fullHtml).toContain("pap");
      expect(compiledArco.fullHtml).toContain("panel-navegacion");
      expect(compiledArco.fullHtml).toContain("bb-izq");
      expect(compiledArco.fullHtml).toContain("Cumpleaños en Arco");
      expect(compiledArco.fullHtml).toContain("Chili Power");
      expect(compiledArco.fullHtml).toContain("Papas Arco");
      expect(compiledArco.cssContent).toContain("--violeta");
      expect(compiledArco.jsContent).toContain("initReviewsCarousel");
    });

    it("injects responsive navigation toggle and runtime handlers into preview and document", () => {
      const headerMod = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "header")!;
      const headerBlock = createBlockFromBuiltinModule(headerMod);
      const doc = createDefaultLandingDocument("Restaurante Test", "test-rest");

      const compiled = compileLandingFromDocument(doc, {
        restaurantName: "Restaurante Test",
        restaurantSlug: "test-rest",
      }, {
        interactiveEditor: true,
        selectedBlockId: headerBlock.id,
      });

      // Verify interactive preview contains responsive nav menu styles
      expect(compiled.previewCss).toContain(".nav-menu.open");
      expect(compiled.previewCss).toContain("display: flex !important");

      // Verify fullHtml includes runtime navigation script and responsive toggle handler
      expect(compiled.fullHtml).toContain("landing-runtime-nav");
      expect(compiled.fullHtml).toContain("#navToggle");
      expect(compiled.fullHtml).toContain(".nav-toggle");
      expect(compiled.fullHtml).toContain("aria-expanded");

      // Verify module scripts are wrapped safely for readyState
      expect(compiled.previewJs).toContain("__initModuleScripts");

      // Verify that runtime navigation scripts do NOT run in editor mode (guarded by data-preview-mode !== 'true')
      expect(compiled.fullHtml).toContain('document.documentElement.getAttribute(\'data-preview-mode\') !== \'true\'');
    });

    it("correctly compiles the reservations-booking builtin module with full availability and event options", () => {
      const resModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "reservations-booking");
      expect(resModule).toBeDefined();
      expect(resModule?.category).toBe("contacto");

      const resBlock = createBlockFromBuiltinModule(resModule!);
      expect(resBlock.fields.length).toBeGreaterThan(10);
      expect(resBlock.values.title).toBe("Asegurá tu Mesa");
      expect(resBlock.values.btnSubmitLabel).toBe("Confirmar Reserva");

      const doc = createDefaultLandingDocument("Bistró Gourmet", "bistro-gourmet");
      doc.blocks.push(resBlock);

      const compiled = compileLandingFromDocument(doc, {
        restaurantName: "Bistró Gourmet",
        restaurantSlug: "bistro-gourmet",
      });

      // Verify interpolated slug and restaurant name
      expect(compiled.fullHtml).toContain('data-restaurant-slug="bistro-gourmet"');
      expect(compiled.fullHtml).toContain('data-restaurant-name="Bistró Gourmet"');
      expect(compiled.fullHtml).toContain("resBookingForm");
      expect(compiled.fullHtml).toContain("resPartyPills");
      expect(compiled.fullHtml).toContain("resSlotsContainer");
      expect(compiled.fullHtml).toContain("resSuccessView");
      expect(compiled.fullHtml).toContain("resVoucherCode");
      expect(compiled.fullHtml).toContain("resVoucherWaBtn");

      // Verify CSS styles are generated
      expect(compiled.cssContent).toContain(".reservation-container");
      expect(compiled.cssContent).toContain(".res-party-pill");
      expect(compiled.cssContent).toContain(".res-slot-pill");
      expect(compiled.cssContent).toContain(".res-voucher-card");

      // Verify JS script is included and connects to public availability & booking endpoints
      expect(compiled.jsContent).toContain("/api/public/landing/");
      expect(compiled.jsContent).toContain("/reservations/availability");
      expect(compiled.jsContent).toContain("data-restaurant-slug");
      expect(compiled.jsContent).toContain("resBookingForm");
    });

    it("correctly compiles the dedicated reservations-table module with interactive 14-day chips and slots", () => {
      const tableModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "reservations-table");
      expect(tableModule).toBeDefined();
      expect(tableModule?.category).toBe("contacto");

      const tableBlock = createBlockFromBuiltinModule(tableModule!);
      expect(tableBlock.fields.length).toBeGreaterThan(10);
      expect(tableBlock.values.title).toBe("Asegurá tu Mesa");

      const doc = createDefaultLandingDocument("La Terraza", "la-terraza");
      doc.blocks.push(tableBlock);

      const compiled = compileLandingFromDocument(doc, {
        restaurantName: "La Terraza",
        restaurantSlug: "la-terraza",
      });

      expect(compiled.fullHtml).toContain('data-restaurant-slug="la-terraza"');
      expect(compiled.fullHtml).toContain("resDaysRow");
      expect(compiled.fullHtml).toContain("resSlotsContainer");
      expect(compiled.fullHtml).toContain("resTableForm");
      expect(compiled.cssContent).toContain(".res-day-chip");
      expect(compiled.cssContent).toContain(".res-slot-pill");
      expect(compiled.jsContent).toContain("/reservations/tables/availability");
      expect(compiled.jsContent).toContain("/reservations/tables");
    });

    it("correctly compiles the dedicated reservations-events module with cards and booking modal", () => {
      const eventsModule = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === "reservations-events");
      expect(eventsModule).toBeDefined();
      expect(eventsModule?.category).toBe("contacto");

      const eventsBlock = createBlockFromBuiltinModule(eventsModule!);
      expect(eventsBlock.values.title).toBe("Noches Especiales & Eventos");

      const doc = createDefaultLandingDocument("La Terraza", "la-terraza");
      doc.blocks.push(eventsBlock);

      const compiled = compileLandingFromDocument(doc, {
        restaurantName: "La Terraza",
        restaurantSlug: "la-terraza",
      });

      expect(compiled.fullHtml).toContain("eventsListGrid");
      expect(compiled.fullHtml).toContain("eventModalBackdrop");
      expect(compiled.fullHtml).toContain("eventBookingForm");
      expect(compiled.cssContent).toContain(".events-grid");
      expect(compiled.cssContent).toContain(".event-card");
      expect(compiled.jsContent).toContain("/reservations/events");
    });

    it("renders draggable block handles and reorder action buttons only when interactiveEditor is enabled", () => {
      const doc = createDefaultLandingDocument("La Terraza", "la-terraza");
      const editorCompiled = compileLandingFromDocument(doc, {
        restaurantName: "La Terraza",
        restaurantSlug: "la-terraza",
      }, { interactiveEditor: true });

      expect(editorCompiled.htmlContent).toContain("landing-block-handle");
      expect(editorCompiled.htmlContent).toContain("landing-block-btn-up");
      expect(editorCompiled.htmlContent).toContain("landing-block-btn-down");
      expect(editorCompiled.previewCss).toContain(".landing-block-handle");

      const publicCompiled = compileLandingFromDocument(doc, {
        restaurantName: "La Terraza",
        restaurantSlug: "la-terraza",
      });

      expect(publicCompiled.htmlContent).not.toContain("landing-block-handle");
      expect(publicCompiled.htmlContent).not.toContain("landing-block-btn-up");
    });

    it("reorders sibling elements before and after each other using reparentSubElementInBlock", () => {
      const block = createBlankContainerBlock("columns-2");
      // col 1 selector and col 2 selector
      const tree = buildBlockSubLayerTree(block);
      const grid = tree[0].children.find((c) => c.label.includes("grid-columns-2"));
      expect(grid).toBeDefined();
      const col1Selector = grid!.children[0].selector;
      const col2Selector = grid!.children[1].selector;

      // Moving col2 before col1
      const resBefore = reparentSubElementInBlock(block, col2Selector, col1Selector, "before");
      expect(resBefore).not.toBeNull();
      expect(resBefore!.block.htmlTemplate).toBeTruthy();

      // Moving col1 after col2
      const resAfter = reparentSubElementInBlock(block, col1Selector, col2Selector, "after");
      expect(resAfter).not.toBeNull();
      expect(resAfter!.block.htmlTemplate).toBeTruthy();
    });

    it("renders draggable block handle as <l-handle> to avoid nth-of-type selector skewing for <div> blocks", () => {
      const doc = createDefaultLandingDocument("La Terraza", "la-terraza");
      const editorCompiled = compileLandingFromDocument(
        doc,
        {
          restaurantName: "La Terraza",
          restaurantSlug: "la-terraza",
        },
        { interactiveEditor: true },
      );

      // Must be <l-handle> and not a direct <div> child
      expect(editorCompiled.htmlContent).toContain("<l-handle class=\"landing-block-handle\"");
      expect(editorCompiled.htmlContent).not.toContain("<div class=\"landing-block-handle\"");
    });

    it("inserts inner element and returns its new selector accurately via insertInnerElementInBlockWithSelector", () => {
      const block = createBlankContainerBlock("columns-2");
      const tree = buildBlockSubLayerTree(block);
      const grid = tree[0].children.find((c) => c.label.includes("grid-columns-2"));
      expect(grid).toBeDefined();
      const col1Selector = grid!.children[0].selector;

      // Insert image into Column 1
      const res1 = insertInnerElementInBlockWithSelector(block, col1Selector, "image", "inside");
      expect(res1.newSelector).toBeTruthy();
      expect(res1.newSelector).toContain("img");
      expect(res1.block.htmlTemplate).toContain("<img");
      expect(res1.block.htmlTemplate).not.toContain("Columna 1 — Arrastrá componentes aquí");
      expect(res1.block.htmlTemplate).toContain("Columna 2 — Arrastrá componentes aquí");

      // Column 1 should still exist and Column 2 should still exist (2 columns, not 3)
      const treeAfter = buildBlockSubLayerTree(res1.block);
      const gridAfter = treeAfter[0].children.find((c) => c.label.includes("grid-columns-2"));
      expect(gridAfter?.children.length).toBe(2);

      // Now insert button into Column 1 before the image
      const res2 = insertInnerElementInBlockWithSelector(res1.block, res1.newSelector, "button", "before");
      expect(res2.newSelector).toBeTruthy();
      expect(res2.newSelector).toContain("a:nth-of-type(1)");
      expect(res2.block.htmlTemplate).toContain("btn-primary");
    });

    it("falls back safely to replacing placeholder if targetSelector was stale or not found", () => {
      const block = createBlankContainerBlock("container");
      expect(block.htmlTemplate).toContain("Contenedor Libre");

      const res = insertInnerElementInBlockWithSelector(block, "non-existent-selector > div", "heading", "inside");
      expect(res.newSelector).toBeTruthy();
      expect(res.block.htmlTemplate).toContain("<h3");
      expect(res.block.htmlTemplate).not.toContain("Contenedor Libre");
    });

    it("represents HTML tags and inner contents verbatim without artificial nesting", () => {
      // 1. Verbatim layer label formatter tests
      expect(formatVerbatimHtmlLayerLabel("section", { className: "section" })).toBe("<section.section>");
      expect(formatVerbatimHtmlLayerLabel("div", { className: "container hero-container" })).toBe("<div.container.hero-container>");
      expect(formatVerbatimHtmlLayerLabel("div", { id: "main-box", className: "content" })).toBe("<div#main-box.content>");
      expect(formatVerbatimHtmlLayerLabel("p", {}, "Contenedor Libre - Arrastrá componentes")).toContain('<p> "Contenedor Libre - Arrast');
      expect(formatVerbatimHtmlLayerLabel("h1", { className: "hero-title" }, "Bienvenidos")).toBe('<h1.hero-title> "Bienvenidos"');
      expect(formatVerbatimHtmlLayerLabel("img", { alt: "Foto del plato" })).toBe('<img alt="Foto del plato">');
      expect(formatVerbatimHtmlLayerLabel("input", { placeholder: "Tu email..." })).toBe('<input placeholder="Tu email...">');

      // Containers with children should NOT duplicate inner text
      expect(formatVerbatimHtmlLayerLabel("div", { className: "box" }, "Texto interior", true)).toBe("<div.box>");

      // 2. Full tree of createBlankContainerBlock represents HTML verbatim
      const block = createBlankContainerBlock();
      const tree = buildBlockSubLayerTree(block);

      expect(tree).toHaveLength(1);
      const rootSection = tree[0];
      expect(rootSection.tag).toBe("section");
      expect(rootSection.label).toBe("<section.section>");

      // Direct child is <div.container>
      expect(rootSection.children).toHaveLength(1);
      const containerDiv = rootSection.children[0];
      expect(containerDiv.tag).toBe("div");
      expect(containerDiv.label).toBe("<div.container>");

      // Direct child of container is the placeholder <p> without redundant content-container div!
      expect(containerDiv.children).toHaveLength(1);
      const paragraph = containerDiv.children[0];
      expect(paragraph.tag).toBe("p");
      expect(paragraph.label).toContain("<p> \"Contenedor Libre");
    });
  });
});





