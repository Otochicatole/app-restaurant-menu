/**
 * Pure domain logic for compiling landing page documents (visual modular blocks or raw code)
 * into standalone HTML, CSS, and JS artifacts.
 * Adheres to framework-free architecture rule.
 */

import {
  subElementStyleOverrideSchema,
  type LandingBlock,
  type LandingDocumentV1,
  type LandingFieldType,
  type LandingModuleField,
  type LandingTheme,
  type SubElementStyleOverride,
  type SubElementStylesMap,
} from "../contracts";
import {
  BUILTIN_LANDING_MODULES,
  createBlockFromBuiltinModule,
} from "./landing-module-catalog";

export type CompileLandingInput = {
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  title?: string;
};

const SYSTEM_VARIABLES = new Set(["restaurantName", "menuUrl"]);

const VOID_HTML_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

const DEFAULT_PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80";

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeInlineStyle(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

function sanitizeInlineScript(js: string): string {
  return js.replace(/<\/script/gi, "<\\/script");
}

export const LANDING_RUNTIME_NAVIGATION_SCRIPT = `(function() {
  if (window.__landingNavBound) return;
  window.__landingNavBound = true;
  document.addEventListener('click', function(e) {
    if (document.getElementById('__landing-blocks-root') && document.documentElement.getAttribute('data-preview-mode') !== 'true') {
      return;
    }
    var el = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement ? e.target.parentElement : null);
    var link = el && el.closest ? el.closest('a') : null;
    if (!link) return;
    var rawHref = (link.getAttribute('data-original-href') || link.getAttribute('href') || '').trim();
    if (!rawHref || rawHref === 'javascript:void(0)') return;

    if (rawHref.charAt(0) === '#') {
      e.preventDefault();
      e.stopPropagation();
      var cleanId = rawHref.replace(/^#+/, '').trim();
      if (!cleanId || cleanId === 'top') {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        return;
      }
      var targetEl =
        document.getElementById(cleanId) ||
        document.querySelector('[data-anchor-id="' + cleanId + '"]') ||
        document.querySelector('[data-landing-block="' + cleanId + '"]');
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (cleanId === 'inicio' || cleanId === 'hero') {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
      return;
    }

    if (document.getElementById('__landing-blocks-root')) {
      e.preventDefault();
      return;
    }

    var targetAttr = (link.getAttribute('target') || '').toLowerCase();
    if (targetAttr === '_blank') {
      return;
    }
    e.preventDefault();
    try {
      if (window.top && window.top !== window) {
        window.top.location.href = link.href;
      } else {
        window.location.href = link.href;
      }
    } catch (_err) {
      window.open(link.href, '_top');
    }
  }, true);
})();`;

export function compileLandingDocument({
  htmlContent,
  cssContent,
  jsContent,
  title = "Restaurante",
}: CompileLandingInput): string {
  const safeCss = sanitizeInlineStyle(cssContent);
  const safeJs = sanitizeInlineScript(jsContent);
  const navScriptTag = `<script id="landing-runtime-nav">\n${LANDING_RUNTIME_NAVIGATION_SCRIPT}\n</script>`;
  const hasHtmlTag = /<html[\s>]/i.test(htmlContent);

  if (hasHtmlTag) {
    let result = htmlContent;

    if (safeCss.trim()) {
      const styleTag = `<style id="custom-landing-css">\n${safeCss}\n</style>`;
      if (/<\/head>/i.test(result)) {
        result = result.replace(/<\/head>/i, `${styleTag}\n</head>`);
      } else {
        result = `${styleTag}\n${result}`;
      }
    }

    const scriptsToInject = [
      navScriptTag,
      ...(safeJs.trim()
        ? [`<script id="custom-landing-js">\n${safeJs}\n</script>`]
        : []),
    ].join("\n");

    if (/<\/body>/i.test(result)) {
      result = result.replace(/<\/body>/i, `${scriptsToInject}\n</body>`);
    } else {
      result = `${result}\n${scriptsToInject}`;
    }

    return result;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style id="custom-landing-css">
${safeCss}
  </style>
</head>
<body>
${htmlContent}
  ${navScriptTag}
  <script id="custom-landing-js">
${safeJs}
  </script>
</body>
</html>`;
}

export function buildThemeBaseCss(theme: LandingTheme): string {
  return `/* Variables Globales & Tema */
:root {
  --color-primary: ${theme.primaryColor};
  --color-primary-light: ${theme.primaryLightColor};
  --color-accent: ${theme.accentColor};
  --color-bg: ${theme.bgColor};
  --color-card-bg: ${theme.cardBgColor};
  --color-text-main: ${theme.textColor};
  --color-text-muted: ${theme.mutedTextColor};
  --color-border: ${theme.borderColor};
  --font-main: ${theme.fontBody};
  --font-serif: ${theme.fontHeading};
  --radius-sm: 8px;
  --radius-md: ${theme.radiusMd};
  --radius-lg: ${theme.radiusLg};
  --shadow-soft: 0 10px 30px -10px rgba(0, 0, 0, 0.08);
  --shadow-hover: 0 20px 40px -12px rgba(0, 0, 0, 0.16);
  --transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  font-size: 16px;
}

body {
  font-family: var(--font-main);
  background-color: var(--color-bg);
  color: var(--color-text-main);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.container {
  width: 90%;
  max-width: 1140px;
  margin: 0 auto;
}

h1, h2, h3 {
  font-family: var(--font-serif);
  color: var(--color-primary);
  line-height: 1.2;
}

.section {
  padding: 84px 0;
}

.section-header {
  text-align: center;
  max-width: 620px;
  margin: 0 auto 52px;
}

.section-kicker {
  display: block;
  color: var(--color-accent);
  font-size: 0.86rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 8px;
}

.section-title {
  font-size: 2.25rem;
  margin-bottom: 12px;
}

.section-description {
  color: var(--color-text-muted);
  font-size: 1.05rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: var(--radius-md);
  text-decoration: none;
  cursor: pointer;
  transition: var(--transition);
  border: 1px solid transparent;
}

.btn-primary {
  background-color: var(--color-primary);
  color: #ffffff;
}
.btn-primary:hover {
  background-color: var(--color-primary-light);
  transform: translateY(-2px);
}

.btn-secondary {
  background-color: var(--color-card-bg);
  color: var(--color-primary);
  border-color: var(--color-border);
}
.btn-secondary:hover {
  transform: translateY(-2px);
}

.btn-outline {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: transparent;
}
.btn-outline:hover {
  background-color: var(--color-primary);
  color: #ffffff;
}

.btn-lg {
  padding: 15px 32px;
  font-size: 1.04rem;
}

[data-landing-block],
section[id],
div[id] {
  scroll-margin-top: 76px;
}`;
}

export type BlockAnchorInfo = {
  blockId: string;
  blockName: string;
  moduleKey: string;
  anchorId: string;
  href: string;
};

const DEFAULT_MODULE_ANCHOR_MAP: Record<string, string> = {
  header: "inicio",
  hero: "hero",
  "specialties-grid": "destacados",
  specialties: "destacados",
  "experience-split": "experiencia",
  story: "experiencia",
  "contact-hours": "contacto",
  "gallery-grid": "galeria",
  "faq-accordion": "preguntas",
  testimonials: "resenas",
  "promo-banner": "promo",
  "stats-strip": "cifras",
  "image-spotlight": "destacado",
  "custom-card": "especial",
  footer: "pie",
};

export function sanitizeAnchorSlug(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveDocumentBlockAnchors(
  blocks: LandingBlock[],
): BlockAnchorInfo[] {
  const used = new Set<string>();
  return blocks
    .filter((b) => b.visible)
    .map((block) => {
      const customRaw = block.values.__anchorId
        ? sanitizeAnchorSlug(block.values.__anchorId)
        : "";
      const templateIdMatch =
        /<(?:section|div|article|header|footer)\b[^>]*\bid\s*=\s*["']([a-zA-Z0-9_-]+)["']/i.exec(
          block.htmlTemplate,
        );
      const templateId = templateIdMatch?.[1]
        ? sanitizeAnchorSlug(templateIdMatch[1])
        : "";
      const fallbackSlug =
        DEFAULT_MODULE_ANCHOR_MAP[block.moduleKey] ||
        sanitizeAnchorSlug(block.name) ||
        "seccion";

      const base = customRaw || templateId || fallbackSlug;
      let candidate = base;
      let counter = 2;
      while (used.has(candidate)) {
        candidate = `${base}-${counter}`;
        counter++;
      }
      used.add(candidate);

      return {
        blockId: block.id,
        blockName: block.name,
        moduleKey: block.moduleKey,
        anchorId: candidate,
        href: `#${candidate}`,
      };
    });
}

