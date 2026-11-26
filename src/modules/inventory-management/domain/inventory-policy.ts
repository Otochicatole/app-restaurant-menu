import type {
  InventoryBaseUnit,
  RecipeDisplayUnit,
  StockStatus,
} from "../contracts";

export const baseUnitLabels: Record<InventoryBaseUnit, string> = {
  KG: "kg",
  L: "L",
  U: "u",
};

export const displayUnitLabels: Record<RecipeDisplayUnit, string> = {
  KG: "kg",
  G: "g",
  L: "L",
  ML: "ml",
  U: "u",
};

export function compatibleDisplayUnits(baseUnit: InventoryBaseUnit): RecipeDisplayUnit[] {
  if (baseUnit === "KG") return ["G", "KG"];
  if (baseUnit === "L") return ["ML", "L"];
  return ["U"];
}

export function isCompatibleDisplayUnit(baseUnit: InventoryBaseUnit, displayUnit: RecipeDisplayUnit): boolean {
  return compatibleDisplayUnits(baseUnit).includes(displayUnit);
}

/**
 * Converts a user-entered amount in `displayUnit` to integer milli-units of `baseUnit`.
 * - KG: 1 KG = 1000 milli, 1 G = 1 milli
 * - L:  1 L  = 1000 milli, 1 ML = 1 milli
 * - U:  1 U  = 1000 milli
 */
export function toBaseMilli(
  amount: number,
  baseUnit: InventoryBaseUnit,
  displayUnit: RecipeDisplayUnit = baseUnit,
): number {
  if (!Number.isFinite(amount)) {
    throw new Error("Cantidad inválida.");
  }
  if (!isCompatibleDisplayUnit(baseUnit, displayUnit)) {
    throw new Error(`La unidad ${displayUnitLabels[displayUnit]} no es compatible con ${baseUnitLabels[baseUnit]}.`);
  }
  const factor = displayUnit === "G" || displayUnit === "ML" ? 1 : 1000;
  return Math.round(amount * factor);
}

export function fromBaseMilli(
  milli: number,
  baseUnit: InventoryBaseUnit,
  displayUnit: RecipeDisplayUnit = baseUnit,
): number {
  if (!isCompatibleDisplayUnit(baseUnit, displayUnit)) return milli / 1000;
  const factor = displayUnit === "G" || displayUnit === "ML" ? 1 : 1000;
  return milli / factor;
}

export function formatBaseQuantityMilli(milli: number, baseUnit: InventoryBaseUnit): string {
  const sign = milli < 0 ? "-" : "";
  const abs = Math.abs(milli);
  if (baseUnit === "KG" && abs > 0 && abs < 1000) {
    return `${sign}${abs} g`;
  }
  if (baseUnit === "L" && abs > 0 && abs < 1000) {
    return `${sign}${abs} ml`;
  }
  const value = abs / 1000;
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("es-AR", { maximumFractionDigits: 3 });
  return `${sign}${formatted} ${baseUnitLabels[baseUnit]}`;
}

export function formatIngredientQuantity(quantityMilli: number, displayUnit: RecipeDisplayUnit): string {
  const factor = displayUnit === "G" || displayUnit === "ML" ? 1 : 1000;
  const value = quantityMilli / factor;
  const formatted = Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("es-AR", { maximumFractionDigits: 3 });
  return `${formatted} ${displayUnitLabels[displayUnit]}`;
}

export function computeIngredientDeductionMilli(
  quantityMilli: number,
  portions: number,
  yieldPortions: number,
): number {
  const safeYield = Math.max(1, yieldPortions);
  return Math.max(1, Math.round((quantityMilli * portions) / safeYield));
}

export function computeIngredientCostCents(
  quantityMilli: number,
  unitCostCents: number,
): number {
  return Math.round((quantityMilli * unitCostCents) / 1000);
}

export function evaluateStockStatus(currentStockMilli: number, minStockMilli: number): StockStatus {
  if (currentStockMilli <= 0) return "OUT";
  if (currentStockMilli <= minStockMilli) return "LOW";
  return "OK";
}

export function computeRecipeAvailability(
  yieldPortions: number,
  ingredients: readonly {
    quantityMilli: number;
    currentStockMilli: number;
    minStockMilli: number;
    unitCostCents: number;
  }[],
): {
  totalCostCents: number;
  costPerPortionCents: number;
  availablePortions: number;
  stockStatus: StockStatus;
} {
  const safeYield = Math.max(1, yieldPortions);
  let totalCostCents = 0;
  let availablePortions = ingredients.length === 0 ? 0 : Number.POSITIVE_INFINITY;
  let hasLow = false;
  let hasOut = false;

  for (const ing of ingredients) {
    totalCostCents += computeIngredientCostCents(ing.quantityMilli, ing.unitCostCents);
    const perPortionMilli = ing.quantityMilli / safeYield;
    if (perPortionMilli > 0) {
      const maxFromIng = Math.max(0, Math.floor(ing.currentStockMilli / perPortionMilli));
      availablePortions = Math.min(availablePortions, maxFromIng);
    }
    const status = evaluateStockStatus(ing.currentStockMilli, ing.minStockMilli);
    if (status === "OUT") hasOut = true;
    else if (status === "LOW") hasLow = true;
  }

  const normalizedPortions = Number.isFinite(availablePortions) ? availablePortions : 0;
  const stockStatus: StockStatus =
    hasOut || normalizedPortions === 0 ? "OUT" : hasLow ? "LOW" : "OK";

  return {
    totalCostCents,
    costPerPortionCents: Math.round(totalCostCents / safeYield),
    availablePortions: normalizedPortions,
    stockStatus,
  };
}

export function nextSequentialCode(prefix: string, existingCodes: readonly string[]): string {
  let maxNumber = 0;
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, "i");
  for (const existing of existingCodes) {
    const match = pattern.exec(existing.trim());
    if (match) {
      maxNumber = Math.max(maxNumber, Number(match[1]));
    }
  }
  return `${prefix}-${String(maxNumber + 1).padStart(3, "0")}`;
}
