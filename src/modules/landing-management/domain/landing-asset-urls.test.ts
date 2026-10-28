import { describe, expect, it } from "vitest";
import { landingPreviewSource } from "./landing-asset-urls";

describe("landingPreviewSource", () => {
  it("previews unpublished restaurant assets through authenticated URLs", () => {
    const source = '<img src="/api/public/landing/site-a/assets/image-a/file"><style>.hero{background:url(/api/public/landing/site-a/assets/image-b/file)}</style>';
    const preview = landingPreviewSource(source, "restaurant-a", "site-a");
    expect(preview).toContain("/api/restaurants/restaurant-a/editor/assets/image-a/file");
    expect(preview).toContain("/api/restaurants/restaurant-a/editor/assets/image-b/file");
    expect(source).toContain("/api/public/landing/site-a/");
  });

  it("preserves external and other restaurant public URLs", () => {
    const source = '<img src="/api/public/landing/site-b/assets/image/file"><img src="https://example.com/photo.jpg">';
    expect(landingPreviewSource(source, "restaurant-a", "site-a")).toBe(source);
  });
});