export function interpolateBlockHtml(
  block: LandingBlock,
  context: { restaurantName: string; restaurantSlug: string },
  options?: { interactiveEditor?: boolean },
): string {
  const safeRestaurantName = escapeHtml(
    context.restaurantName.trim() || "Nuestro Restaurante",
  );
  const menuUrl = `/m/${context.restaurantSlug}`;
  const isInteractive = Boolean(options?.interactiveEditor);

  const resolveTokens = (raw: string): string =>
    raw
      .replace(/\{\{\s*restaurantName\s*\}\}/g, safeRestaurantName)
      .replace(/\{\{\s*menuUrl\s*\}\}/g, menuUrl);

  const replaceToken = (key: string, insideTag: boolean): string => {
    if (key === "restaurantName") return safeRestaurantName;
    if (key === "menuUrl") return menuUrl;
    const rawVal =
      block.values[key] ??
      block.fields.find((f) => f.key === key)?.defaultValue ??
      "";
    const escaped = escapeHtml(resolveTokens(rawVal));
    if (isInteractive && !insideTag) {
      return `<l-field data-landing-field="${escapeHtml(key)}" contenteditable="true" spellcheck="false">${escaped}</l-field>`;
    }
    return escaped;
  };

  return block.htmlTemplate
    .split(/(<[^>]+>)/g)
    .map((segment) => {
      const insideTag = segment.startsWith("<") && segment.endsWith(">");
      let processedSegment = segment;

      if (isInteractive && insideTag && !segment.startsWith("</") && !segment.startsWith("<!--")) {
        const boundAttrs: string[] = [];
        const srcMatch = /\bsrc\s*=\s*["']\{\{\s*([a-zA-Z0-9_]+)\s*\}\}["']/i.exec(segment);
        const hrefMatch = /\bhref\s*=\s*["']\{\{\s*([a-zA-Z0-9_]+)\s*\}\}["']/i.exec(segment);
        const altMatch = /\balt\s*=\s*["']\{\{\s*([a-zA-Z0-9_]+)\s*\}\}["']/i.exec(segment);
        if (srcMatch?.[1]) boundAttrs.push(`data-bound-src="${escapeHtml(srcMatch[1])}"`);
        if (hrefMatch?.[1]) boundAttrs.push(`data-bound-href="${escapeHtml(hrefMatch[1])}"`);
        if (altMatch?.[1]) boundAttrs.push(`data-bound-alt="${escapeHtml(altMatch[1])}"`);

        if (boundAttrs.length > 0) {
          processedSegment = processedSegment.replace(
            /(\s*\/?)>$/,
            ` ${boundAttrs.join(" ")}$1>`,
          );
        }
      }

      return processedSegment.replace(
        /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
        (_match, key: string) => replaceToken(key, insideTag),
      );
    })
    .join("");
}

function buildBlockWrapperStyle(values: Record<string, string>): string {
  const styles: string[] = [];
  if (values.__bgColor?.trim()) {
    styles.push(`background-color: ${values.__bgColor.trim()} !important`);
  }
  if (values.__bgImage?.trim()) {
    const safeUrl = values.__bgImage.trim().replace(/"/g, "\\\"");
    styles.push(
      `background-image: url("${safeUrl}") !important; background-size: ${values.__bgSize?.trim() || "cover"} !important; background-position: ${values.__bgPosition?.trim() || "center"} !important; background-repeat: no-repeat !important`,
    );
  }
  if (values.__opacity?.trim()) {
    styles.push(`opacity: ${values.__opacity.trim()} !important`);
  }
  if (values.__textColor?.trim()) {
    styles.push(`color: ${values.__textColor.trim()} !important`);
  }

  // Padding in all 4 directions (supports individual sides with fallback to __paddingY and __paddingX)
  const padTop = values.__paddingTop?.trim() || values.__paddingY?.trim();
  const padBottom = values.__paddingBottom?.trim() || values.__paddingY?.trim();
  const padLeft = values.__paddingLeft?.trim() || values.__paddingX?.trim();
  const padRight = values.__paddingRight?.trim() || values.__paddingX?.trim();

  if (padTop) styles.push(`padding-top: ${padTop} !important`);
  if (padBottom) styles.push(`padding-bottom: ${padBottom} !important`);
  if (padLeft) styles.push(`padding-left: ${padLeft} !important`);
  if (padRight) styles.push(`padding-right: ${padRight} !important`);

  // Margin in all 4 directions
  if (values.__marginTop?.trim()) styles.push(`margin-top: ${values.__marginTop.trim()} !important`);
  if (values.__marginBottom?.trim()) styles.push(`margin-bottom: ${values.__marginBottom.trim()} !important`);
  if (values.__marginLeft?.trim()) styles.push(`margin-left: ${values.__marginLeft.trim()} !important`);
  if (values.__marginRight?.trim()) styles.push(`margin-right: ${values.__marginRight.trim()} !important`);

  if (values.__textAlign?.trim()) {
    styles.push(`text-align: ${values.__textAlign.trim()}`);
  }
  if (values.__borderWidth?.trim() && values.__borderWidth.trim() !== "0px") {
    styles.push(
      `border: ${values.__borderWidth.trim()} solid ${values.__borderColor?.trim() || "rgba(0,0,0,0.12)"}`,
    );
  }
  if (values.__borderRadius?.trim() && values.__borderRadius.trim() !== "0px") {
    styles.push(`border-radius: ${values.__borderRadius.trim()}; overflow: hidden`);
  }
  return styles.join("; ");
}

const SAFE_RELATIVE_SELECTOR_REGEX = /^[a-zA-Z0-9_\-\s>:().]+$/;

export function parseSubElementStyles(raw?: string): SubElementStylesMap {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: SubElementStylesMap = {};
    for (const [selector, val] of Object.entries(parsed)) {
      if (!SAFE_RELATIVE_SELECTOR_REGEX.test(selector)) continue;
      const check = subElementStyleOverrideSchema.safeParse(val);
      if (check.success) {
        result[selector] = check.data;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function serializeSubElementStyles(map: SubElementStylesMap): string {
  const cleaned: SubElementStylesMap = {};
  for (const [selector, override] of Object.entries(map)) {
    if (!SAFE_RELATIVE_SELECTOR_REGEX.test(selector)) continue;
    const nonEmptyEntries = Object.entries(override).filter(
      ([, v]) => typeof v === "string" && v.trim().length > 0,
    );
    if (nonEmptyEntries.length > 0) {
      cleaned[selector] = Object.fromEntries(nonEmptyEntries) as SubElementStyleOverride;
    }
  }
  return Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : "";
}

export function buildSubElementScopedCss(
  blockId: string,
  values: Record<string, string>,
): string {
  const map = parseSubElementStyles(values.__subStyles);
  const rules: string[] = [];
  const safeBlockId = blockId.replace(/"/g, "");

  for (const [selector, st] of Object.entries(map)) {
    if (!SAFE_RELATIVE_SELECTOR_REGEX.test(selector)) continue;
    const decls: string[] = [];

    if (st.fontSize?.trim()) decls.push(`font-size: ${st.fontSize.trim()} !important`);
    if (st.fontWeight?.trim()) decls.push(`font-weight: ${st.fontWeight.trim()} !important`);
    if (st.color?.trim()) decls.push(`color: ${st.color.trim()} !important`);
    if (st.textAlign?.trim()) decls.push(`text-align: ${st.textAlign.trim()} !important`);
    if (st.lineHeight?.trim()) decls.push(`line-height: ${st.lineHeight.trim()} !important`);
    if (st.letterSpacing?.trim()) decls.push(`letter-spacing: ${st.letterSpacing.trim()} !important`);

    if (st.backgroundColor?.trim()) {
      decls.push(`background-color: ${st.backgroundColor.trim()} !important`);
    }
    if (st.backgroundImage?.trim()) {
      const safeUrl = st.backgroundImage.trim().replace(/"/g, "\\\"");
      decls.push(`background-image: url("${safeUrl}") !important`);
      decls.push(`background-size: ${st.backgroundSize?.trim() || "cover"} !important`);
      decls.push(`background-position: ${st.backgroundPosition?.trim() || "center"} !important`);
      decls.push(`background-repeat: no-repeat !important`);
    }
    if (st.opacity?.trim()) decls.push(`opacity: ${st.opacity.trim()} !important`);

    if (st.paddingTop?.trim()) decls.push(`padding-top: ${st.paddingTop.trim()} !important`);
    if (st.paddingBottom?.trim()) decls.push(`padding-bottom: ${st.paddingBottom.trim()} !important`);
    if (st.paddingLeft?.trim()) decls.push(`padding-left: ${st.paddingLeft.trim()} !important`);
    if (st.paddingRight?.trim()) decls.push(`padding-right: ${st.paddingRight.trim()} !important`);
    if (st.marginTop?.trim()) decls.push(`margin-top: ${st.marginTop.trim()} !important`);
    if (st.marginBottom?.trim()) decls.push(`margin-bottom: ${st.marginBottom.trim()} !important`);
    if (st.marginLeft?.trim()) decls.push(`margin-left: ${st.marginLeft.trim()} !important`);
    if (st.marginRight?.trim()) decls.push(`margin-right: ${st.marginRight.trim()} !important`);

    if (st.width?.trim()) decls.push(`width: ${st.width.trim()} !important`);
    if (st.maxWidth?.trim()) decls.push(`max-width: ${st.maxWidth.trim()} !important`);
    if (st.minHeight?.trim()) decls.push(`min-height: ${st.minHeight.trim()} !important`);
    if (st.height?.trim()) decls.push(`height: ${st.height.trim()} !important`);
    if (st.gap?.trim()) decls.push(`gap: ${st.gap.trim()} !important`);

    if (st.borderWidth?.trim()) {
      if (st.borderWidth.trim() === "0px") {
        decls.push(`border-width: 0px !important`);
      } else {
        decls.push(`border-width: ${st.borderWidth.trim()} !important`);
        decls.push(`border-style: solid !important`);
        decls.push(`border-color: ${st.borderColor?.trim() || "currentColor"} !important`);
      }
    } else if (st.borderColor?.trim()) {
      decls.push(`border-color: ${st.borderColor.trim()} !important`);
    }

    if (st.borderRadius?.trim()) decls.push(`border-radius: ${st.borderRadius.trim()} !important`);
    if (st.boxShadow?.trim()) decls.push(`box-shadow: ${st.boxShadow.trim()} !important`);
    if (st.objectFit?.trim()) decls.push(`object-fit: ${st.objectFit.trim()} !important`);

    if (decls.length > 0) {
      rules.push(
        `[data-landing-block="${safeBlockId}"] > ${selector} {\n  ${decls.join(";\n  ")};\n}`,
      );
    }
  }

  return rules.join("\n");
}

function buildInteractiveEditorAssets(
  selectedBlockId?: string | null,
): { css: string; js: string } {
  const css = `
/* Editor Visual Interactivo (Framely / OpenPage Bridge) */
html {
  scroll-behavior: auto !important;
}
l-field {
  display: inline;
}
[data-landing-block] {
  position: relative;
  transition: outline 0.14s ease, box-shadow 0.14s ease;
  cursor: pointer;
}
html:not([data-preview-mode="true"]) [data-landing-block]:hover {
  outline: 1.5px dashed rgba(59, 130, 246, 0.75);
  outline-offset: -1.5px;
}
html:not([data-preview-mode="true"]) [data-landing-block][data-selected="true"] {
  outline: 2px solid #2563eb !important;
  outline-offset: -2px !important;
  z-index: 20;
}
[data-landing-block]::before {
  content: attr(data-block-label);
  position: absolute;
  top: 8px;
  left: 10px;
  z-index: 50;
  padding: 3px 8px;
  border-radius: 5px;
  background: #2563eb;
  color: #ffffff;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity 0.12s ease, transform 0.12s ease;
  box-shadow: 0 4px 12px rgba(37,99,235,0.25);
  border: 1px solid #1d4ed8;
}
html:not([data-preview-mode="true"]) [data-landing-block]:hover::before,
html:not([data-preview-mode="true"]) [data-landing-block][data-selected="true"]::before {
  opacity: 1;
  transform: translateY(0);
}
html:not([data-preview-mode="true"]) [data-sub-hover="true"]:not([data-sub-selected="true"]) {
  outline: 1.5px dashed rgba(124, 58, 237, 0.75) !important;
  outline-offset: 2px !important;
}
html:not([data-preview-mode="true"]) [data-sub-selected="true"] {
  outline: 2px solid #7c3aed !important;
  outline-offset: 2px !important;
}
[data-landing-field] {
  outline: 1px dashed transparent;
  border-radius: 4px;
  transition: outline-color 0.12s ease, background-color 0.12s ease;
  cursor: text;
}
html:not([data-preview-mode="true"]) [data-landing-field]:hover {
  outline-color: rgba(59, 130, 246, 0.65);
}
html:not([data-preview-mode="true"]) [data-landing-field]:focus {
  outline: 2px solid #3b82f6 !important;
  outline-offset: 2px;
  background-color: rgba(59, 130, 246, 0.08);
}
html[data-preview-mode="true"] [data-landing-block] {
  cursor: default !important;
}
html[data-preview-mode="true"] [data-landing-field] {
  cursor: inherit !important;
}
html[data-preview-mode="true"] #__landing-editor-toolbar {
  display: none !important;
}
html:not([data-preview-mode="true"]) .landing-drag-target {
  outline: 2px dashed #2563eb !important;
  outline-offset: 4px !important;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12) !important;
  position: relative !important;
}
a[data-original-href] {
  -webkit-user-drag: none;
  user-select: text;
}
#__landing-editor-toolbar {
  position: fixed;
  z-index: 9999;
  display: none;
  align-items: center;
  gap: 3px;
  padding: 4px 6px;
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 9px;
  box-shadow: 0 10px 25px -3px rgba(0,0,0,0.12), 0 4px 6px -4px rgba(0,0,0,0.06);
  font-family: 'Inter', system-ui, sans-serif;
}
#__landing-editor-toolbar .__toolbar-label {
  color: #2563eb;
  background: #eff6ff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 5px;
  border: 1px solid #bfdbfe;
  margin-right: 3px;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#__landing-editor-toolbar[data-mode="sub"] .__toolbar-label {
  color: #6d28d9;
  background: #f5f3ff;
  border-color: #ddd6fe;
}
#__landing-editor-toolbar button {
  background: transparent;
  border: none;
  color: #374151;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 7px;
  border-radius: 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: background-color 0.1s ease, color 0.1s ease;
}
#__landing-editor-toolbar button:hover {
  background: #f4f4f5;
  color: #111827;
}
#__landing-editor-toolbar button[data-danger="true"]:hover {
  background: #fee2e2;
  color: #dc2626;
}
`;

  const initialSelected = selectedBlockId ? JSON.stringify(selectedBlockId) : "null";

  const js = `
(function() {
  var currentSelectedId = ${initialSelected};
  var currentSubSelector = null;
  var currentHoverEl = null;

  var toolbar = document.createElement('div');
  toolbar.id = '__landing-editor-toolbar';
  document.body.appendChild(toolbar);

  function closestEl(target, selector) {
    var el = target && target.nodeType === 1 ? target : (target && target.parentElement ? target.parentElement : null);
    return el && el.closest ? el.closest(selector) : null;
  }

  function isRepeatableItem(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = el.tagName.toLowerCase();
    var cls = el.className && typeof el.className === 'string' ? el.className : '';
    return (
      tag === 'article' ||
      tag === 'figure' ||
      tag === 'details' ||
      tag === 'li' ||
      /\\b(card|info-card|stat-card|gallery-item|faq-item|feature-item|spotlight-card|review-card|btn|nav-link)\\b/.test(cls)
    );
  }

  function describeElement(el) {
    if (!el || el.nodeType !== 1) return 'Elemento';
    var tag = el.tagName.toLowerCase();
    var cls = el.className && typeof el.className === 'string' ? el.className : '';
    if (tag === 'img') return 'Imagen';
    if (tag === 'a' && /\\bbtn\\b/.test(cls)) return 'Botón';
    if (tag === 'button') return 'Botón';
    if (tag === 'a') return 'Enlace';
    if (/^h[1-6]$/.test(tag)) return 'Título (' + tag.toUpperCase() + ')';
    if (tag === 'p') return 'Párrafo';
    if (/\\bgrid-columns-2\\b/.test(cls)) return 'Grilla (2 Col)';
    if (/\\bgrid-columns-3\\b/.test(cls)) return 'Grilla (3 Col)';
    if (/\\bflex-row\\b/.test(cls)) return 'Fila Flexible';
    if (/\\bcontent-container\\b/.test(cls)) return 'Contenedor';
    if (/\\bgrid-column\\b/.test(cls) || (el.parentElement && /\\b(grid-columns-2|grid-columns-3)\\b/.test(el.parentElement.className || ''))) {
      var colIdx = Array.prototype.indexOf.call(el.parentElement ? el.parentElement.children : [], el) + 1;
      return 'Columna ' + (colIdx || 1);
    }
    if (tag === 'article' || /\\b(card|info-card|stat-card|spotlight-card|review-card)\\b/.test(cls)) return 'Tarjeta';
    if (tag === 'figure' || /\\bgallery-item\\b/.test(cls)) return 'Foto de Galería';
    if (tag === 'details' || /\\bfaq-item\\b/.test(cls)) return 'Pregunta FAQ';
    if (tag === 'summary') return 'Pregunta';
    if (/\\bfeature-item\\b/.test(cls)) return 'Ítem de Lista';
    if (/\\b(hero-badge|card-badge|promo-tag|spotlight-badge|section-kicker|section-tag)\\b/.test(cls)) return 'Insignia';
    if (/\\b(cards-grid|info-grid|gallery-mosaic|stats-strip-grid)\\b/.test(cls)) return 'Grilla';
    if (/\\b(hero-actions|section-cta-wrap|footer-links)\\b/.test(cls)) return 'Grupo de Botones';
    if (tag === 'hr') return 'Separador';
    return 'Elemento (' + tag + ')';
  }

  function computeRelativeSelector(blockEl, targetEl) {
    if (!blockEl || !targetEl || targetEl === blockEl || !blockEl.contains(targetEl)) return null;
    var parts = [];
    var cur = targetEl;
    while (cur && cur !== blockEl && cur.parentElement) {
      if (cur.tagName.toLowerCase() === 'l-field' || cur.hasAttribute('data-landing-field')) {
        cur = cur.parentElement;
        continue;
      }
      var tag = cur.tagName.toLowerCase();
      var parent = cur.parentElement;
      var nth = 1;
      for (var i = 0; i < parent.children.length; i++) {
        var sib = parent.children[i];
        if (sib === cur) break;
        if (sib.tagName.toLowerCase() === tag && !sib.hasAttribute('data-landing-field') && sib.tagName.toLowerCase() !== 'l-field') {
          nth++;
        }
      }
      parts.unshift(tag + ':nth-of-type(' + nth + ')');
      cur = parent;
    }
    return parts.length ? parts.join(' > ') : null;
  }

  function findSubElementBySelector(blockEl, selector) {
    if (!blockEl || !selector) return null;
    try {
      return blockEl.querySelector(':scope > ' + selector);
    } catch (err) {
      return null;
    }
  }

  function isEditableContainer(el) {
    if (!el || el.nodeType !== 1) return false;
    var cls = el.className && typeof el.className === 'string' ? el.className : '';
    if (/\\b(content-container|content-box|grid-columns-2|grid-columns-3|grid-column|flex-row)\\b/.test(cls)) {
      return true;
    }
    if (el.parentElement) {
      var pCls = el.parentElement.className && typeof el.parentElement.className === 'string' ? el.parentElement.className : '';
      if (/\\b(grid-columns-2|grid-columns-3|flex-row)\\b/.test(pCls)) {
        return true;
      }
    }
    return false;
  }

  function isLayoutWrapper(el, blockEl) {
    if (!el || el === blockEl) return true;
    var tag = el.tagName.toLowerCase();
    if (tag === 'section' || tag === 'header' || tag === 'footer' || tag === 'main') return true;
    if (isEditableContainer(el)) return false;
    if (el.parentElement === blockEl) return true;
    var cls = el.className && typeof el.className === 'string' ? el.className.toLowerCase() : '';
    if (/^container$|\\b(nav-container|hero-content|hero-inner|section-header|wrapper|content-wrapper)\\b/.test(cls)) {
      return true;
    }
    return false;
  }

  function resolveSelectableSubElement(target, blockEl) {
    if (!target || !blockEl || target === blockEl) return null;
    var el = target.nodeType === 1 ? target : target.parentElement;
    if (!el || !blockEl.contains(el) || el === blockEl) return null;

    var fieldWrapper = closestEl(el, '[data-landing-field]');
    if (fieldWrapper && fieldWrapper.parentElement && blockEl.contains(fieldWrapper.parentElement)) {
      return fieldWrapper.parentElement;
    }

    var interactiveParent = closestEl(el, 'a, button');
    if (interactiveParent && blockEl.contains(interactiveParent)) {
      return interactiveParent;
    }

    var contentEl = closestEl(el, 'img, h1, h2, h3, h4, h5, h6, p, summary, li, time');
    if (contentEl && blockEl.contains(contentEl)) {
      return contentEl;
    }

    var cardEl = closestEl(el, 'article, figure, details, .card, .info-card, .stat-card, .gallery-item, .faq-item, .feature-item, .spotlight-card, .review-card, .hero-badge, .card-badge, .promo-tag, .section-kicker');
    if (cardEl && blockEl.contains(cardEl) && cardEl !== blockEl) {
      return cardEl;
    }

    if (isEditableContainer(el)) {
      return el;
    }

    var editableAncestor = closestEl(el, '.content-container, .grid-columns-2, .grid-columns-3, .grid-column, .flex-row');
    if (editableAncestor && blockEl.contains(editableAncestor) && editableAncestor !== blockEl) {
      return editableAncestor;
    }

    if (isLayoutWrapper(el, blockEl)) {
      return null;
    }

    var tag = el.tagName.toLowerCase();
    if (tag === 'span' || tag === 'strong' || tag === 'em' || tag === 'small' || tag === 'b' || tag === 'i' || tag === 'hr') {
      return el;
    }

    if (el.children && el.children.length > 1) {
      return null;
    }

    return el;
  }

  function buildSubElementPayload(blockEl, subEl) {
    if (!blockEl || !subEl) return null;
    var selector = computeRelativeSelector(blockEl, subEl);
    if (!selector) return null;
    var tag = subEl.tagName.toLowerCase();
    var boundFieldEl = subEl.hasAttribute('data-landing-field')
      ? subEl
      : subEl.querySelector('[data-landing-field]');
    var boundTextField = boundFieldEl ? boundFieldEl.getAttribute('data-landing-field') : null;
    var boundSrcField = subEl.getAttribute('data-bound-src') || null;
    var boundHrefField = subEl.getAttribute('data-bound-href') || null;
    var boundAltField = subEl.getAttribute('data-bound-alt') || null;

    var childFieldKeys = [];
    if (boundTextField) childFieldKeys.push(boundTextField);
    var innerFields = subEl.querySelectorAll('[data-landing-field]');
    innerFields.forEach(function(f) {
      var k = f.getAttribute('data-landing-field');
      if (k && childFieldKeys.indexOf(k) === -1) childFieldKeys.push(k);
    });

    var ancestors = [];
    var cur = subEl.parentElement;
    while (cur && cur !== blockEl && cur.parentElement && cur.parentElement !== blockEl) {
      var ancCls = cur.className && typeof cur.className === 'string' ? cur.className : '';
      var isRootContainer = /\\bcontainer\\b/.test(ancCls) && cur.parentElement && cur.parentElement.parentElement === blockEl;
      if (!isRootContainer && !cur.hasAttribute('data-landing-field') && cur.tagName.toLowerCase() !== 'l-field') {
        var ancSelector = computeRelativeSelector(blockEl, cur);
        if (ancSelector) {
          ancestors.unshift({
            selector: ancSelector,
            label: describeElement(cur),
            tagName: cur.tagName.toLowerCase(),
            isRepeatable: isRepeatableItem(cur)
          });
        }
      }
      cur = cur.parentElement;
    }

    var cs = window.getComputedStyle(subEl);
    return {
      selector: selector,
      tagName: tag,
      label: describeElement(subEl),
      isImage: tag === 'img',
      isLink: tag === 'a' || tag === 'button',
      isRepeatable: isRepeatableItem(subEl),
      boundTextField: boundTextField,
      boundSrcField: boundSrcField,
      boundHrefField: boundHrefField,
      boundAltField: boundAltField,
      childFieldKeys: childFieldKeys,
      currentSrc: tag === 'img' ? (subEl.getAttribute('src') || '') : '',
      currentAlt: tag === 'img' ? (subEl.getAttribute('alt') || '') : '',
      currentHref: subEl.getAttribute('data-original-href') || subEl.getAttribute('href') || '',
      ancestors: ancestors,
      computedStyles: {
        fontSize: cs.fontSize || '',
        fontWeight: cs.fontWeight || '',
        color: cs.color || '',
        backgroundColor: cs.backgroundColor || '',
        borderRadius: cs.borderRadius || '',
        paddingTop: cs.paddingTop || '',
        paddingBottom: cs.paddingBottom || '',
        paddingLeft: cs.paddingLeft || '',
        paddingRight: cs.paddingRight || '',
        marginTop: cs.marginTop || '',
        marginBottom: cs.marginBottom || '',
        marginLeft: cs.marginLeft || '',
        marginRight: cs.marginRight || '',
        textAlign: cs.textAlign || ''
      }
    };
  }

  function renderToolbarContent(blockEl, subEl) {
    if (subEl) {
      toolbar.setAttribute('data-mode', 'sub');
      var label = describeElement(subEl);
      var isImg = subEl.tagName.toLowerCase() === 'img';
      toolbar.innerHTML = [
        '<span class="__toolbar-label" id="__toolbar-block-name">' + label + '</span>',
        '<button type="button" data-sub-action="select-parent" title="Subir al elemento contenedor o bloque">↖ Padre</button>',
        '<button type="button" data-sub-action="move-prev" title="Mover antes">←</button>',
        '<button type="button" data-sub-action="move-next" title="Mover después">→</button>',
        '<button type="button" data-sub-action="duplicate" title="Duplicar este elemento">⧉ Duplicar</button>',
        isImg ? '<button type="button" data-sub-action="pick-image" title="Cambiar imagen">🖼 Imagen</button>' : '',
        '<button type="button" data-sub-action="delete" data-danger="true" title="Eliminar este elemento">🗑</button>'
      ].join('');
    } else {
      toolbar.setAttribute('data-mode', 'block');
      var blockLabel = (blockEl && blockEl.getAttribute('data-block-label')) || 'Bloque';
      toolbar.innerHTML = [
        '<span class="__toolbar-label" id="__toolbar-block-name">' + blockLabel + '</span>',
        '<button type="button" data-action="move-up" title="Subir bloque">↑</button>',
        '<button type="button" data-action="move-down" title="Bajar bloque">↓</button>',
        '<button type="button" data-action="duplicate" title="Duplicar bloque">⧉ Duplicar</button>',
        '<button type="button" data-action="code" title="Editar HTML/CSS/JS">&lt;/&gt; Código</button>',
        '<button type="button" data-action="delete" data-danger="true" title="Eliminar bloque">🗑</button>'
      ].join('');
    }
  }

  function neutralizeLinks() {
    var isPreview = document.documentElement.getAttribute('data-preview-mode') === 'true';
    var links = document.querySelectorAll('[data-landing-block] a');
    links.forEach(function(a) {
      if (a.hasAttribute('target')) {
        a.setAttribute('data-original-target', a.getAttribute('target') || '');
        a.removeAttribute('target');
      }
      var currentHref = a.getAttribute('href');
      if (currentHref && currentHref !== 'javascript:void(0)') {
        a.setAttribute('data-original-href', currentHref);
        a.setAttribute('href', 'javascript:void(0)');
      }
    });
    var fields = document.querySelectorAll('[data-landing-field]');
    fields.forEach(function(f) {
      f.setAttribute('contenteditable', isPreview ? 'false' : 'true');
    });
  }

  function runDynamicHelpers() {
    document.querySelectorAll('.js-current-year').forEach(function(el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  function positionToolbar(blockEl, subEl) {
    var anchorEl = subEl || blockEl;
    if (!anchorEl || document.documentElement.getAttribute('data-preview-mode') === 'true') {
      toolbar.style.display = 'none';
      return;
    }
    var rect = anchorEl.getBoundingClientRect();
    if (rect.bottom < 28 || rect.top > window.innerHeight - 20) {
      toolbar.style.display = 'none';
      return;
    }
    renderToolbarContent(blockEl, subEl);
    toolbar.style.display = 'flex';
    var topPos;
    if (rect.top >= 42) {
      topPos = rect.top - 36;
    } else if (rect.height < 140 && rect.bottom + 38 < window.innerHeight) {
      topPos = rect.bottom + 6;
    } else {
      topPos = Math.max(8, rect.top + 8);
    }
    var rightPos = Math.max(12, window.innerWidth - rect.right + 6);
    if (rightPos > window.innerWidth - 260) {
      rightPos = Math.max(12, window.innerWidth - rect.left - 240);
    }
    toolbar.style.top = topPos + 'px';
    toolbar.style.right = rightPos + 'px';
  }

  function applySelection(blockId, subSelector) {
    currentSelectedId = blockId;
    currentSubSelector = subSelector || null;
    document.querySelectorAll('[data-sub-selected]').forEach(function(el) {
      el.removeAttribute('data-sub-selected');
    });
    var blocks = document.querySelectorAll('[data-landing-block]');
    var activeBlockEl = null;
    blocks.forEach(function(b) {
      if (b.getAttribute('data-landing-block') === blockId) {
        b.setAttribute('data-selected', 'true');
        activeBlockEl = b;
      } else {
        b.removeAttribute('data-selected');
      }
    });
    var activeSubEl = null;
    if (activeBlockEl && currentSubSelector) {
      activeSubEl = findSubElementBySelector(activeBlockEl, currentSubSelector);
      if (activeSubEl) {
        activeSubEl.setAttribute('data-sub-selected', 'true');
      } else {
        currentSubSelector = null;
      }
    }
    positionToolbar(activeBlockEl, activeSubEl);
    return { activeBlockEl: activeBlockEl, activeSubEl: activeSubEl };
  }

  neutralizeLinks();
  runDynamicHelpers();
  applySelection(currentSelectedId, null);

  window.addEventListener('scroll', function() {
    window.parent.postMessage({
      type: 'LANDING_SCROLL_SYNC',
      scrollY: window.scrollY || document.documentElement.scrollTop || 0
    }, '*');
    if (!currentSelectedId) return;
    var blockEl = document.querySelector('[data-landing-block="' + currentSelectedId + '"]');
    var subEl = blockEl && currentSubSelector ? findSubElementBySelector(blockEl, currentSubSelector) : null;
    positionToolbar(blockEl, subEl);
  }, { passive: true });

  window.addEventListener('resize', function() {
    if (!currentSelectedId) return;
    var blockEl = document.querySelector('[data-landing-block="' + currentSelectedId + '"]');
    var subEl = blockEl && currentSubSelector ? findSubElementBySelector(blockEl, currentSubSelector) : null;
    positionToolbar(blockEl, subEl);
  });

  document.addEventListener('mouseover', function(e) {
    if (document.documentElement.getAttribute('data-preview-mode') === 'true') return;
    if (closestEl(e.target, '#__landing-editor-toolbar')) return;
    var blockEl = closestEl(e.target, '[data-landing-block]');
    var subEl = blockEl ? resolveSelectableSubElement(e.target, blockEl) : null;
    if (currentHoverEl && currentHoverEl !== subEl) {
      currentHoverEl.removeAttribute('data-sub-hover');
      currentHoverEl = null;
    }
    if (subEl) {
      subEl.setAttribute('data-sub-hover', 'true');
      currentHoverEl = subEl;
    }
  }, true);

  document.addEventListener('mouseout', function(e) {
    if (currentHoverEl && e.target === currentHoverEl) {
      currentHoverEl.removeAttribute('data-sub-hover');
      currentHoverEl = null;
    }
  }, true);

  toolbar.addEventListener('mousedown', function(e) {
    e.stopPropagation();
  });

  toolbar.addEventListener('click', function(e) {
    var subBtn = closestEl(e.target, 'button[data-sub-action]');
    if (subBtn && currentSelectedId && currentSubSelector) {
      e.stopPropagation();
      e.preventDefault();
      var subAction = subBtn.getAttribute('data-sub-action');
      if (subAction === 'select-parent') {
        var blockEl = document.querySelector('[data-landing-block="' + currentSelectedId + '"]');
        var subEl = blockEl ? findSubElementBySelector(blockEl, currentSubSelector) : null;
        var parentSub = subEl && subEl.parentElement ? resolveSelectableSubElement(subEl.parentElement, blockEl) : null;
        if (parentSub && blockEl) {
          var parentPayload = buildSubElementPayload(blockEl, parentSub);
          applySelection(currentSelectedId, parentPayload ? parentPayload.selector : null);
          window.parent.postMessage({
            type: 'LANDING_SELECT_SUBELEMENT',
            blockId: currentSelectedId,
            subElement: parentPayload
          }, '*');
        } else {
          applySelection(currentSelectedId, null);
          window.parent.postMessage({ type: 'LANDING_SELECT_BLOCK', blockId: currentSelectedId }, '*');
        }
        return;
      }
      window.parent.postMessage({
        type: 'LANDING_SUBELEMENT_ACTION',
        blockId: currentSelectedId,
        selector: currentSubSelector,
        action: subAction
      }, '*');
      return;
    }

    var btn = closestEl(e.target, 'button[data-action]');
    if (!btn || !currentSelectedId) return;
    e.stopPropagation();
    e.preventDefault();
    var action = btn.getAttribute('data-action');
    window.parent.postMessage({
      type: 'LANDING_BLOCK_ACTION',
      blockId: currentSelectedId,
      action: action
    }, '*');
  });

  document.addEventListener('dragstart', function(e) {
    if (closestEl(e.target, 'a, img')) {
      e.preventDefault();
    }
  }, true);

  var currentDragTargetEl = null;

  document.addEventListener('dragenter', function(e) {
    if (document.documentElement.getAttribute('data-preview-mode') === 'true') return;
    e.preventDefault();
  }, false);

  document.addEventListener('dragover', function(e) {
    if (document.documentElement.getAttribute('data-preview-mode') === 'true') return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    var blockEl = closestEl(e.target, '[data-landing-block]');
    var subEl = blockEl ? resolveSelectableSubElement(e.target, blockEl) : null;
    var targetEl = subEl || blockEl;
    if (targetEl !== currentDragTargetEl) {
      if (currentDragTargetEl) currentDragTargetEl.classList.remove('landing-drag-target');
      currentDragTargetEl = targetEl;
      if (currentDragTargetEl) currentDragTargetEl.classList.add('landing-drag-target');
    }
  }, false);

  document.addEventListener('dragleave', function(e) {
    if (!e.relatedTarget && currentDragTargetEl) {
      currentDragTargetEl.classList.remove('landing-drag-target');
      currentDragTargetEl = null;
    }
  }, false);

  document.addEventListener('drop', function(e) {
    if (document.documentElement.getAttribute('data-preview-mode') === 'true') return;
    e.preventDefault();
    if (currentDragTargetEl) {
      currentDragTargetEl.classList.remove('landing-drag-target');
      currentDragTargetEl = null;
    }
    var blockEl = closestEl(e.target, '[data-landing-block]');
    var blockId = blockEl ? blockEl.getAttribute('data-landing-block') : null;
    var subEl = blockEl ? resolveSelectableSubElement(e.target, blockEl) : null;
    var subSelector = (blockEl && subEl) ? computeRelativeSelector(blockEl, subEl) : null;

    var componentKind = '';
    var builtinKey = '';
    var customId = '';
    try {
      if (e.dataTransfer) {
        componentKind = e.dataTransfer.getData('application/x-landing-component') || '';
        builtinKey = e.dataTransfer.getData('application/x-landing-builtin') || '';
        customId = e.dataTransfer.getData('application/x-landing-custom') || '';
        var plainText = e.dataTransfer.getData('text/plain') || '';
        if (!componentKind && plainText.indexOf('landing-component:') === 0) {
          componentKind = plainText.substring('landing-component:'.length);
        }
        if (!builtinKey && plainText.indexOf('landing-builtin:') === 0) {
          builtinKey = plainText.substring('landing-builtin:'.length);
        }
        if (!customId && plainText.indexOf('landing-custom:') === 0) {
          customId = plainText.substring('landing-custom:'.length);
        }
      }
    } catch (_) {}

    try {
      if (!componentKind && window.parent && window.parent.__draggedComponentKind) {
        componentKind = window.parent.__draggedComponentKind;
      }
      if (!builtinKey && window.parent && window.parent.__draggedBuiltinKey) {
        builtinKey = window.parent.__draggedBuiltinKey;
      }
      if (!customId && window.parent && window.parent.__draggedCustomId) {
        customId = window.parent.__draggedCustomId;
      }
    } catch (_) {}

    try {
      window.parent.postMessage({
        type: 'LANDING_CANVAS_DROP',
        blockId: blockId,
        subSelector: subSelector,
        componentKind: componentKind,
        builtinKey: builtinKey,
        customId: customId
      }, '*');
    } catch (_) {}
  }, false);

  function scrollToAnchorTarget(rawHash) {
    if (!rawHash || typeof rawHash !== 'string') return false;
    var cleanId = rawHash.replace(/^#+/, '').trim();
    if (!cleanId) return false;
    var targetEl =
      document.getElementById(cleanId) ||
      document.querySelector('[data-anchor-id="' + cleanId + '"]') ||
      document.querySelector('[data-landing-block="' + cleanId + '"]');
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return true;
    }
    return false;
  }

  document.addEventListener('click', function(e) {
    if (closestEl(e.target, '#__landing-editor-toolbar')) return;
    var link = closestEl(e.target, 'a');
    var isPreview = document.documentElement.getAttribute('data-preview-mode') === 'true';
    if (link) {
      e.preventDefault();
      if (isPreview) {
        var origHref = link.getAttribute('data-original-href') || link.getAttribute('href') || '';
        if (origHref.indexOf('#') === 0 && origHref.length > 1) {
          scrollToAnchorTarget(origHref);
        }
        return;
      }
    }
    if (isPreview) return;
    var blockEl = closestEl(e.target, '[data-landing-block]');
    if (!blockEl) return;
    var id = blockEl.getAttribute('data-landing-block');
    var subEl = resolveSelectableSubElement(e.target, blockEl);
    if (subEl) {
      var payload = buildSubElementPayload(blockEl, subEl);
      if (payload) {
        applySelection(id, payload.selector);
        window.parent.postMessage({
          type: 'LANDING_SELECT_SUBELEMENT',
          blockId: id,
          subElement: payload
        }, '*');
        return;
      }
    }
    applySelection(id, null);
    window.parent.postMessage({ type: 'LANDING_SELECT_BLOCK', blockId: id }, '*');
  }, true);

  document.addEventListener('dblclick', function(e) {
    if (document.documentElement.getAttribute('data-preview-mode') === 'true') return;
    var imgEl = closestEl(e.target, 'img');
    var blockEl = imgEl ? closestEl(imgEl, '[data-landing-block]') : null;
    if (imgEl && blockEl) {
      e.preventDefault();
      e.stopPropagation();
      var id = blockEl.getAttribute('data-landing-block');
      var payload = buildSubElementPayload(blockEl, imgEl);
      if (payload) {
        applySelection(id, payload.selector);
        window.parent.postMessage({
          type: 'LANDING_SUBELEMENT_ACTION',
          blockId: id,
          selector: payload.selector,
          action: 'pick-image'
        }, '*');
      }
    }
  }, true);

  document.addEventListener('focusin', function(e) {
    if (document.documentElement.getAttribute('data-preview-mode') === 'true') return;
    var fieldEl = closestEl(e.target, '[data-landing-field]');
    if (!fieldEl) return;
    var blockEl = closestEl(fieldEl, '[data-landing-block]');
    if (!blockEl) return;
    var id = blockEl.getAttribute('data-landing-block');
    if (id && id !== currentSelectedId) {
      applySelection(id, currentSubSelector);
    }
  });

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 's') {
      e.preventDefault();
      window.parent.postMessage({ type: 'LANDING_SHORTCUT', action: 'save' }, '*');
      return;
    }
    var fieldEl = closestEl(e.target, '[data-landing-field]');
    if (!fieldEl) {
      if (e.key === 'Escape' && currentSubSelector) {
        e.preventDefault();
        applySelection(currentSelectedId, null);
        window.parent.postMessage({ type: 'LANDING_SELECT_BLOCK', blockId: currentSelectedId }, '*');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        window.parent.postMessage({
          type: 'LANDING_SHORTCUT',
          action: e.shiftKey ? 'redo' : 'undo'
        }, '*');
      } else if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        window.parent.postMessage({ type: 'LANDING_SHORTCUT', action: 'redo' }, '*');
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      fieldEl.blur();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      fieldEl.blur();
    }
  });

  document.addEventListener('paste', function(e) {
    var fieldEl = closestEl(e.target, '[data-landing-field]');
    if (!fieldEl) return;
    e.preventDefault();
    var text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
    if (document.queryCommandSupported && document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
    } else {
      var sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;
      sel.deleteFromDocument();
      sel.getRangeAt(0).insertNode(document.createTextNode(text));
      sel.collapseToEnd();
    }
  });

  document.addEventListener('input', function(e) {
    var fieldEl = closestEl(e.target, '[data-landing-field]');
    if (!fieldEl) return;
    var blockEl = closestEl(fieldEl, '[data-landing-block]');
    if (!blockEl) return;
    var blockId = blockEl.getAttribute('data-landing-block');
    var fieldKey = fieldEl.getAttribute('data-landing-field');
    var textValue = fieldEl.innerText || '';
    blockEl.querySelectorAll('[data-landing-field="' + fieldKey + '"]').forEach(function(other) {
      if (other !== fieldEl) {
        other.textContent = textValue;
      }
    });
    window.parent.postMessage({
      type: 'LANDING_INLINE_FIELD_CHANGE',
      blockId: blockId,
      fieldKey: fieldKey,
      value: textValue
    }, '*');
  });

  document.addEventListener('focusout', function(e) {
    var fieldEl = closestEl(e.target, '[data-landing-field]');
    if (!fieldEl) return;
    var blockEl = closestEl(fieldEl, '[data-landing-block]');
    if (!blockEl) return;
    var blockId = blockEl.getAttribute('data-landing-block');
    var fieldKey = fieldEl.getAttribute('data-landing-field');
    var textValue = fieldEl.innerText || '';
    window.parent.postMessage({
      type: 'LANDING_INLINE_FIELD_COMMIT',
      blockId: blockId,
      fieldKey: fieldKey,
      value: textValue
    }, '*');
  });

  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'LANDING_HOVER_SUBELEMENT') {
      if (currentHoverEl) {
        currentHoverEl.removeAttribute('data-sub-hover');
        currentHoverEl = null;
      }
      if (e.data.blockId && e.data.subSelector) {
        var bEl = document.querySelector('[data-landing-block="' + e.data.blockId + '"]');
        var targetSub = bEl ? findSubElementBySelector(bEl, e.data.subSelector) : null;
        if (targetSub) {
          targetSub.setAttribute('data-sub-hover', 'true');
          currentHoverEl = targetSub;
        }
      }
      return;
    }
    if (e.data.type === 'LANDING_SCROLL_TO_ANCHOR' && typeof e.data.anchor === 'string') {
      scrollToAnchorTarget(e.data.anchor);
      return;
    }
    if (e.data.type === 'LANDING_SET_SELECTED_BLOCK') {
      var nextSub = typeof e.data.subSelector === 'string' ? e.data.subSelector : null;
      var res = applySelection(e.data.blockId, nextSub);
      if (res.activeBlockEl && res.activeSubEl && e.data.notifySubElement) {
        var payload = buildSubElementPayload(res.activeBlockEl, res.activeSubEl);
        if (payload) {
          window.parent.postMessage({
            type: 'LANDING_SELECT_SUBELEMENT',
            blockId: e.data.blockId,
            subElement: payload
          }, '*');
        }
      }
      if (e.data.scrollIntoView && e.data.blockId) {
        var target = res.activeSubEl || document.querySelector('[data-landing-block="' + e.data.blockId + '"]');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (e.data.type === 'LANDING_SYNC_STATE') {
      if (typeof e.data.previewMode === 'boolean') {
        document.documentElement.setAttribute('data-preview-mode', e.data.previewMode ? 'true' : 'false');
      }
      if (typeof e.data.scrollY === 'number' && e.data.scrollY > 0) {
        window.scrollTo({ top: e.data.scrollY, left: 0, behavior: 'instant' });
      }
      neutralizeLinks();
      applySelection(e.data.blockId || null, e.data.subSelector || currentSubSelector);
    } else if (e.data.type === 'LANDING_LIVE_PATCH') {
      var prevScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (typeof e.data.previewMode === 'boolean') {
        document.documentElement.setAttribute('data-preview-mode', e.data.previewMode ? 'true' : 'false');
      }
      if (typeof e.data.cssContent === 'string') {
        var styleEl = document.getElementById('custom-landing-css');
        if (styleEl) {
          styleEl.textContent = e.data.cssContent;
        }
      }
      var targetSubSel = e.data.subSelector !== undefined ? e.data.subSelector : currentSubSelector;
      if (!e.data.skipDomHtmlUpdate && typeof e.data.htmlContent === 'string') {
        var rootEl = document.getElementById('__landing-blocks-root');
        if (rootEl) {
          rootEl.innerHTML = e.data.htmlContent;
        }
        neutralizeLinks();
        runDynamicHelpers();
        var selRes = applySelection(e.data.selectedBlockId || null, targetSubSel);
        if (selRes.activeBlockEl && selRes.activeSubEl && e.data.notifySubElement) {
          var subPayload = buildSubElementPayload(selRes.activeBlockEl, selRes.activeSubEl);
          if (subPayload) {
            window.parent.postMessage({
              type: 'LANDING_SELECT_SUBELEMENT',
              blockId: e.data.selectedBlockId,
              subElement: subPayload
            }, '*');
          }
        }
        if ((window.scrollY || document.documentElement.scrollTop || 0) !== prevScrollY) {
          window.scrollTo({ top: prevScrollY, left: 0, behavior: 'instant' });
        }
        if (e.data.scrollIntoViewBlockId) {
          var scrollTarget = document.querySelector('[data-landing-block="' + e.data.scrollIntoViewBlockId + '"]');
          if (scrollTarget) {
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      } else {
        neutralizeLinks();
        applySelection(e.data.selectedBlockId || currentSelectedId, targetSubSel);
      }
    }
  });
})();
`;

  return { css, js };
}

export function compileLandingFromDocument(
  document: LandingDocumentV1,
  context: { restaurantName: string; restaurantSlug: string },
  options?: { interactiveEditor?: boolean; selectedBlockId?: string | null },
): {
  htmlContent: string;
  cssContent: string;
  previewCss: string;
  jsContent: string;
  fullHtml: string;
} {
  const visibleBlocks = document.blocks.filter((b) => b.visible);
  const blockAnchors = resolveDocumentBlockAnchors(visibleBlocks);
  const anchorByBlockId = new Map(
    blockAnchors.map((a) => [a.blockId, a.anchorId]),
  );

  const htmlParts: string[] = [];
  const cssParts: string[] = [buildThemeBaseCss(document.theme)];
  const subStyleCssParts: string[] = [];
  const seenCss = new Set<string>();
  const jsParts: string[] = [];

  for (const block of visibleBlocks) {
    const anchorId = anchorByBlockId.get(block.id) || sanitizeAnchorSlug(block.id);
    const wrapperStyle = buildBlockWrapperStyle(block.values);
    const styleAttr = wrapperStyle ? ` style="${escapeHtml(wrapperStyle)}"` : "";
    const selectedAttr =
      options?.interactiveEditor && options?.selectedBlockId === block.id
        ? ' data-selected="true"'
        : "";
    const innerHtml = interpolateBlockHtml(block, context, {
      interactiveEditor: options?.interactiveEditor,
    });
    const innerHasSameId = new RegExp(
      `\\bid\\s*=\\s*["']${anchorId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`,
      "i",
    ).test(innerHtml);
    const idAttr = innerHasSameId ? "" : ` id="${escapeHtml(anchorId)}"`;

    htmlParts.push(
      `<div${idAttr} data-landing-block="${escapeHtml(block.id)}" data-anchor-id="${escapeHtml(anchorId)}" data-module-key="${escapeHtml(block.moduleKey)}" data-block-label="${escapeHtml(block.name)}"${selectedAttr}${styleAttr}>\n${innerHtml}\n</div>`,
    );

    const trimmedCss = block.cssTemplate.trim();
    if (trimmedCss && !seenCss.has(trimmedCss)) {
      seenCss.add(trimmedCss);
      cssParts.push(`/* Módulo: ${block.name} */\n${trimmedCss}`);
    }

    const subCss = buildSubElementScopedCss(block.id, block.values);
    if (subCss) {
      subStyleCssParts.push(`/* Estilos de Sub-Elementos: ${block.name} */\n${subCss}`);
    }

    const trimmedJs = block.jsTemplate.trim();
    if (trimmedJs) {
      jsParts.push(`// Módulo: ${block.name}\n(function() {\n${trimmedJs}\n})();`);
    }
  }

  if (subStyleCssParts.length > 0) {
    cssParts.push(subStyleCssParts.join("\n\n"));
  }

  if (document.globalCss.trim()) {
    cssParts.push(`/* CSS Global Personalizado */\n${document.globalCss.trim()}`);
  }

  const combinedModuleJs = jsParts.length
    ? `document.addEventListener('DOMContentLoaded', () => {\n${jsParts.join("\n\n")}\n});`
    : "";

  const finalJsParts = [combinedModuleJs, document.globalJs.trim()].filter(Boolean);

  const htmlContent = htmlParts.join("\n\n");
  const cssContent = cssParts.join("\n\n");
  const jsContent = finalJsParts.join("\n\n");

  let previewCss = cssContent;
  let previewJs = jsContent;
  let bodyHtml = htmlContent;
  if (options?.interactiveEditor) {
    const editorAssets = buildInteractiveEditorAssets(options.selectedBlockId);
    previewCss = `${cssContent}\n\n${editorAssets.css}`;
    previewJs = `${jsContent}\n\n${editorAssets.js}`;
    bodyHtml = `<div id="__landing-blocks-root">\n${htmlContent}\n</div>`;
  }

  const fullHtml = compileLandingDocument({
    htmlContent: bodyHtml,
    cssContent: previewCss,
    jsContent: previewJs,
    title: context.restaurantName,
  });

  return {
    htmlContent,
    cssContent,
    previewCss,
    jsContent,
    fullHtml,
  };
}

export function extractTemplateVariables(htmlTemplate: string): string[] {
  const found = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(htmlTemplate)) !== null) {
    const key = match[1];
    if (key && !SYSTEM_VARIABLES.has(key)) {
      found.add(key);
    }
  }
  return [...found];
}

function inferFieldTypeForVariable(
  key: string,
  htmlTemplate: string,
): LandingFieldType {
  const usedInImgSrc = new RegExp(
    `\\bsrc\\s*=\\s*["']\\{\\{\\s*${key}\\s*\\}\\}["']`,
    "i",
  ).test(htmlTemplate);
  if (
    usedInImgSrc ||
    /image|img|photo|foto|logo|banner|thumb|avatar/i.test(key)
  ) {
    return "image";
  }
  if (/url|href|link/i.test(key)) {
    return "url";
  }
  if (/color/i.test(key)) {
    return "color";
  }
  if (/desc|text|quote|subtitle|paragraph/i.test(key)) {
    return "textarea";
  }
  return "text";
}

export function syncFieldsWithHtmlTemplate(
  existingFields: LandingModuleField[],
  existingValues: Record<string, string>,
  htmlTemplate: string,
): {
  fields: LandingModuleField[];
  values: Record<string, string>;
} {
  const detectedKeys = extractTemplateVariables(htmlTemplate);
  const existingByKey = new Map(existingFields.map((f) => [f.key, f]));
  const nextFields: LandingModuleField[] = [];
  const nextValues: Record<string, string> = { ...existingValues };

  for (const key of detectedKeys) {
    const current = existingByKey.get(key);
    if (current) {
      nextFields.push(current);
    } else {
      const humanized = key
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^\w/, (c) => c.toUpperCase())
        .trim();
      const inferredType = inferFieldTypeForVariable(key, htmlTemplate);
      const defaultValue =
        inferredType === "image"
          ? DEFAULT_PLACEHOLDER_IMAGE
          : inferredType === "url"
            ? "#"
            : humanized;
      nextFields.push({
        key,
        label: humanized || key,
        type: inferredType,
        defaultValue,
      });
      if (nextValues[key] === undefined) {
        nextValues[key] = defaultValue;
      }
    }
  }

  return { fields: nextFields, values: nextValues };
}

// ============================================================================
// Pure HTML AST & Sub-Element Structural Operations (Clone, Move, Delete, Insert)
// ============================================================================

export type HtmlAstNode = {
  tagName: string;
  startOffset: number;
  openTagEndOffset: number;
  innerStartOffset: number;
  innerEndOffset: number;
  endOffset: number;
  selfClosing: boolean;
  children: HtmlAstNode[];
};

export function parseHtmlTemplateAst(html: string): HtmlAstNode[] {
  const rootChildren: HtmlAstNode[] = [];
  const stack: HtmlAstNode[] = [];
  const tokenRegex =
    /<!--[\s\S]*?-->|<\/([a-zA-Z0-9-]+)\s*>|<([a-zA-Z0-9-]+)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(html)) !== null) {
    const fullMatch = match[0];
    if (fullMatch.startsWith("<!--")) {
      continue;
    }

    const closingTag = match[1]?.toLowerCase();
    if (closingTag) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i]?.tagName === closingTag) {
          const popped = stack[i]!;
          popped.innerEndOffset = match.index;
          popped.endOffset = match.index + fullMatch.length;
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const openTag = match[2]?.toLowerCase();
    if (openTag) {
      const attrChunk = match[3] ?? "";
      const selfClosing =
        VOID_HTML_TAGS.has(openTag) || attrChunk.trimEnd().endsWith("/");
      const openEnd = match.index + fullMatch.length;
      const node: HtmlAstNode = {
        tagName: openTag,
        startOffset: match.index,
        openTagEndOffset: openEnd,
        innerStartOffset: openEnd,
        innerEndOffset: openEnd,
        endOffset: openEnd,
        selfClosing,
        children: [],
      };

      if (stack.length > 0) {
        stack[stack.length - 1]!.children.push(node);
      } else {
        rootChildren.push(node);
      }

      if (!selfClosing) {
        stack.push(node);
      }
    }
  }

  return rootChildren;
}

export function findAstNodeByRelativeSelector(
  rootChildren: HtmlAstNode[],
  relativeSelector: string,
): {
  node: HtmlAstNode;
  parent: HtmlAstNode | null;
  siblings: HtmlAstNode[];
  steps: { tag: string; nth: number }[];
} | null {
  const rawSteps = relativeSelector
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);
  if (rawSteps.length === 0) return null;

  const steps: { tag: string; nth: number }[] = [];
  for (const raw of rawSteps) {
    const m = /^([a-zA-Z0-9-]+)(?::nth-of-type\((\d+)\))?$/.exec(raw);
    if (!m?.[1]) return null;
    steps.push({
      tag: m[1].toLowerCase(),
      nth: m[2] ? Math.max(1, parseInt(m[2], 10)) : 1,
    });
  }

  let currentList = rootChildren;
  let parent: HtmlAstNode | null = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const sameTag = currentList.filter((c) => c.tagName === step.tag);
    const target = sameTag[step.nth - 1];
    if (!target) return null;

    if (i === steps.length - 1) {
      return { node: target, parent, siblings: currentList, steps };
    }
    parent = target;
    currentList = target.children;
  }

  return null;
}

