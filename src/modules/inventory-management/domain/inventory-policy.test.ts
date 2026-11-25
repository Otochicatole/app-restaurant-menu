import { describe, expect, it } from "vitest";
import {
  computeIngredientCostCents,
  computeIngredientDeductionMilli,
  computeRecipeAvailability,
  evaluateStockStatus,
  formatBaseQuantityMilli,
  formatIngredientQuantity,
  isCompatibleDisplayUnit,
  nextSequentialCode,
  toBaseMilli,
} from "./inventory-policy";

describe("inventory-policy", () => {
  it("converts kg/g, L/ml, and units cleanly to integer milli-units", () => {
    expect(toBaseMilli(200, "KG", "G")).toBe(200);
    expect(toBaseMilli(1.5, "KG", "KG")).toBe(1500);
    expect(toBaseMilli(250, "L", "ML")).toBe(250);
    expect(toBaseMilli(2, "U", "U")).toBe(2000);
    expect(isCompatibleDisplayUnit("KG", "G")).toBe(true);
    expect(isCompatibleDisplayUnit("KG", "ML")).toBe(false);
    expect(() => toBaseMilli(100, "KG", "ML")).toThrow();
  });

  it("formats quantities in base and display units", () => {
    expect(formatBaseQuantityMilli(200, "KG")).toBe("200 g");
    expect(formatBaseQuantityMilli(1500, "KG")).toBe("1,5 kg");
    expect(formatBaseQuantityMilli(350, "L")).toBe("350 ml");
    expect(formatBaseQuantityMilli(3000, "U")).toBe("3 u");
    expect(formatIngredientQuantity(200, "G")).toBe("200 g");
    expect(formatIngredientQuantity(2000, "U")).toBe("2 u");
  });

  it("computes recipe deduction proportionally by yieldPortions and recipe costs", () => {
    // 200g flour + 2 eggs for 1 portion, 3 portions ordered -> 600g flour + 6 eggs
    expect(computeIngredientDeductionMilli(200, 3, 1)).toBe(600);
    expect(computeIngredientDeductionMilli(2000, 3, 1)).toBe(6000);

    // Recipe yields 4 portions using 1 kg ($2.000/kg) and 4 eggs ($300/u) -> total $3.200, per portion $800
    const summary = computeRecipeAvailability(4, [
      { quantityMilli: 1000, currentStockMilli: 2500, minStockMilli: 500, unitCostCents: 200_000 },
      { quantityMilli: 4000, currentStockMilli: 6000, minStockMilli: 2000, unitCostCents: 30_000 },
    ]);
    expect(summary.totalCostCents).toBe(320_000);
    expect(summary.costPerPortionCents).toBe(80_000);
    expect(summary.availablePortions).toBe(6); // limited by 6 eggs (1 egg/portion)
    expect(summary.stockStatus).toBe("OK");
    expect(computeIngredientCostCents(200, 150_000)).toBe(30_000);
  });

  it("detects LOW and OUT stock thresholds and generates sequential codes", () => {
    expect(evaluateStockStatus(0, 500)).toBe("OUT");
    expect(evaluateStockStatus(500, 500)).toBe("LOW");
    expect(evaluateStockStatus(501, 500)).toBe("OK");
    expect(nextSequentialCode("INS", ["INS-001", "INS-009"])).toBe("INS-010");
    expect(nextSequentialCode("REC", [])).toBe("REC-001");
  });
});
