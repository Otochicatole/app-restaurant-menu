/**
 * Pure domain logic for compiling landing page documents (visual modular blocks or raw code)
 * into standalone HTML, CSS, and JS artifacts.
 * Adheres to framework-free architecture rule.
 */

import type {
  LandingBlock,
  LandingDocumentV1,
  LandingModuleField,
  LandingTheme,
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
  const safeRestaurantName = escapeHtml(context.restaurantName.trim() || "Nuestro Restaurante");
  const menuUrl = `/m/${context.restaurantSlug}`;
  const isInteractive = Boolean(options?.interactiveEditor);

  const resolveTokens = (raw: string): string =>
    raw
      .replace(/\{\{\s*restaurantName\s*\}\}/g, safeRestaurantName)
      .replace(/\{\{\s*menuUrl\s*\}\}/g, menuUrl);

  const replaceToken = (key: string, insideTag: boolean): string => {
    if (key === "restaurantName") return safeRestaurantName;
    if (key === "menuUrl") return menuUrl;
    const rawVal = block.values[key] ?? block.fields.find((f) => f.key === key)?.defaultValue ?? "";
    const escaped = escapeHtml(resolveTokens(rawVal));
    if (isInteractive && !insideTag) {
      return `<span data-landing-field="${escapeHtml(key)}" contenteditable="true" spellcheck="false">${escaped}</span>`;
    }
    return escaped;
  };

  return block.htmlTemplate
    .split(/(<[^>]+>)/g)
    .map((segment) => {
      const insideTag = segment.startsWith("<") && segment.endsWith(">");
      return segment.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) =>
        replaceToken(key, insideTag),
      );
    })
    .join("");
}

function buildBlockWrapperStyle(values: Record<string, string>): string {
  const styles: string[] = [];
  if (values.__bgColor?.trim()) {
    styles.push(`background-color: ${values.__bgColor.trim()} !important`);
  }
  if (values.__textColor?.trim()) {
    styles.push(`color: ${values.__textColor.trim()} !important`);
  }
  if (values.__paddingY?.trim()) {
    styles.push(`padding-top: ${values.__paddingY.trim()} !important; padding-bottom: ${values.__paddingY.trim()} !important`);
  }
  if (values.__textAlign?.trim()) {
    styles.push(`text-align: ${values.__textAlign.trim()}`);
  }
  if (values.__borderWidth?.trim() && values.__borderWidth.trim() !== "0px") {
    styles.push(`border: ${values.__borderWidth.trim()} solid ${values.__borderColor?.trim() || "rgba(255,255,255,0.15)"}`);
  }
  if (values.__borderRadius?.trim() && values.__borderRadius.trim() !== "0px") {
    styles.push(`border-radius: ${values.__borderRadius.trim()}; overflow: hidden`);
  }
  return styles.join("; ");
}