function generateUniqueFieldKey(
  baseKey: string,
  usedKeys: Set<string>,
): string {
  const cleanBase = baseKey.replace(/_copy\d+$/i, "").replace(/_\d+$/, "");
  let counter = 2;
  let candidate = `${cleanBase}_${counter}`;
  while (usedKeys.has(candidate) || SYSTEM_VARIABLES.has(candidate)) {
    counter++;
    candidate = `${cleanBase}_${counter}`;
  }
  usedKeys.add(candidate);
  return candidate;
}

export function duplicateSubElementInBlock(
  block: LandingBlock,
  relativeSelector: string,
): { block: LandingBlock; newSelector: string } | null {
  const ast = parseHtmlTemplateAst(block.htmlTemplate);
  const found = findAstNodeByRelativeSelector(ast, relativeSelector);
  if (!found) return null;

  const { node, steps } = found;
  const rawSubtree = block.htmlTemplate.slice(node.startOffset, node.endOffset);
  const usedKeys = new Set<string>([
    ...extractTemplateVariables(block.htmlTemplate),
    ...block.fields.map((f) => f.key),
    ...Object.keys(block.values),
  ]);

  const subtreeVars = extractTemplateVariables(rawSubtree);
  const keyMap = new Map<string, string>();
  const nextFields = [...block.fields];
  const nextValues = { ...block.values };

  for (const oldKey of subtreeVars) {
    const newKey = generateUniqueFieldKey(oldKey, usedKeys);
    keyMap.set(oldKey, newKey);
    const oldField = block.fields.find((f) => f.key === oldKey);
    const currentVal = block.values[oldKey] ?? oldField?.defaultValue ?? "";
    nextValues[newKey] = currentVal;
    if (oldField) {
      nextFields.push({
        ...oldField,
        key: newKey,
        label: `${oldField.label} (Copia)`,
      });
    }
  }

  const clonedSubtree = rawSubtree.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (full, key: string) => {
      const mapped = keyMap.get(key);
      return mapped ? `{{${mapped}}}` : full;
    },
  );

  const nextHtmlTemplate =
    block.htmlTemplate.slice(0, node.endOffset) +
    "\n" +
    clonedSubtree +
    block.htmlTemplate.slice(node.endOffset);

  const lastStep = steps[steps.length - 1]!;
  const newSteps = [
    ...steps.slice(0, -1),
    { tag: lastStep.tag, nth: lastStep.nth + 1 },
  ];
  const newSelector = newSteps
    .map((s) => `${s.tag}:nth-of-type(${s.nth})`)
    .join(" > ");

  // Copy sub-element styles to the cloned element if present
  const subStyles = parseSubElementStyles(nextValues.__subStyles);
  if (subStyles[relativeSelector]) {
    subStyles[newSelector] = { ...subStyles[relativeSelector] };
    nextValues.__subStyles = serializeSubElementStyles(subStyles);
  }

  const synced = syncFieldsWithHtmlTemplate(
    nextFields,
    nextValues,
    nextHtmlTemplate,
  );

  return {
    block: {
      ...block,
      htmlTemplate: nextHtmlTemplate,
      fields: synced.fields,
      values: synced.values,
    },
    newSelector,
  };
}

