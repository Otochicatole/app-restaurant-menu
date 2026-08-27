import { describe, expect, it } from "vitest";
import { tenantSlugSchema } from "./tenant.schema";

describe("tenant slug", () => {
  it("accepts stable public slugs", () => {
    expect(tenantSlugSchema.parse("Mi-Restaurante")).toBe("mi-restaurante");
  });

  it("rejects paths and reserved punctuation", () => {
    expect(() => tenantSlugSchema.parse("../admin")).toThrow();
    expect(() => tenantSlugSchema.parse("mi restaurante")).toThrow();
  });
});