function buildInteractiveEditorAssets(selectedBlockId?: string | null): { css: string; js: string } {
  const css = `
/* Editor Visual Interactivo (Framely / OpenPage Bridge) */
html {
  scroll-behavior: auto !important;
}
[data-landing-block] {
  position: relative;
  transition: outline 0.14s ease, box-shadow 0.14s ease;
  cursor: pointer;
}
html:not([data-preview-mode="true"]) [data-landing-block]:hover {
  outline: 1.5px dashed rgba(59, 130, 246, 0.85);
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
html:not([data-preview-mode="true"]) [data-landing-block][data-selected="true"]::before {
  background: #2563eb;
  border-color: #1d4ed8;
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
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  var toolbar = document.createElement('div');
  toolbar.id = '__landing-editor-toolbar';
  toolbar.innerHTML = [
    '<span class="__toolbar-label" id="__toolbar-block-name">Bloque</span>',
    '<button type="button" data-action="move-up" title="Subir bloque">↑</button>',
    '<button type="button" data-action="move-down" title="Bajar bloque">↓</button>',
    '<button type="button" data-action="duplicate" title="Duplicar">⧉ Duplicar</button>',
    '<button type="button" data-action="code" title="Editar HTML/CSS/JS">&lt;/&gt; Código</button>',
    '<button type="button" data-action="delete" data-danger="true" title="Eliminar bloque">🗑</button>'
  ].join('');
  document.body.appendChild(toolbar);
  var toolbarLabel = document.getElementById('__toolbar-block-name');

  function closestEl(target, selector) {
    var el = target && target.nodeType === 1 ? target : (target && target.parentElement ? target.parentElement : null);
    return el && el.closest ? el.closest(selector) : null;
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

  function positionToolbar(el) {
    if (!el || document.documentElement.getAttribute('data-preview-mode') === 'true') {
      toolbar.style.display = 'none';
      return;
    }
    var rect = el.getBoundingClientRect();
    if (rect.bottom < 28 || rect.top > window.innerHeight - 20) {
      toolbar.style.display = 'none';
      return;
    }
    if (toolbarLabel) {
      toolbarLabel.textContent = el.getAttribute('data-block-label') || 'Bloque';
    }
    toolbar.style.display = 'flex';
    var topPos;
    if (rect.top >= 42) {
      topPos = rect.top - 36;
    } else if (rect.height < 110 && rect.bottom + 38 < window.innerHeight) {
      topPos = rect.bottom + 6;
    } else {
      topPos = Math.max(8, rect.top + 8);
    }
    var rightPos = Math.max(12, window.innerWidth - rect.right + 10);
    toolbar.style.top = topPos + 'px';
    toolbar.style.right = rightPos + 'px';
  }

  function applySelection(blockId) {
    currentSelectedId = blockId;
    var blocks = document.querySelectorAll('[data-landing-block]');
    var activeEl = null;
    blocks.forEach(function(b) {
      if (b.getAttribute('data-landing-block') === blockId) {
        b.setAttribute('data-selected', 'true');
        activeEl = b;
      } else {
        b.removeAttribute('data-selected');
      }
    });
    positionToolbar(activeEl);
  }

  neutralizeLinks();
  runDynamicHelpers();
  applySelection(currentSelectedId);

  window.addEventListener('scroll', function() {
    window.parent.postMessage({
      type: 'LANDING_SCROLL_SYNC',
      scrollY: window.scrollY || document.documentElement.scrollTop || 0
    }, '*');
    if (!currentSelectedId) return;
    var el = document.querySelector('[data-landing-block="' + currentSelectedId + '"]');
    positionToolbar(el);
  }, { passive: true });

  window.addEventListener('resize', function() {
    if (!currentSelectedId) return;
    var el = document.querySelector('[data-landing-block="' + currentSelectedId + '"]');
    positionToolbar(el);
  });

  toolbar.addEventListener('mousedown', function(e) {
    e.stopPropagation();
  });

  toolbar.addEventListener('click', function(e) {
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
    if (blockEl) {
      var id = blockEl.getAttribute('data-landing-block');
      applySelection(id);
      window.parent.postMessage({ type: 'LANDING_SELECT_BLOCK', blockId: id }, '*');
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
      applySelection(id);
      window.parent.postMessage({ type: 'LANDING_SELECT_BLOCK', blockId: id }, '*');
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
    // Sync duplicate occurrences of the same variable inside the same block immediately
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
      applySelection(e.data.blockId);
      if (e.data.scrollIntoView && e.data.blockId) {
        var target = document.querySelector('[data-landing-block="' + e.data.blockId + '"]');
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
      applySelection(e.data.blockId || null);
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
      if (!e.data.skipDomHtmlUpdate && typeof e.data.htmlContent === 'string') {
        var rootEl = document.getElementById('__landing-blocks-root');
        if (rootEl) {
          rootEl.innerHTML = e.data.htmlContent;
        }
        neutralizeLinks();
        runDynamicHelpers();
        applySelection(e.data.selectedBlockId || null);
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
        applySelection(e.data.selectedBlockId || currentSelectedId);
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

    const trimmedJs = block.jsTemplate.trim();
    if (trimmedJs) {
      jsParts.push(`// Módulo: ${block.name}\n(function() {\n${trimmedJs}\n})();`);
    }
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
      const inferredType =
        /url|href|link/i.test(key)
          ? "url"
          : /color/i.test(key)
          ? "color"
          : /desc|text|quote|subtitle|paragraph/i.test(key)
          ? "textarea"
          : "text";
      const defaultValue = inferredType === "url" ? "#" : humanized;
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