export function moveSubElementInBlock(
  block: LandingBlock,
  relativeSelector: string,
  direction: "prev" | "next",
): { block: LandingBlock; newSelector: string } | null {
  const ast = parseHtmlTemplateAst(block.htmlTemplate);
  const found = findAstNodeByRelativeSelector(ast, relativeSelector);
  if (!found) return null;

  const { node, siblings, steps } = found;
  const idx = siblings.indexOf(node);
  const targetIdx = direction === "prev" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= siblings.length) return null;

  const other = siblings[targetIdx]!;
  const firstNode = idx < targetIdx ? node : other;
  const secondNode = idx < targetIdx ? other : node;

  const firstHtml = block.htmlTemplate.slice(
    firstNode.startOffset,
    firstNode.endOffset,
  );
  const middleHtml = block.htmlTemplate.slice(
    firstNode.endOffset,
    secondNode.startOffset,
  );
  const secondHtml = block.htmlTemplate.slice(
    secondNode.startOffset,
    secondNode.endOffset,
  );

  const nextHtmlTemplate =
    block.htmlTemplate.slice(0, firstNode.startOffset) +
    secondHtml +
    middleHtml +
    firstHtml +
    block.htmlTemplate.slice(secondNode.endOffset);

  const lastStep = steps[steps.length - 1]!;
  let nextNth = lastStep.nth;
  if (other.tagName === node.tagName) {
    nextNth = direction === "prev" ? lastStep.nth - 1 : lastStep.nth + 1;
  }
  const newSelector = [
    ...steps.slice(0, -1),
    { tag: lastStep.tag, nth: Math.max(1, nextNth) },
  ]
    .map((s) => `${s.tag}:nth-of-type(${s.nth})`)
    .join(" > ");

  const nextValues = { ...block.values };
  if (newSelector !== relativeSelector && nextValues.__subStyles) {
    const subStyles = parseSubElementStyles(nextValues.__subStyles);
    const aStyle = subStyles[relativeSelector];
    const bStyle = subStyles[newSelector];
    if (aStyle) subStyles[newSelector] = aStyle;
    else delete subStyles[newSelector];
    if (bStyle) subStyles[relativeSelector] = bStyle;
    else delete subStyles[relativeSelector];
    nextValues.__subStyles = serializeSubElementStyles(subStyles);
  }

  return {
    block: {
      ...block,
      htmlTemplate: nextHtmlTemplate,
      values: nextValues,
    },
    newSelector,
  };
}

