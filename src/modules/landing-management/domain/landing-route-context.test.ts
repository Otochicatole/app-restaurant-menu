import { describe, expect, it } from "vitest";
import { createDefaultLandingDocument } from "./landing-compiler";
import {
  getLandingRouteContext,
  markLandingContext,
  recontextualizeLandingDocument,
  recontextualizeLandingSource,
} from "./landing-route-context";

describe("landing route context", () => {
  const previous = { menuSlug: "old-menu", landingSlug: "old-site" };
  const current = { menuSlug: "new-menu", landingSlug: "new-site" };

  it("updates only the publication's own relative menu, landing and reservation routes", () => {
    const original = markLandingContext('<a href="/m/old-menu#cena">Carta</a><a href="/l/old-site?lang=es">Inicio</a><section data-restaurant-slug="old-site"></section><script>fetch("/api/public/landing/old-site/reservations");</script><style>.photo{background:url(/api/public/menus/old-menu/assets/photo/file)}</style>', previous);
    const result = recontextualizeLandingSource(original, current);
    expect(result).toContain('href="/m/new-menu#cena"');
    expect(result).toContain('href="/l/new-site?lang=es"');
    expect(result).toContain('data-restaurant-slug="new-site"');
    expect(result).toContain('fetch("/api/public/landing/new-site/reservations")');
    expect(result).toContain("url(/api/public/menus/new-menu/assets/photo/file)");
    expect(getLandingRouteContext(result)).toEqual(current);
    expect(original).toContain('href="/m/old-menu#cena"');
  });

  it("preserves external destinations and other restaurants' routes", () => {
    const unrelated = '<a href="https://example.com/m/old-menu">Externa</a><a href="/m/old-menu-extra">Otra carta</a><a href="/m/another">Ajena</a><img src="//cdn.example.com/api/public/landing/old-site/assets/photo/file"><section data-restaurant-slug="another"></section>';
    expect(recontextualizeLandingSource(markLandingContext(unrelated, previous), current)).toContain(unrelated);
  });

  it("infers legacy context from reservation data or a relative API URL", () => {
    const legacy = '<a href="/m/legacy">Carta</a><section data-restaurant-slug="legacy"></section>';
    expect(getLandingRouteContext(legacy)).toEqual({ menuSlug: "legacy", landingSlug: "legacy" });
    expect(recontextualizeLandingSource(legacy, current)).toContain('href="/m/new-menu"');
    expect(getLandingRouteContext('fetch("/api/public/landing/legacy/reservations")')).toEqual({ menuSlug: "legacy", landingSlug: "legacy" });
  });

  it("ignores corrupt or unsafe metadata and keeps one marker after repeated renders", () => {
    expect(getLandingRouteContext("<!--restaurant-landing-context:%broken-->plain")).toBeNull();
    expect(getLandingRouteContext(markLandingContext("plain", { menuSlug: "../unsafe", landingSlug: "valid" }))).toBeNull();
    expect(getLandingRouteContext("<!--restaurant-landing-context:null-->plain")).toBeNull();
    const first = recontextualizeLandingSource("<main>Contenido</main>", current);
    expect(recontextualizeLandingSource(first, current)).toBe(first);
  });

  it("recontextualizes an editable document copy while preserving its stored draft", () => {
    const stored = createDefaultLandingDocument("Resto", previous.landingSlug, previous.menuSlug);
    stored.globalCss = '.photo{background:url("/api/public/landing/old-site/assets/photo/file")}';
    const copy = recontextualizeLandingDocument(stored, previous, current);
    expect(JSON.stringify(copy)).toContain("/m/new-menu");
    expect(copy.globalCss).toContain("/api/public/landing/new-site/assets/photo/file");
    expect(JSON.stringify(stored)).toContain("/m/old-menu");
    expect(copy.blocks[0]).not.toBe(stored.blocks[0]);
  });
});
