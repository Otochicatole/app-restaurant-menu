import { describe, expect, it } from "vitest";
import { assertCompleteProductOrder, CatalogRuleViolation } from "./catalog-rules";

describe("assertCompleteProductOrder", () => {
  it("accepts the complete group in a different order", () => {
    expect(() => assertCompleteProductOrder(["a", "b", "c"], ["c", "a", "b"])).not.toThrow();
  });

  it("rejects duplicate product identifiers", () => {
    expect(() => assertCompleteProductOrder(["a", "b"], ["a", "a"])).toThrow(CatalogRuleViolation);
  });

  it("rejects a subset of the selected group", () => {
    expect(() => assertCompleteProductOrder(["a", "b", "c"], ["a", "b"])).toThrow(
      "La lista debe contener todos los productos del grupo",
    );
  });

  it("rejects identifiers from another group", () => {
    expect(() => assertCompleteProductOrder(["a", "b"], ["a", "foreign"])).toThrow(
      "La lista de productos no coincide con el grupo seleccionado",
    );
  });
});