export const CONTAINER_TAGS = new Set([
  "div",
  "section",
  "article",
  "header",
  "footer",
  "nav",
  "main",
  "aside",
  "figure",
  "details",
  "ul",
  "ol",
  "li",
  "form",
  "blockquote",
  "fieldset",
]);

const DRAG_MOVE_MARKER = "data-landing-move-marker";

function insertMarkerIntoHtml(html: string): string {
  const match = /<([a-zA-Z0-9-]+)(\s|>)/.exec(html);
  if (!match) return html;
  const insertIndex = match.index + match[1].length + 1;
  return (
    html.slice(0, insertIndex) +
    ` ${DRAG_MOVE_MARKER}="true"` +
    html.slice(insertIndex)
  );
}

function stripMarkerFromHtml(html: string): string {
  return html.replace(new RegExp(`\\s*${DRAG_MOVE_MARKER}="true"`, "g"), "");
}

export function findSelectorForAstNode(
  rootNodes: HtmlAstNode[],
  predicate: (node: HtmlAstNode) => boolean,
): string | null {
  function search(siblings: HtmlAstNode[], parentPath: string): string | null {
    const tagCounts = new Map<string, number>();
    for (const child of siblings) {
      const tag = child.tagName.toLowerCase();
      const count = (tagCounts.get(tag) || 0) + 1;
      tagCounts.set(tag, count);
      const step = `${tag}:nth-of-type(${count})`;
      const currentPath = parentPath ? `${parentPath} > ${step}` : step;
      if (predicate(child)) {
        return currentPath;
      }
      if (child.children.length > 0) {
        const found = search(child.children, currentPath);
        if (found) return found;
      }
    }
    return null;
  }

  return search(rootNodes, "");
}

