import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";

export const inventoryBaseUnitSchema = z.enum(["KG", "L", "U"]);
export type InventoryBaseUnit = z.infer<typeof inventoryBaseUnitSchema>;

export const recipeDisplayUnitSchema = z.enum(["KG", "G", "L", "ML", "U"]);
export type RecipeDisplayUnit = z.infer<typeof recipeDisplayUnitSchema>;

export const inventoryMovementKindSchema = z.enum([
  "PURCHASE_IN",
  "SALE_CONSUMPTION",
  "SALE_REVERSAL",
  "RECIPE_PREPARATION",
  "MANUAL_ADJUSTMENT",
]);
export type InventoryMovementKind = z.infer<typeof inventoryMovementKindSchema>;

export const catalogProposalSourceKindSchema = z.enum(["RECIPE", "INVENTORY_ITEM"]);
export type CatalogProposalSourceKind = z.infer<typeof catalogProposalSourceKindSchema>;

export const catalogProposalStatusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export type CatalogProposalStatus = z.infer<typeof catalogProposalStatusSchema>;

export const inventoryStationSchema = z.enum(["KITCHEN", "BAR"]);
export type InventoryStation = z.infer<typeof inventoryStationSchema>;

export type StockStatus = "OK" | "LOW" | "OUT";

const id = z.string().trim().min(1).max(128);
const code = z.string().trim().max(40);
const shortText = z.string().trim().min(1).max(120);
const optionalNote = z.string().trim().max(400).default("");
const nonNegativeInt = z.number().int().min(0).max(2_147_483_647);
const positiveInt = z.number().int().min(1).max(2_147_483_647);

export const recipeIngredientInputSchema = z.object({
  inventoryItemId: id,
  amount: z.number().positive().max(1_000_000),
  displayUnit: recipeDisplayUnitSchema,
});
export type RecipeIngredientInput = z.infer<typeof recipeIngredientInputSchema>;

export const inventoryCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save-supplier"),
    id: id.optional(),
    name: shortText,
    contactName: z.string().trim().max(120).default(""),
    phone: z.string().trim().max(40).default(""),
    email: z.string().trim().max(120).default(""),
    notes: optionalNote,
    active: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("archive-supplier"),
    id,
  }),
  z.object({
    action: z.literal("save-item"),
    id: id.optional(),
    code: code.optional(),
    name: shortText,
    unit: inventoryBaseUnitSchema,
    unitCostCents: nonNegativeInt,
    initialStock: z.number().min(0).max(1_000_000).optional(),
    minStock: z.number().min(0).max(1_000_000).default(0),
    isDirectSale: z.boolean().default(false),
    supplierId: id.nullable().optional(),
  }),
  z.object({
    action: z.literal("archive-item"),
    id,
  }),
  z.object({
    action: z.literal("record-purchase"),
    inventoryItemId: id,
    quantity: z.number().positive().max(1_000_000),
    displayUnit: recipeDisplayUnitSchema.optional(),
    unitCostCents: nonNegativeInt.optional(),
    supplierId: id.nullable().optional(),
    notes: optionalNote,
  }),
  z.object({
    action: z.literal("adjust-stock"),
    inventoryItemId: id,
    delta: z.number().min(-1_000_000).max(1_000_000).refine((value) => value !== 0, "Ingresá una variación distinta de cero."),
    displayUnit: recipeDisplayUnitSchema.optional(),
    notes: z.string().trim().min(1, "Indicá el motivo del ajuste.").max(400),
  }),
  z.object({
    action: z.literal("save-recipe"),
    id: id.optional(),
    code: code.optional(),
    name: shortText,
    yieldPortions: z.number().int().min(1).max(1000).default(1),
    notes: optionalNote,
    ingredients: z.array(recipeIngredientInputSchema).min(1, "Agregá al menos un ingrediente.").max(80),
  }),
  z.object({
    action: z.literal("archive-recipe"),
    id,
  }),
  z.object({
    action: z.literal("prepare-recipe"),
    recipeId: id,
    portions: z.number().int().min(1).max(1000),
    notes: optionalNote,
  }),
  z.object({
    action: z.literal("submit-proposal"),
    sourceKind: catalogProposalSourceKindSchema,
    sourceId: id,
    proposedName: shortText.optional(),
    suggestedPriceCents: positiveInt.optional(),
    suggestedStation: inventoryStationSchema.default("KITCHEN"),
  }),
  z.object({
    action: z.literal("reject-proposal"),
    proposalId: id,
    reason: z.string().trim().max(300).optional(),
  }),
]);

