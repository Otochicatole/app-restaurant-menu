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

export function compileLandingDocument({
  htmlContent,
  cssContent,
  jsContent,
  title = "Restaurante",
}: CompileLandingInput): string {
  const safeCss = sanitizeInlineStyle(cssContent);
  const safeJs = sanitizeInlineScript(jsContent);
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

    if (safeJs.trim()) {
      const scriptTag = `<script id="custom-landing-js">\n${safeJs}\n</script>`;
      if (/<\/body>/i.test(result)) {
        result = result.replace(/<\/body>/i, `${scriptTag}\n</body>`);
      } else {
        result = `${result}\n${scriptTag}`;
      }
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
}`;
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
  if (values.__textColor?.trim()) {
    styles.push(`color: ${values.__textColor.trim()} !important`);
  }
  if (values.__paddingY?.trim()) {
    styles.push(
      `padding-top: ${values.__paddingY.trim()} !important; padding-bottom: ${values.__paddingY.trim()} !important`,
    );
  }
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
    if (tag === 'article' || /\\b(card|info-card|stat-card|spotlight-card|review-card)\\b/.test(cls)) return 'Tarjeta';
    if (tag === 'figure' || /\\bgallery-item\\b/.test(cls)) return 'Foto de Galería';
    if (tag === 'details' || /\\bfaq-item\\b/.test(cls)) return 'Pregunta FAQ';
    if (tag === 'summary') return 'Pregunta';
    if (/\\bfeature-item\\b/.test(cls)) return 'Ítem de Lista';
    if (/\\b(hero-badge|card-badge|promo-tag|spotlight-badge|section-kicker|section-tag)\\b/.test(cls)) return 'Insignia';
    if (/\\b(cards-grid|info-grid|gallery-mosaic|stats-strip-grid)\\b/.test(cls)) return 'Grilla';
    if (/\\b(hero-actions|section-cta-wrap|footer-links)\\b/.test(cls)) return 'Grupo de Botones';
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

  function resolveSelectableSubElement(target, blockEl) {
    if (!target || !blockEl || target === blockEl) return null;
    var el = target.nodeType === 1 ? target : target.parentElement;
    if (!el || !blockEl.contains(el) || el === blockEl) return null;

    var fieldWrapper = closestEl(el, '[data-landing-field]');
    if (fieldWrapper && fieldWrapper.parentElement && blockEl.contains(fieldWrapper.parentElement)) {
      el = fieldWrapper.parentElement;
    }

    var interactiveParent = closestEl(el, 'a, button');
    if (interactiveParent && blockEl.contains(interactiveParent)) {
      el = interactiveParent;
    }

    if (el === blockEl) return null;
    if (el.parentElement === blockEl) return null;
    var cls = el.className && typeof el.className === 'string' ? el.className : '';
    if (/\\bcontainer\\b/.test(cls) && el.parentElement && el.parentElement.parentElement === blockEl) {
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

  document.addEventListener('click', function(e) {
    if (closestEl(e.target, '#__landing-editor-toolbar')) return;
    var link = closestEl(e.target, 'a');
    if (link) {
      e.preventDefault();
    }
    if (document.documentElement.getAttribute('data-preview-mode') === 'true') return;
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

  const htmlParts: string[] = [];
  const cssParts: string[] = [buildThemeBaseCss(document.theme)];
  const subStyleCssParts: string[] = [];
  const seenCss = new Set<string>();
  const jsParts: string[] = [];

  for (const block of visibleBlocks) {
    const wrapperStyle = buildBlockWrapperStyle(block.values);
    const styleAttr = wrapperStyle ? ` style="${escapeHtml(wrapperStyle)}"` : "";
    const selectedAttr =
      options?.interactiveEditor && options?.selectedBlockId === block.id
        ? ' data-selected="true"'
        : "";
    htmlParts.push(
      `<div data-landing-block="${escapeHtml(block.id)}" data-module-key="${escapeHtml(block.moduleKey)}" data-block-label="${escapeHtml(block.name)}"${selectedAttr}${styleAttr}>\n${interpolateBlockHtml(block, context, { interactiveEditor: options?.interactiveEditor })}\n</div>`,
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
  | "image"
  | "heading"
  | "text"
  | "badge"
  | "card";

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
  }

  const ast = parseHtmlTemplateAst(block.htmlTemplate);
  let insertOffset = block.htmlTemplate.length;

  if (targetSelector) {
    const found = findAstNodeByRelativeSelector(ast, targetSelector);
    if (found) {
      const containerTags = new Set(["div", "section", "article", "header", "footer", "nav", "figure", "details"]);
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
  } else if (ast.length > 0) {
    const rootNode = ast[0]!;
    const firstContainer =
      rootNode.children.find((c) => c.tagName === "div") ?? rootNode;
    insertOffset = firstContainer.innerEndOffset;
  }

  const nextHtmlTemplate =
    block.htmlTemplate.slice(0, insertOffset) +
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