export function isPlaceholderParagraph(n: HtmlAstNode, html: string): boolean {
  if (n.tagName.toLowerCase() !== "p") return false;
  const inner = html.slice(n.innerStartOffset, n.innerEndOffset);
  return /Arrastr[áa]|Contenedor Libre|Columna \d|Fila Flexible|Solt[áa] o agreg[áa]/i.test(
    inner,
  );
}

export function reparentSubElementInBlock(
  block: LandingBlock,
  sourceSelector: string,
  targetSelector: string,
  position: "inside" | "before" | "after" = "inside",
): { block: LandingBlock; newSelector: string } | null {
  const ast = parseHtmlTemplateAst(block.htmlTemplate);
  const sourceFound = findAstNodeByRelativeSelector(ast, sourceSelector);
  const targetFound = findAstNodeByRelativeSelector(ast, targetSelector);
  if (!sourceFound || !targetFound) return null;

  // Cannot drop into itself or its own descendant
  if (sourceSelector === targetSelector) return null;
  if (targetSelector.startsWith(sourceSelector + " > ")) return null;
  if (
    (position === "before" || position === "after") &&
    sourceFound.node === targetFound.node
  ) {
    return null;
  }

  let effectivePosition = position;
  if (effectivePosition === "inside") {
    if (
      targetFound.node.selfClosing ||
      VOID_HTML_TAGS.has(targetFound.node.tagName) ||
      !CONTAINER_TAGS.has(targetFound.node.tagName)
    ) {
      effectivePosition = "after";
    }
  }

  const rawSourceHtml = block.htmlTemplate.slice(
    sourceFound.node.startOffset,
    sourceFound.node.endOffset,
  );
  const markedSourceHtml = insertMarkerIntoHtml(rawSourceHtml);

  const sStart = sourceFound.node.startOffset;
  const sEnd = sourceFound.node.endOffset;

  let replaceRange: { start: number; end: number } | null = null;
  let targetOffset = 0;

  if (effectivePosition === "inside") {
    const placeholderChild = targetFound.node.children.find((c) =>
      isPlaceholderParagraph(c, block.htmlTemplate),
    );
    if (placeholderChild) {
      replaceRange = {
        start: placeholderChild.startOffset,
        end: placeholderChild.endOffset,
      };
    } else {
      targetOffset = targetFound.node.innerEndOffset;
    }
  } else if (effectivePosition === "before") {
    targetOffset = targetFound.node.startOffset;
  } else {
    targetOffset = targetFound.node.endOffset;
  }

  let nextHtmlTemplate = "";
  if (replaceRange) {
    if (replaceRange.start < sStart) {
      nextHtmlTemplate =
        block.htmlTemplate.slice(0, replaceRange.start) +
        markedSourceHtml +
        block.htmlTemplate.slice(replaceRange.end, sStart) +
        block.htmlTemplate.slice(sEnd);
    } else if (replaceRange.start >= sEnd) {
      nextHtmlTemplate =
        block.htmlTemplate.slice(0, sStart) +
        block.htmlTemplate.slice(sEnd, replaceRange.start) +
        markedSourceHtml +
        block.htmlTemplate.slice(replaceRange.end);
    } else {
      return null;
    }
  } else {
    if (targetOffset <= sStart) {
      nextHtmlTemplate =
        block.htmlTemplate.slice(0, targetOffset) +
        "\n" +
        markedSourceHtml +
        "\n" +
        block.htmlTemplate.slice(targetOffset, sStart) +
        block.htmlTemplate.slice(sEnd);
    } else if (targetOffset >= sEnd) {
      nextHtmlTemplate =
        block.htmlTemplate.slice(0, sStart) +
        block.htmlTemplate.slice(sEnd, targetOffset) +
        "\n" +
        markedSourceHtml +
        "\n" +
        block.htmlTemplate.slice(targetOffset);
    } else {
      return null;
    }
  }

  const nextAst = parseHtmlTemplateAst(nextHtmlTemplate);
  const newSelector = findSelectorForAstNode(nextAst, (n) =>
    nextHtmlTemplate
      .slice(n.startOffset, n.openTagEndOffset)
      .includes(DRAG_MOVE_MARKER),
  );
  const finalHtmlTemplate = stripMarkerFromHtml(nextHtmlTemplate);

  if (!newSelector) {
    return null;
  }

  const nextValues = { ...block.values };
  if (nextValues.__subStyles) {
    const subStyles = parseSubElementStyles(nextValues.__subStyles);
    const updatedSubStyles: Record<string, SubElementStyleOverride> = {};
    for (const [sel, st] of Object.entries(subStyles)) {
      if (sel === sourceSelector) {
        updatedSubStyles[newSelector] = st;
      } else if (sel.startsWith(sourceSelector + " > ")) {
        const suffix = sel.slice((sourceSelector + " > ").length);
        updatedSubStyles[`${newSelector} > ${suffix}`] = st;
      } else {
        updatedSubStyles[sel] = st;
      }
    }
    nextValues.__subStyles = serializeSubElementStyles(updatedSubStyles);
  }

  const synced = syncFieldsWithHtmlTemplate(
    block.fields,
    nextValues,
    finalHtmlTemplate,
  );

  return {
    block: {
      ...block,
      htmlTemplate: finalHtmlTemplate,
      fields: synced.fields,
      values: synced.values,
    },
    newSelector,
  };
}

export function moveSubElementBetweenBlocks(
  sourceBlock: LandingBlock,
  sourceSelector: string,
  targetBlock: LandingBlock,
  targetSelector: string | null,
  position: "inside" | "before" | "after" = "inside",
): {
  sourceBlock: LandingBlock;
  targetBlock: LandingBlock;
  newSelector: string;
} | null {
  const sourceAst = parseHtmlTemplateAst(sourceBlock.htmlTemplate);
  const sourceFound = findAstNodeByRelativeSelector(sourceAst, sourceSelector);
  if (!sourceFound) return null;

  const rawSourceHtml = sourceBlock.htmlTemplate.slice(
    sourceFound.node.startOffset,
    sourceFound.node.endOffset,
  );

  // 1. Remove from sourceBlock
  const sourceNextHtml =
    sourceBlock.htmlTemplate.slice(0, sourceFound.node.startOffset) +
    sourceBlock.htmlTemplate.slice(sourceFound.node.endOffset);

  // Clean source values / subStyles
  const nextSourceValues = { ...sourceBlock.values };
  const transferredStyles: Record<string, SubElementStyleOverride> = {};
  if (nextSourceValues.__subStyles) {
    const subStyles = parseSubElementStyles(nextSourceValues.__subStyles);
    for (const [sel, st] of Object.entries(subStyles)) {
      if (sel === sourceSelector || sel.startsWith(sourceSelector + " > ")) {
        transferredStyles[sel] = st;
        delete subStyles[sel];
      }
    }
    nextSourceValues.__subStyles = serializeSubElementStyles(subStyles);
  }

  const sourceSynced = syncFieldsWithHtmlTemplate(
    sourceBlock.fields,
    nextSourceValues,
    sourceNextHtml,
  );
  const updatedSourceBlock: LandingBlock = {
    ...sourceBlock,
    htmlTemplate: sourceNextHtml,
    fields: sourceSynced.fields,
    values: sourceSynced.values,
  };

  // 2. Prepare variables for targetBlock
  const usedKeys = new Set<string>([
    ...extractTemplateVariables(targetBlock.htmlTemplate),
    ...targetBlock.fields.map((f) => f.key),
    ...Object.keys(targetBlock.values),
  ]);

  const sourceVars = extractTemplateVariables(rawSourceHtml);
  const keyMap = new Map<string, string>();
  const nextTargetFields = [...targetBlock.fields];
  const nextTargetValues = { ...targetBlock.values };

  for (const oldKey of sourceVars) {
    if (SYSTEM_VARIABLES.has(oldKey)) continue;

    const existingField = targetBlock.fields.find((f) => f.key === oldKey);
    const sourceField = sourceBlock.fields.find((f) => f.key === oldKey);
    const sourceVal =
      sourceBlock.values[oldKey] ?? sourceField?.defaultValue ?? "";

    if (existingField && targetBlock.values[oldKey] !== sourceVal) {
      const newKey = generateUniqueFieldKey(oldKey, usedKeys);
      keyMap.set(oldKey, newKey);
      nextTargetValues[newKey] = sourceVal;
      if (sourceField) {
        nextTargetFields.push({ ...sourceField, key: newKey });
      }
    } else {
      if (!existingField && sourceField) {
        nextTargetFields.push(sourceField);
      }
      nextTargetValues[oldKey] = sourceVal;
      usedKeys.add(oldKey);
    }
  }

  let mappedSnippet = rawSourceHtml;
  if (keyMap.size > 0) {
    mappedSnippet = rawSourceHtml.replace(
      /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
      (full, k: string) => {
        const mapped = keyMap.get(k);
        return mapped ? `{{${mapped}}}` : full;
      },
    );
  }

  const markedSnippet = insertMarkerIntoHtml(mappedSnippet);

  // 3. Find insertion location in targetBlock
  const targetAst = parseHtmlTemplateAst(targetBlock.htmlTemplate);
  let replaceRange: { start: number; end: number } | null = null;
  let targetOffset = targetBlock.htmlTemplate.length;

  if (targetSelector) {
    const targetFound = findAstNodeByRelativeSelector(targetAst, targetSelector);
    if (targetFound) {
      let effectivePosition = position;
      if (effectivePosition === "inside") {
        if (
          targetFound.node.selfClosing ||
          VOID_HTML_TAGS.has(targetFound.node.tagName) ||
          !CONTAINER_TAGS.has(targetFound.node.tagName)
        ) {
          effectivePosition = "after";
        }
      }

      if (effectivePosition === "inside") {
        const placeholderChild = targetFound.node.children.find((c) =>
          isPlaceholderParagraph(c, targetBlock.htmlTemplate),
        );
        if (placeholderChild) {
          replaceRange = {
            start: placeholderChild.startOffset,
            end: placeholderChild.endOffset,
          };
        } else {
          targetOffset = targetFound.node.innerEndOffset;
        }
      } else if (effectivePosition === "before") {
        targetOffset = targetFound.node.startOffset;
      } else {
        targetOffset = targetFound.node.endOffset;
      }
    }
  } else if (targetAst.length > 0) {
    const rootNode = targetAst[0]!;
    const placeholder = rootNode.children.find((c) =>
      isPlaceholderParagraph(c, targetBlock.htmlTemplate),
    );
    if (placeholder) {
      replaceRange = {
        start: placeholder.startOffset,
        end: placeholder.endOffset,
      };
    } else {
      const firstContainer =
        rootNode.children.find((c) => c.tagName === "div") ?? rootNode;
      targetOffset = firstContainer.innerEndOffset;
    }
  }

  const nextTargetHtml = replaceRange
    ? targetBlock.htmlTemplate.slice(0, replaceRange.start) +
      markedSnippet +
      targetBlock.htmlTemplate.slice(replaceRange.end)
    : targetBlock.htmlTemplate.slice(0, targetOffset) +
      "\n" +
      markedSnippet +
      "\n" +
      targetBlock.htmlTemplate.slice(targetOffset);

  const nextTargetAst = parseHtmlTemplateAst(nextTargetHtml);
  const newSelector = findSelectorForAstNode(nextTargetAst, (n) =>
    nextTargetHtml
      .slice(n.startOffset, n.openTagEndOffset)
      .includes(DRAG_MOVE_MARKER),
  );
  const finalTargetHtml = stripMarkerFromHtml(nextTargetHtml);

  if (!newSelector) return null;

  // Transfer sub-element styles to targetBlock
  if (Object.keys(transferredStyles).length > 0) {
    const targetSubStyles = parseSubElementStyles(nextTargetValues.__subStyles);
    for (const [sel, st] of Object.entries(transferredStyles)) {
      if (sel === sourceSelector) {
        targetSubStyles[newSelector] = st;
      } else if (sel.startsWith(sourceSelector + " > ")) {
        const suffix = sel.slice((sourceSelector + " > ").length);
        targetSubStyles[`${newSelector} > ${suffix}`] = st;
      }
    }
    nextTargetValues.__subStyles = serializeSubElementStyles(targetSubStyles);
  }

  const targetSynced = syncFieldsWithHtmlTemplate(
    nextTargetFields,
    nextTargetValues,
    finalTargetHtml,
  );

  const updatedTargetBlock: LandingBlock = {
    ...targetBlock,
    htmlTemplate: finalTargetHtml,
    fields: targetSynced.fields,
    values: targetSynced.values,
  };

  return {
    sourceBlock: updatedSourceBlock,
    targetBlock: updatedTargetBlock,
    newSelector,
  };
}

export function moveBlockIntoBlock(
  sourceBlock: LandingBlock,
  targetBlock: LandingBlock,
  targetSelector?: string | null,
): {
  targetBlock: LandingBlock;
  newSelector: string;
} | null {
  const sourceSnippet = `<div class="nested-block nested-block-${sourceBlock.moduleKey}" style="width: 100%; box-sizing: border-box; margin: 16px 0;">\n${sourceBlock.htmlTemplate}\n</div>`;

  const tempSourceBlock: LandingBlock = {
    ...sourceBlock,
    htmlTemplate: sourceSnippet,
  };

  const result = moveSubElementBetweenBlocks(
    tempSourceBlock,
    "div:nth-of-type(1)",
    targetBlock,
    targetSelector ?? null,
    "inside",
  );

  if (!result) return null;

  return {
    targetBlock: result.targetBlock,
    newSelector: result.newSelector,
  };
}