export type InventoryCommand = z.infer<typeof inventoryCommandSchema>;

export type SupplierView = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  notes: string;
  active: boolean;
  itemCount: number;
};

export type InventoryItemView = {
  id: string;
  code: string;
  name: string;
  unit: InventoryBaseUnit;
  unitCostCents: number;
  currentStockMilli: number;
  minStockMilli: number;
  stockStatus: StockStatus;
  isDirectSale: boolean;
  supplierId: string | null;
  supplierName: string | null;
  active: boolean;
  linkedProductId: string | null;
  pendingProposalId: string | null;
};

export type RecipeIngredientView = {
  id: string;
  inventoryItemId: string;
  itemCode: string;
  itemName: string;
  itemUnit: InventoryBaseUnit;
  quantityMilli: number;
  displayUnit: RecipeDisplayUnit;
  currentStockMilli: number;
  unitCostCents: number;
  ingredientCostCents: number;
};

export type RecipeView = {
  id: string;
  code: string;
  name: string;
  yieldPortions: number;
  notes: string;
  active: boolean;
  totalCostCents: number;
  costPerPortionCents: number;
  availablePortions: number;
  stockStatus: StockStatus;
  ingredients: RecipeIngredientView[];
  linkedProductId: string | null;
  pendingProposalId: string | null;
};

export type InventoryMovementView = {
  id: string;
  inventoryItemId: string;
  itemCode: string;
  itemName: string;
  itemUnit: InventoryBaseUnit;
  kind: InventoryMovementKind;
  deltaMilli: number;
  balanceMilli: number;
  unitCostCents: number | null;
  supplierName: string | null;
  recipeName: string | null;
  referenceLabel: string;
  notes: string;
  actorId: string;
  createdAt: string;
};

export type CatalogProposalView = {
  id: string;
  sourceKind: CatalogProposalSourceKind;
  recipeId: string | null;
  inventoryItemId: string | null;
  sourceCode: string;
  sourceName: string;
  proposedName: string;
  suggestedPriceCents: number | null;
  suggestedStation: InventoryStation;
  estimatedCostCents: number;
  ingredientSummary: string[];
  status: CatalogProposalStatus;
  rejectionReason: string | null;
  approvedProductId: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type StockAlertView = {
  inventoryItemId: string;
  code: string;
  name: string;
  unit: InventoryBaseUnit;
  currentStockMilli: number;
  minStockMilli: number;
  status: Exclude<StockStatus, "OK">;
  supplierName: string | null;
};

export type StockWarningView = {
  inventoryItemId: string;
  itemName: string;
  unit: InventoryBaseUnit;
  requiredMilli: number;
  availableBeforeMilli: number;
  balanceAfterMilli: number;
  minStockMilli: number;
  kind: "INSUFFICIENT" | "LOW_STOCK";
};

export type InventorySnapshot = {
  suppliers: SupplierView[];
  items: InventoryItemView[];
  recipes: RecipeView[];
  movements: InventoryMovementView[];
  proposals: CatalogProposalView[];
  alerts: StockAlertView[];
};

export type OrderStockConsumptionLine = {
  orderLineId: string;
  productId: string;
  productName: string;
  quantity: number;
};

export type ServiceStockPort = {
  consumeForOrderLines: (
    tx: Prisma.TransactionClient,
    restaurantId: string,
    actorId: string,
    referenceLabel: string,
    lines: OrderStockConsumptionLine[],
  ) => Promise<StockWarningView[]>;
  syncCancelledOrderLine: (
    tx: Prisma.TransactionClient,
    restaurantId: string,
    actorId: string,
    referenceLabel: string,
    params: {
      orderLineId: string;
      productId: string;
      previousCancelledQuantity: number;
      nextCancelledQuantity: number;
    },
  ) => Promise<void>;
};
