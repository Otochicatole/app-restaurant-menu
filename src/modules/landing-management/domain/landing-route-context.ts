import type { LandingDocumentV1 } from "../contracts";

export type LandingRouteContext = { menuSlug: string; landingSlug: string };
const marker = /<!--restaurant-landing-context:([\s\S]*?)-->/g;
const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isContext(value: unknown): value is LandingRouteContext {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LandingRouteContext>;
  return typeof candidate.menuSlug === "string" && validSlug.test(candidate.menuSlug)
    && typeof candidate.landingSlug === "string" && validSlug.test(candidate.landingSlug);
}

export function getLandingRouteContext(source: string): LandingRouteContext | null {
  const encoded = [...source.matchAll(marker)][0]?.[1];
  if (encoded) {
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(encoded));
      if (isContext(parsed)) return parsed;
    } catch { /* Older publications may have no readable context marker. */ }
  }
  const legacySlug = /\bdata-restaurant-slug\s*=\s*["']([a-z0-9]+(?:-[a-z0-9]+)*)["']/i.exec(source)?.[1]
    ?? /(?:^|[\s"'`(])\/api\/public\/landing\/([a-z0-9]+(?:-[a-z0-9]+)*)\//.exec(source)?.[1];
  return legacySlug ? { menuSlug: legacySlug, landingSlug: legacySlug } : null;
}

export function markLandingContext(source: string, context: LandingRouteContext): string {
  const content = source.replace(marker, "");
  return `<!--restaurant-landing-context:${encodeURIComponent(JSON.stringify(context))}-->${content}`;
}

function replaceRelativePath(source: string, previous: string, current: string, prefix = false): string {
  const escaped = previous.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundary = prefix ? "" : "(?=$|[\\s\"'`<>?#/)])";
  const pattern = new RegExp("(^|[\\s\"'`(])" + escaped + boundary, "g");
  return source.replace(pattern, (_match, before: string) => before + current);
}

/** Update only this landing's known relative routes; leave external URLs intact. */
export function rewriteLandingRoutes(source: string, previous: LandingRouteContext, current: LandingRouteContext): string {
  let rewritten = replaceRelativePath(source, `/m/${previous.menuSlug}`, `/m/${current.menuSlug}`);
  rewritten = replaceRelativePath(rewritten, `/l/${previous.landingSlug}`, `/l/${current.landingSlug}`);
  rewritten = replaceRelativePath(rewritten, `/api/public/landing/${previous.landingSlug}/`, `/api/public/landing/${current.landingSlug}/`, true);
  rewritten = replaceRelativePath(rewritten, `/api/public/menus/${previous.menuSlug}/`, `/api/public/menus/${current.menuSlug}/`, true);
  return rewritten.replace(/(\bdata-restaurant-slug\s*=\s*)(["'])([^"']*)\2/gi,
    (match, attribute: string, quote: string, slug: string) => slug === previous.landingSlug
      ? `${attribute}${quote}${current.landingSlug}${quote}` : match);
}

export function recontextualizeLandingSource(source: string, current: LandingRouteContext, previous = getLandingRouteContext(source)): string {
  return markLandingContext(previous ? rewriteLandingRoutes(source, previous, current) : source, current);
}

export function recontextualizeLandingDocument(document: LandingDocumentV1, previous: LandingRouteContext, current: LandingRouteContext): LandingDocumentV1 {
  const rewrite = (value: unknown): unknown => {
    if (typeof value === "string") return rewriteLandingRoutes(value, previous, current);
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, rewrite(child)]));
    return value;
  };
  return rewrite(document) as LandingDocumentV1;
}