export function deleteSubElementInBlock(
  block: LandingBlock,
  relativeSelector: string,
): LandingBlock | null {
  const ast = parseHtmlTemplateAst(block.htmlTemplate);
  const found = findAstNodeByRelativeSelector(ast, relativeSelector);
  if (!found) return null;

  const { node } = found;
  const nextHtmlTemplate =
    block.htmlTemplate.slice(0, node.startOffset) +
    block.htmlTemplate.slice(node.endOffset);

  const nextValues = { ...block.values };
  if (nextValues.__subStyles) {
    const subStyles = parseSubElementStyles(nextValues.__subStyles);
    delete subStyles[relativeSelector];
    nextValues.__subStyles = serializeSubElementStyles(subStyles);
  }

  const synced = syncFieldsWithHtmlTemplate(
    block.fields,
    nextValues,
    nextHtmlTemplate,
  );

  return {
    ...block,
    htmlTemplate: nextHtmlTemplate,
    fields: synced.fields,
    values: synced.values,
  };
}

export type InsertableInnerElementKind =
  | "button"
  | "button-secondary"
  | "link"
  | "image"
  | "heading"
  | "text"
  | "badge"
  | "divider"
  | "card"
  | "container"
  | "columns-2"
  | "columns-3"
  | "flex-row";

export function insertInnerElementInBlock(
  block: LandingBlock,
  targetSelector: string | null,
  kind: InsertableInnerElementKind,
): LandingBlock {
  const usedKeys = new Set<string>([
    ...extractTemplateVariables(block.htmlTemplate),
    ...block.fields.map((f) => f.key),
    ...Object.keys(block.values),
  ]);

  const nextFields = [...block.fields];
  const nextValues = { ...block.values };
  let snippet = "";

  if (kind === "button") {
    const textKey = generateUniqueFieldKey("btnText", usedKeys);
    const urlKey = generateUniqueFieldKey("btnUrl", usedKeys);
    nextFields.push(
      { key: textKey, label: "Texto del botón", type: "text", defaultValue: "Nuevo Botón" },
      { key: urlKey, label: "URL del botón", type: "url", defaultValue: "{{menuUrl}}" },
    );
    nextValues[textKey] = "Nuevo Botón";
    nextValues[urlKey] = "{{menuUrl}}";
    snippet = `<a href="{{${urlKey}}}" class="btn btn-primary" style="margin-top: 10px;">{{${textKey}}}</a>`;
  } else if (kind === "image") {
    const srcKey = generateUniqueFieldKey("imageUrl", usedKeys);
    const altKey = generateUniqueFieldKey("imageAlt", usedKeys);
    nextFields.push(
      { key: srcKey, label: "Imagen", type: "image", defaultValue: DEFAULT_PLACEHOLDER_IMAGE },
      { key: altKey, label: "Descripción de imagen", type: "text", defaultValue: "Foto destacada" },
    );
    nextValues[srcKey] = DEFAULT_PLACEHOLDER_IMAGE;
    nextValues[altKey] = "Foto destacada";
    snippet = `<img src="{{${srcKey}}}" alt="{{${altKey}}}" loading="lazy" style="width: 100%; max-width: 560px; height: auto; border-radius: var(--radius-md); display: block; margin: 16px 0; object-fit: cover;" />`;
  } else if (kind === "heading") {
    const headKey = generateUniqueFieldKey("heading", usedKeys);
    nextFields.push({
      key: headKey,
      label: "Subtítulo",
      type: "text",
      defaultValue: "Nuevo Título Destacado",
    });
    nextValues[headKey] = "Nuevo Título Destacado";
    snippet = `<h3 style="margin: 14px 0 8px;">{{${headKey}}}</h3>`;
  } else if (kind === "text") {
    const textKey = generateUniqueFieldKey("paragraph", usedKeys);
    nextFields.push({
      key: textKey,
      label: "Párrafo",
      type: "textarea",
      defaultValue: "Escribí aquí el contenido descriptivo de esta sección.",
    });
    nextValues[textKey] = "Escribí aquí el contenido descriptivo de esta sección.";
    snippet = `<p class="section-description" style="margin: 10px 0;">{{${textKey}}}</p>`;
  } else if (kind === "badge") {
    const badgeKey = generateUniqueFieldKey("badge", usedKeys);
    nextFields.push({
      key: badgeKey,
      label: "Insignia",
      type: "text",
      defaultValue: "Destacado",
    });
    nextValues[badgeKey] = "Destacado";
    snippet = `<span class="hero-badge" style="margin: 8px 0;">{{${badgeKey}}}</span>`;
  } else if (kind === "card") {
    const iconKey = generateUniqueFieldKey("cardIcon", usedKeys);
    const titleKey = generateUniqueFieldKey("cardTitle", usedKeys);
    const textKey = generateUniqueFieldKey("cardText", usedKeys);
    nextFields.push(
      { key: iconKey, label: "Card · Ícono", type: "text", defaultValue: "✨" },
      { key: titleKey, label: "Card · Título", type: "text", defaultValue: "Nueva Especialidad" },
      { key: textKey, label: "Card · Descripción", type: "textarea", defaultValue: "Descripción breve del plato, promoción o experiencia destacada." },
    );
    nextValues[iconKey] = "✨";
    nextValues[titleKey] = "Nueva Especialidad";
    nextValues[textKey] = "Descripción breve del plato, promoción o experiencia destacada.";
    snippet = `<article class="card">\n  <div class="card-icon">{{${iconKey}}}</div>\n  <h3 class="card-title">{{${titleKey}}}</h3>\n  <p class="card-text">{{${textKey}}}</p>\n</article>`;
  } else if (kind === "button-secondary") {
    const textKey = generateUniqueFieldKey("btnSecText", usedKeys);
    const urlKey = generateUniqueFieldKey("btnSecUrl", usedKeys);
    nextFields.push(
      { key: textKey, label: "Texto botón secundario", type: "text", defaultValue: "Más Información" },
      { key: urlKey, label: "URL botón secundario", type: "url", defaultValue: "#" },
    );
    nextValues[textKey] = "Más Información";
    nextValues[urlKey] = "#";
    snippet = `<a href="{{${urlKey}}}" class="btn btn-secondary" style="margin-top: 10px; display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; border-radius: var(--radius-md, 10px); font-weight: 600; text-decoration: none; border: 1px solid var(--color-border, #cbd5e1); color: inherit; background: transparent;">{{${textKey}}}</a>`;
  } else if (kind === "link") {
    const textKey = generateUniqueFieldKey("linkText", usedKeys);
    const urlKey = generateUniqueFieldKey("linkUrl", usedKeys);
    nextFields.push(
      { key: textKey, label: "Texto del enlace", type: "text", defaultValue: "Ver más detalles →" },
      { key: urlKey, label: "URL del enlace", type: "url", defaultValue: "#" },
    );
    nextValues[textKey] = "Ver más detalles →";
    nextValues[urlKey] = "#";
    snippet = `<a href="{{${urlKey}}}" class="text-link" style="color: var(--color-primary, #2563eb); text-decoration: underline; font-weight: 500; font-size: 14px;">{{${textKey}}}</a>`;
  } else if (kind === "divider") {
    snippet = `<hr style="border: 0; border-top: 1px solid rgba(0,0,0,0.1); margin: 24px 0; width: 100%;" />`;
  } else if (kind === "container") {
    snippet = `<div class="content-container" style="padding: 24px; border: 1px dashed rgba(0,0,0,0.15); border-radius: var(--radius-md, 12px); margin: 16px 0; width: 100%; box-sizing: border-box;">\n  <p style="color: #94a3b8; font-size: 12px; margin: 0 0 10px; font-weight: 500;">Contenedor (Soltá o agregá elementos acá)</p>\n</div>`;
  } else if (kind === "columns-2") {
    snippet = `<div class="grid-columns-2" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin: 20px 0; width: 100%; box-sizing: border-box;">\n  <div class="grid-column" style="padding: 20px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;">\n    <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 1 — Arrastrá componentes aquí</p>\n  </div>\n  <div class="grid-column" style="padding: 20px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;">\n    <p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 2 — Arrastrá componentes aquí</p>\n  </div>\n</div>`;
  } else if (kind === "columns-3") {
    snippet = `<div class="grid-columns-3" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin: 20px 0; width: 100%; box-sizing: border-box;">\n  <div class="grid-column" style="padding: 16px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;"><p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 1 — Arrastrá componentes aquí</p></div>\n  <div class="grid-column" style="padding: 16px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;"><p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 2 — Arrastrá componentes aquí</p></div>\n  <div class="grid-column" style="padding: 16px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;"><p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 3 — Arrastrá componentes aquí</p></div>\n</div>`;
  } else if (kind === "flex-row") {
    snippet = `<div class="flex-row" style="display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin: 16px 0; width: 100%; box-sizing: border-box;">\n  <p style="color: #94a3b8; font-size: 12px; margin: 0;">Fila Flexible</p>\n</div>`;
  }

  const ast = parseHtmlTemplateAst(block.htmlTemplate);
  let replaceRange: { start: number; end: number } | null = null;
  let insertOffset = block.htmlTemplate.length;

  if (targetSelector) {
    const found = findAstNodeByRelativeSelector(ast, targetSelector);
    if (found) {
      if (isPlaceholderParagraph(found.node, block.htmlTemplate)) {
        replaceRange = {
          start: found.node.startOffset,
          end: found.node.endOffset,
        };
      } else {
        const placeholderChild = found.node.children.find((c) =>
          isPlaceholderParagraph(c, block.htmlTemplate),
        );
        if (placeholderChild) {
          replaceRange = {
            start: placeholderChild.startOffset,
            end: placeholderChild.endOffset,
          };
        } else {
          const containerTags = new Set([
            "div",
            "section",
            "article",
            "header",
            "footer",
            "nav",
            "figure",
            "details",
          ]);
          if (
            !found.node.selfClosing &&
            containerTags.has(found.node.tagName) &&
            !(kind === "card" && found.node.tagName === "article")
          ) {
            insertOffset = found.node.innerEndOffset;
          } else {
            insertOffset = found.node.endOffset;
          }
        }
      }
    }
  } else if (ast.length > 0) {
    const rootNode = ast[0]!;
    let foundPlaceholder: HtmlAstNode | null = null;
    const walk = (n: HtmlAstNode) => {
      if (foundPlaceholder) return;
      if (isPlaceholderParagraph(n, block.htmlTemplate)) {
        foundPlaceholder = n;
        return;
      }
      for (const child of n.children) walk(child);
    };
    walk(rootNode);

    if (foundPlaceholder) {
      replaceRange = {
        start: (foundPlaceholder as HtmlAstNode).startOffset,
        end: (foundPlaceholder as HtmlAstNode).endOffset,
      };
    } else {
      const firstContainer =
        rootNode.children.find((c) => c.tagName === "div") ?? rootNode;
      insertOffset = firstContainer.innerEndOffset;
    }
  }

  const nextHtmlTemplate = replaceRange
    ? block.htmlTemplate.slice(0, replaceRange.start) +
      snippet +
      block.htmlTemplate.slice(replaceRange.end)
    : block.htmlTemplate.slice(0, insertOffset) +
      "\n" +
      snippet +
      "\n" +
      block.htmlTemplate.slice(insertOffset);

  const synced = syncFieldsWithHtmlTemplate(
    nextFields,
    nextValues,
    nextHtmlTemplate,
  );

  return {
    ...block,
    htmlTemplate: nextHtmlTemplate,
    fields: synced.fields,
    values: synced.values,
  };
}

export function createBlankContainerBlock(
  initialKind?: InsertableInnerElementKind,
): LandingBlock {
  const blockId = `block-container-${Math.random().toString(36).slice(2, 8)}`;
  let innerSnippet = `<div class="content-container" style="padding: 32px; border: 2px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 14px); min-height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; width: 100%; box-sizing: border-box;">\n  <p style="color: #94a3b8; font-size: 13px; margin: 0; font-weight: 500;">Contenedor Libre — Arrastrá componentes o hacé clic para insertar</p>\n</div>`;

  if (initialKind === "columns-2") {
    innerSnippet = `<div class="grid-columns-2" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; width: 100%; box-sizing: border-box;">\n  <div class="grid-column" style="padding: 24px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 100px; box-sizing: border-box;"><p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 1 — Arrastrá componentes aquí</p></div>\n  <div class="grid-column" style="padding: 24px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 100px; box-sizing: border-box;"><p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 2 — Arrastrá componentes aquí</p></div>\n</div>`;
  } else if (initialKind === "columns-3") {
    innerSnippet = `<div class="grid-columns-3" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; width: 100%; box-sizing: border-box;">\n  <div class="grid-column" style="padding: 20px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;"><p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 1 — Arrastrá componentes aquí</p></div>\n  <div class="grid-column" style="padding: 20px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;"><p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 2 — Arrastrá componentes aquí</p></div>\n  <div class="grid-column" style="padding: 20px; border: 1px dashed rgba(0,0,0,0.12); border-radius: var(--radius-md, 12px); min-height: 80px; box-sizing: border-box;"><p style="color: #94a3b8; font-size: 12px; margin: 0; font-weight: 500;">Columna 3 — Arrastrá componentes aquí</p></div>\n</div>`;
  } else if (initialKind === "flex-row") {
    innerSnippet = `<div class="flex-row" style="display: flex; flex-wrap: wrap; align-items: center; gap: 16px; width: 100%; box-sizing: border-box;">\n  <p style="color: #94a3b8; font-size: 12px; margin: 0;">Fila Flexible</p>\n</div>`;
  }

  const htmlTemplate = `<!-- Sección Contenedor -->\n<section class="section" style="padding: 48px 0;">\n  <div class="container" style="max-width: 1100px; margin: 0 auto; padding: 0 20px;">\n    ${innerSnippet}\n  </div>\n</section>`;

  return {
    id: blockId,
    moduleKey: "blank-container",
    name:
      initialKind === "columns-2"
        ? "Sección 2 Columnas"
        : initialKind === "columns-3"
          ? "Sección 3 Columnas"
          : "Sección Contenedor",
    visible: true,
    fields: [],
    values: {},
    htmlTemplate,
    cssTemplate: "",
    jsTemplate: "",
  };
}

