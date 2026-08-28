import { describe, expect, it } from "vitest";
import { groupUpdateInputSchema, productUpdateInputSchema } from "./contracts";

describe("catalog patch contracts", () => {
  it("does not synthesize omitted group fields", () => {
    expect(groupUpdateInputSchema.parse({ name: "Bebidas" })).toEqual({ name: "Bebidas" });
  });

  it("does not clear a product description during an unrelated patch", () => {
    expect(productUpdateInputSchema.parse({ price: 12 })).toEqual({ price: 12 });
  });
});

