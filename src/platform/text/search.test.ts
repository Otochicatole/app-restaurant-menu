import { describe, expect, it } from "vitest";
import { matchesNormalizedSearch, normalizeSearchText } from "./search";

describe("search normalization", () => {
  it("strips accents, commas, punctuation, and extra spaces", () => {
    expect(normalizeSearchText("Café con Leche, 500ml (Grande)!")).toBe("cafe con leche 500ml grande");
    expect(normalizeSearchText("  Jamón, Queso - Muzzarella  ")).toBe("jamon queso muzzarella");
  });

  it("matches across fields regardless of accents, punctuation, or word order", () => {
    expect(matchesNormalizedSearch("cafe, leche", ["Café con Leche"])).toBe(true);
    expect(matchesNormalizedSearch("jamon y queso", ["Empanada de jamón, y queso"])).toBe(true);
    expect(matchesNormalizedSearch("molinos 001", ["INS-001", "Harina 000", "Molinos del Sur"])).toBe(true);
    expect(matchesNormalizedSearch("cerveza roja", ["Cerveza IPA"])).toBe(false);
    expect(matchesNormalizedSearch("   ", ["Cualquier cosa"])).toBe(true);
  });
});