export function updateSubElementAttributeInBlock(
  block: LandingBlock,
  relativeSelector: string,
  attrName: "src" | "href" | "alt",
  value: string,
): LandingBlock {
  const ast = parseHtmlTemplateAst(block.htmlTemplate);
  const found = findAstNodeByRelativeSelector(ast, relativeSelector);
  if (!found) return block;

  const { node } = found;
  const openTag = block.htmlTemplate.slice(
    node.startOffset,
    node.openTagEndOffset,
  );
  const boundAttrRegex = new RegExp(
    `\\b${attrName}\\s*=\\s*["']\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}["']`,
    "i",
  );
  const boundMatch = boundAttrRegex.exec(openTag);

  if (boundMatch?.[1] && !SYSTEM_VARIABLES.has(boundMatch[1])) {
    const boundKey = boundMatch[1];
    return {
      ...block,
      values: {
        ...block.values,
        [boundKey]: value,
      },
    };
  }

  const attrRegex = new RegExp(
    `(\\b${attrName}\\s*=\\s*)(?:"[^"]*"|'[^']*')`,
    "i",
  );
  const safeAttrVal = escapeHtml(value);
  let nextOpenTag: string;
  if (attrRegex.test(openTag)) {
    nextOpenTag = openTag.replace(attrRegex, `$1"${safeAttrVal}"`);
  } else {
    nextOpenTag = openTag.replace(
      /(\s*\/?)>$/,
      ` ${attrName}="${safeAttrVal}"$1>`,
    );
  }

  const nextHtmlTemplate =
    block.htmlTemplate.slice(0, node.startOffset) +
    nextOpenTag +
    block.htmlTemplate.slice(node.openTagEndOffset);

  return {
    ...block,
    htmlTemplate: nextHtmlTemplate,
  };
}

export const DEFAULT_LANDING_THEME: LandingTheme = {
  primaryColor: "#1e3321",
  primaryLightColor: "#2c4a30",
  accentColor: "#c49a45",
  bgColor: "#faf8f5",
  cardBgColor: "#ffffff",
  textColor: "#192019",
  mutedTextColor: "#5e695d",
  borderColor: "#e8e4dc",
  fontHeading: "'Playfair Display', Georgia, serif",
  fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
  radiusMd: "14px",
  radiusLg: "24px",
};

export function createDefaultLandingDocument(
  restaurantName: string,
  restaurantSlug: string,
): LandingDocumentV1 {
  const safeName = restaurantName.trim() || "Nuestro Restaurante";
  const menuUrl = `/m/${restaurantSlug}`;
  const defaultKeys = [
    "header",
    "hero",
    "specialties-grid",
    "experience-split",
    "contact-hours",
    "footer",
  ];

  const blocks: LandingBlock[] = defaultKeys.map((key, index) => {
    const def = BUILTIN_LANDING_MODULES.find((m) => m.moduleKey === key)!;
    const block = createBlockFromBuiltinModule(def, `${index + 1}`);
    for (const [k, v] of Object.entries(block.values)) {
      block.values[k] = v
        .replace(/\{\{\s*restaurantName\s*\}\}/g, safeName)
        .replace(/\{\{\s*menuUrl\s*\}\}/g, menuUrl);
    }
    return block;
  });

  return {
    schemaVersion: 1,
    mode: "visual",
    theme: { ...DEFAULT_LANDING_THEME },
    blocks,
    globalCss: "",
    globalJs: "",
  };
}

export function createDefaultLandingTemplate(
  restaurantName: string,
  restaurantSlug: string,
): {
  document: LandingDocumentV1;
  html: string;
  css: string;
  js: string;
} {
  const document = createDefaultLandingDocument(restaurantName, restaurantSlug);
  const compiled = compileLandingFromDocument(document, {
    restaurantName,
    restaurantSlug,
  });

  return {
    document,
    html: compiled.htmlContent,
    css: compiled.cssContent,
    js: compiled.jsContent,
  };
}

// ============================================================================
// Figma-style Sub-Layer Tree Construction
// ============================================================================

export type LandingSubLayerIconType =
  | "container"
  | "text"
  | "image"
  | "button"
  | "link"
  | "card"
  | "badge";

export interface LandingSubLayerNode {
  id: string;
  selector: string;
  tag: string;
  label: string;
  iconType: LandingSubLayerIconType;
  childFieldKeys: string[];
  children: LandingSubLayerNode[];
}

function extractNodeAttributes(
  html: string,
  node: HtmlAstNode,
): {
  id: string;
  className: string;
  alt: string;
  src: string;
  href: string;
  ariaLabel: string;
} {
  const openTag = html.slice(node.startOffset, node.openTagEndOffset);
  const id = /\bid\s*=\s*["']([^"']+)["']/i.exec(openTag)?.[1] || "";
  const className = /\bclass\s*=\s*["']([^"']+)["']/i.exec(openTag)?.[1] || "";
  const alt = /\balt\s*=\s*["']([^"']+)["']/i.exec(openTag)?.[1] || "";
  const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(openTag)?.[1] || "";
  const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(openTag)?.[1] || "";
  const ariaLabel =
    /\baria-label\s*=\s*["']([^"']+)["']/i.exec(openTag)?.[1] || "";
  return { id, className, alt, src, href, ariaLabel };
}

function extractNodeTextPreview(
  html: string,
  node: HtmlAstNode,
  values: Record<string, string>,
): string {
  const innerHtml = html.slice(node.innerStartOffset, node.innerEndOffset);
  return innerHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => values[key] ?? key)
    .replace(/\s+/g, " ")
    .trim();
}

function truncateString(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

function findCardTitleText(
  node: HtmlAstNode,
  html: string,
  values: Record<string, string>,
): string | null {
  for (const child of node.children) {
    if (/^h[1-6]$/i.test(child.tagName)) {
      const text = extractNodeTextPreview(html, child, values);
      if (text) return text;
    }
    const attrs = extractNodeAttributes(html, child);
    if (/title|name|heading/i.test(attrs.className)) {
      const text = extractNodeTextPreview(html, child, values);
      if (text) return text;
    }
  }
  return null;
}

function isDecorativeEmptyNode(node: HtmlAstNode, html: string): boolean {
  const tag = node.tagName.toLowerCase();
  if (tag !== "span" && tag !== "i" && tag !== "b" && tag !== "em") {
    return false;
  }
  if (node.children.length > 0) return false;
  const inner = html.slice(node.innerStartOffset, node.innerEndOffset).trim();
  if (inner.length > 0) return false;
  const attrs = extractNodeAttributes(html, node);
  if (attrs.ariaLabel) return false;
  return true;
}

function mapAstNodeToSubLayer(
  block: LandingBlock,
  node: HtmlAstNode,
  selector: string,
  parentNode?: HtmlAstNode,
  columnPosition?: number,
): LandingSubLayerNode | null {
  if (isDecorativeEmptyNode(node, block.htmlTemplate)) {
    return null;
  }

  const tag = node.tagName.toLowerCase();
  const attrs = extractNodeAttributes(block.htmlTemplate, node);
  const textPreview = extractNodeTextPreview(
    block.htmlTemplate,
    node,
    block.values,
  );
  const subtreeHtml = block.htmlTemplate.slice(node.startOffset, node.endOffset);
  const childFieldKeys = extractTemplateVariables(subtreeHtml);

  let iconType: LandingSubLayerIconType = "container";
  let label = tag;
  let forceLeaf = false;

  if (tag === "img") {
    iconType = "image";
    forceLeaf = true;
    if (attrs.alt) {
      label = `Imagen ("${truncateString(attrs.alt, 20)}")`;
    } else {
      const boundVar = childFieldKeys[0];
      label = boundVar ? `Imagen (${boundVar})` : "Imagen";
    }
  } else if (tag === "button") {
    iconType = "button";
    forceLeaf = true;
    const btnText = textPreview || attrs.ariaLabel;
    label = btnText ? `Botón ("${truncateString(btnText, 22)}")` : "Botón";
  } else if (tag === "a") {
    const isBtn = /\bbtn\b/.test(attrs.className);
    iconType = isBtn ? "button" : "link";
    forceLeaf = true;
    const aText = textPreview || attrs.ariaLabel;
    if (aText) {
      label = isBtn
        ? `Botón ("${truncateString(aText, 22)}")`
        : `Enlace ("${truncateString(aText, 22)}")`;
    } else if (attrs.href && attrs.href !== "#") {
      label = `Enlace (${truncateString(attrs.href, 20)})`;
    } else {
      label = isBtn ? "Botón" : "Enlace";
    }
  } else if (/^h[1-6]$/.test(tag)) {
    iconType = "text";
    forceLeaf = true;
    label = textPreview
      ? `${tag.toUpperCase()} ("${truncateString(textPreview, 24)}")`
      : `Título (${tag.toUpperCase()})`;
  } else if (tag === "p") {
    iconType = "text";
    forceLeaf = true;
    label = textPreview
      ? `Párrafo ("${truncateString(textPreview, 24)}")`
      : "Párrafo";
  } else if (
    /\b(hero-badge|card-badge|promo-tag|spotlight-badge|section-kicker|section-tag)\b/.test(
      attrs.className,
    )
  ) {
    iconType = "badge";
    forceLeaf = true;
    label = textPreview
      ? `Insignia ("${truncateString(textPreview, 20)}")`
      : "Insignia";
  } else if (
    tag === "article" ||
    /\b(card|info-card|stat-card|gallery-item|faq-item|feature-item|spotlight-card|review-card)\b/.test(
      attrs.className,
    )
  ) {
    iconType = "card";
    const cardTitle = findCardTitleText(node, block.htmlTemplate, block.values);
    label = cardTitle
      ? `Tarjeta ("${truncateString(cardTitle, 20)}")`
      : "Tarjeta";
  } else if (tag === "nav") {
    iconType = "container";
    label = "Menú (nav)";
  } else if (tag === "ul" || tag === "ol") {
    iconType = "container";
    label = tag === "ol" ? "Lista ordenada" : "Lista";
  } else if (tag === "li") {
    iconType = "container";
    label = textPreview
      ? `Ítem ("${truncateString(textPreview, 20)}")`
      : "Ítem de lista";
  } else if (tag === "details") {
    iconType = "card";
    const summaryChild = node.children.find(
      (c) => c.tagName.toLowerCase() === "summary",
    );
    const sumText = summaryChild
      ? extractNodeTextPreview(block.htmlTemplate, summaryChild, block.values)
      : "";
    label = sumText
      ? `Pregunta ("${truncateString(sumText, 20)}")`
      : "Pregunta FAQ";
  } else if (tag === "summary") {
    iconType = "text";
    forceLeaf = true;
    label = textPreview
      ? `Pregunta ("${truncateString(textPreview, 22)}")`
      : "Pregunta";
  } else if (
    tag === "span" ||
    tag === "strong" ||
    tag === "em" ||
    tag === "small"
  ) {
  } else if (tag === "hr") {
    iconType = "container";
    forceLeaf = true;
    label = "Separador (Línea)";
  } else {
    iconType = "container";
    if (/\bgrid-columns-2\b/.test(attrs.className)) {
      label = "Grilla (2 Columnas)";
    } else if (/\bgrid-columns-3\b/.test(attrs.className)) {
      label = "Grilla (3 Columnas)";
    } else if (/\bflex-row\b/.test(attrs.className)) {
      label = "Fila Flexible";
    } else if (/\bcontent-container|content-box\b/.test(attrs.className)) {
      label = "Contenedor";
    } else if (/\bgrid-column\b/.test(attrs.className)) {
      label = columnPosition ? `Columna ${columnPosition}` : "Columna";
    } else if (parentNode) {
      const parentAttrs = extractNodeAttributes(block.htmlTemplate, parentNode);
      if (/\bgrid-columns-2|grid-columns-3\b/.test(parentAttrs.className)) {
        label = columnPosition ? `Columna ${columnPosition}` : "Columna";
      } else if (/\bcards-grid|grid|mosaic|gallery-mosaic\b/.test(attrs.className)) {
        label = "Grilla";
      } else if (
        /\b(hero-actions|cta-wrap|btn-group|buttons)\b/.test(attrs.className)
      ) {
        label = "Grupo de Botones";
      } else if (/\bsection-header\b/.test(attrs.className)) {
        label = "Encabezado de Sección";
      } else if (/\b(container|nav-container)\b/.test(attrs.className)) {
        label = "Contenedor (.container)";
      } else if (tag === "header") {
        label = "Encabezado (header)";
      } else if (tag === "footer") {
        label = "Pie de página (footer)";
      } else if (attrs.className) {
        const firstCls = attrs.className.trim().split(/\s+/)[0];
        label = `${tag}.${firstCls}`;
      } else {
        label = tag;
      }
    } else if (/\bcards-grid|grid|mosaic|gallery-mosaic\b/.test(attrs.className)) {
      label = "Grilla";
    } else if (
      /\b(hero-actions|cta-wrap|btn-group|buttons)\b/.test(attrs.className)
    ) {
      label = "Grupo de Botones";
    } else if (/\bsection-header\b/.test(attrs.className)) {
      label = "Encabezado de Sección";
    } else if (/\b(container|nav-container)\b/.test(attrs.className)) {
      label = "Contenedor (.container)";
    } else if (tag === "header") {
      label = "Encabezado (header)";
    } else if (tag === "footer") {
      label = "Pie de página (footer)";
    } else if (attrs.className) {
      const firstCls = attrs.className.trim().split(/\s+/)[0];
      label = `${tag}.${firstCls}`;
    } else {
      label = tag;
    }
  }

  const children: LandingSubLayerNode[] = [];
  if (!forceLeaf && node.children.length > 0) {
    const childTagCounts = new Map<string, number>();
    for (const child of node.children) {
      const childTag = child.tagName.toLowerCase();
      const count = (childTagCounts.get(childTag) || 0) + 1;
      childTagCounts.set(childTag, count);
      const childSelector = `${selector} > ${childTag}:nth-of-type(${count})`;
      const childSubLayer = mapAstNodeToSubLayer(
        block,
        child,
        childSelector,
        node,
        count,
      );
      if (childSubLayer) {
        children.push(childSubLayer);
      }
    }
  }

  return {
    id: `${block.id}:${selector}`,
    selector,
    tag,
    label,
    iconType,
    childFieldKeys,
    children,
  };
}

export function buildBlockSubLayerTree(
  block: LandingBlock,
): LandingSubLayerNode[] {
  const ast = parseHtmlTemplateAst(block.htmlTemplate);
  if (!ast || ast.length === 0) return [];

  const tagCounts = new Map<string, number>();
  const result: LandingSubLayerNode[] = [];

  for (const rootNode of ast) {
    const tag = rootNode.tagName.toLowerCase();
    const count = (tagCounts.get(tag) || 0) + 1;
    tagCounts.set(tag, count);
    const selector = `${tag}:nth-of-type(${count})`;
    const node = mapAstNodeToSubLayer(block, rootNode, selector);
    if (node) {
      result.push(node);
    }
  }

  return result;
}
