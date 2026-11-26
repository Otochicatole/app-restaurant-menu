import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "@/platform/application/errors";
import { withSqliteTransaction } from "@/platform/database/sqlite-transaction";
import type {
  CatalogProposalSourceKind,
  CatalogProposalStatus,
  CatalogProposalView,
  InventoryBaseUnit,
  InventoryCommand,
  InventoryItemView,
  InventoryMovementKind,
  InventoryMovementView,
  InventorySnapshot,
  InventoryStation,
  OrderStockConsumptionLine,
  RecipeDisplayUnit,
  RecipeIngredientView,
  RecipeView,
  ServiceStockPort,
  StockAlertView,
  StockWarningView,
  SupplierView,
} from "../contracts";
import {
  computeIngredientCostCents,
  computeIngredientDeductionMilli,
  computeRecipeAvailability,
  evaluateStockStatus,
  nextSequentialCode,
  toBaseMilli,
} from "../domain/inventory-policy";

type Database = PrismaClient | Prisma.TransactionClient;
type Command<Action extends InventoryCommand["action"]> = Extract<InventoryCommand, { action: Action }>;

export type InventoryExecutionResult = {
  snapshot: InventorySnapshot;
  warnings: StockWarningView[];
};

const supplierInclude = {
  _count: { select: { items: { where: { active: true } } } },
} satisfies Prisma.SupplierInclude;

const itemInclude = {
  supplier: { select: { id: true, name: true } },
  serviceProducts: { where: { active: true }, select: { id: true }, take: 1 },
  proposals: { where: { status: "PENDING" }, select: { id: true }, take: 1 },
} satisfies Prisma.InventoryItemInclude;

const recipeInclude = {
  ingredients: {
    include: {
      inventoryItem: {
        select: {
          id: true,
          code: true,
          name: true,
          unit: true,
          unitCostCents: true,
          currentStockMilli: true,
          minStockMilli: true,
        },
      },
    },
    orderBy: [{ inventoryItem: { name: "asc" } }, { id: "asc" }],
  },
  serviceProducts: { where: { active: true }, select: { id: true }, take: 1 },
  proposals: { where: { status: "PENDING" }, select: { id: true }, take: 1 },
} satisfies Prisma.RecipeInclude;

const movementInclude = {
  inventoryItem: { select: { code: true, name: true, unit: true } },
  supplier: { select: { name: true } },
  recipe: { select: { name: true } },
} satisfies Prisma.InventoryMovementInclude;

const proposalInclude = {
  recipe: {
    include: {
      ingredients: {
        include: {
          inventoryItem: {
            select: { name: true, unit: true, unitCostCents: true },
          },
        },
        orderBy: [{ inventoryItem: { name: "asc" } }],
      },
    },
  },
  inventoryItem: {
    select: { code: true, name: true, unit: true, unitCostCents: true },
  },
} satisfies Prisma.CatalogProductProposalInclude;

async function ensureRestaurantExists(tx: Database, restaurantId: string): Promise<void> {
  const restaurant = await tx.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true } });
  if (!restaurant) throw new NotFoundError("Restaurante");
}

function toSupplierView(row: Prisma.SupplierGetPayload<{ include: typeof supplierInclude }>): SupplierView {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contactName,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    active: row.active,
    itemCount: row._count.items,
  };
}

function toItemView(row: Prisma.InventoryItemGetPayload<{ include: typeof itemInclude }>): InventoryItemView {
  const unit = row.unit as InventoryBaseUnit;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    unit,
    unitCostCents: row.unitCostCents,
    currentStockMilli: row.currentStockMilli,
    minStockMilli: row.minStockMilli,
    stockStatus: evaluateStockStatus(row.currentStockMilli, row.minStockMilli),
    isDirectSale: row.isDirectSale,
    supplierId: row.supplierId,
    supplierName: row.supplier?.name ?? null,
    active: row.active,
    linkedProductId: row.serviceProducts[0]?.id ?? null,
    pendingProposalId: row.proposals[0]?.id ?? null,
  };
}

function toRecipeView(row: Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>): RecipeView {
  const ingredients: RecipeIngredientView[] = row.ingredients.map((ing) => ({
    id: ing.id,
    inventoryItemId: ing.inventoryItemId,
    itemCode: ing.inventoryItem.code,
    itemName: ing.inventoryItem.name,
    itemUnit: ing.inventoryItem.unit as InventoryBaseUnit,
    quantityMilli: ing.quantityMilli,
    displayUnit: ing.displayUnit as RecipeDisplayUnit,
    currentStockMilli: ing.inventoryItem.currentStockMilli,
    unitCostCents: ing.inventoryItem.unitCostCents,
    ingredientCostCents: computeIngredientCostCents(ing.quantityMilli, ing.inventoryItem.unitCostCents),
  }));

  const summary = computeRecipeAvailability(
    row.yieldPortions,
    row.ingredients.map((ing) => ({
      quantityMilli: ing.quantityMilli,
      currentStockMilli: ing.inventoryItem.currentStockMilli,
      minStockMilli: ing.inventoryItem.minStockMilli,
      unitCostCents: ing.inventoryItem.unitCostCents,
    })),
  );

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    yieldPortions: row.yieldPortions,
    notes: row.notes,
    active: row.active,
    totalCostCents: summary.totalCostCents,
    costPerPortionCents: summary.costPerPortionCents,
    availablePortions: summary.availablePortions,
    stockStatus: summary.stockStatus,
    ingredients,
    linkedProductId: row.serviceProducts[0]?.id ?? null,
    pendingProposalId: row.proposals[0]?.id ?? null,
  };
}

function toMovementView(row: Prisma.InventoryMovementGetPayload<{ include: typeof movementInclude }>): InventoryMovementView {
  return {
    id: row.id,
    inventoryItemId: row.inventoryItemId,
    itemCode: row.inventoryItem.code,
    itemName: row.inventoryItem.name,
    itemUnit: row.inventoryItem.unit as InventoryBaseUnit,
    kind: row.kind as InventoryMovementKind,
    deltaMilli: row.deltaMilli,
    balanceMilli: row.balanceMilli,
    unitCostCents: row.unitCostCents,
    supplierName: row.supplier?.name ?? null,
    recipeName: row.recipe?.name ?? null,
    referenceLabel: row.referenceLabel,
    notes: row.notes,
    actorId: row.actorId,
    createdAt: row.createdAt.toISOString(),
  };
}

function toProposalView(row: Prisma.CatalogProductProposalGetPayload<{ include: typeof proposalInclude }>): CatalogProposalView {
  const sourceKind = row.sourceKind as CatalogProposalSourceKind;
  let estimatedCostCents = 0;
  let ingredientSummary: string[] = [];
  let sourceCode = "";
  let sourceName = row.proposedName;

  if (sourceKind === "RECIPE" && row.recipe) {
    sourceCode = row.recipe.code;
    sourceName = row.recipe.name;
    const total = row.recipe.ingredients.reduce(
      (sum, ing) => sum + computeIngredientCostCents(ing.quantityMilli, ing.inventoryItem.unitCostCents),
      0,
    );
    estimatedCostCents = Math.round(total / Math.max(1, row.recipe.yieldPortions));
    ingredientSummary = row.recipe.ingredients.map((ing) => {
      const unitLabel = ing.displayUnit.toLowerCase();
      const factor = ing.displayUnit === "G" || ing.displayUnit === "ML" ? 1 : 1000;
      return `${ing.quantityMilli / factor} ${unitLabel} ${ing.inventoryItem.name}`;
    });
  } else if (row.inventoryItem) {
    sourceCode = row.inventoryItem.code;
    sourceName = row.inventoryItem.name;
    estimatedCostCents = row.inventoryItem.unitCostCents;
    ingredientSummary = [`1 ${row.inventoryItem.unit.toLowerCase()} ${row.inventoryItem.name}`];
  }

  return {
    id: row.id,
    sourceKind,
    recipeId: row.recipeId,
    inventoryItemId: row.inventoryItemId,
    sourceCode,
    sourceName,
    proposedName: row.proposedName,
    suggestedPriceCents: row.suggestedPriceCents,
    suggestedStation: (row.suggestedStation === "BAR" ? "BAR" : "KITCHEN") as InventoryStation,
    estimatedCostCents,
    ingredientSummary,
    status: row.status as CatalogProposalStatus,
    rejectionReason: row.rejectionReason,
    approvedProductId: row.approvedProductId,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
  };
}

async function readSnapshot(tx: Database, restaurantId: string): Promise<InventorySnapshot> {
  await ensureRestaurantExists(tx, restaurantId);
  const [supplierRows, itemRows, recipeRows, movementRows, proposalRows] = await Promise.all([
    tx.supplier.findMany({
      where: { restaurantId },
      include: supplierInclude,
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    tx.inventoryItem.findMany({
      where: { restaurantId },
      include: itemInclude,
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    tx.recipe.findMany({
      where: { restaurantId },
      include: recipeInclude,
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    tx.inventoryMovement.findMany({
      where: { restaurantId },
      include: movementInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 120,
    }),
    tx.catalogProductProposal.findMany({
      where: { restaurantId },
      include: proposalInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 100,
    }),
  ]);

  const items = itemRows.map(toItemView);
  const alerts: StockAlertView[] = items
    .filter((item) => item.active && item.stockStatus !== "OK")
    .map((item) => ({
      inventoryItemId: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      currentStockMilli: item.currentStockMilli,
      minStockMilli: item.minStockMilli,
      status: item.stockStatus as Exclude<typeof item.stockStatus, "OK">,
      supplierName: item.supplierName,
    }));

  return {
    suppliers: supplierRows.map(toSupplierView),
    items,
    recipes: recipeRows.map(toRecipeView),
    movements: movementRows.map(toMovementView),
    proposals: proposalRows.map(toProposalView),
    alerts,
  };
}

async function saveSupplier(tx: Prisma.TransactionClient, restaurantId: string, command: Command<"save-supplier">) {
  const data = {
    name: command.name,
    contactName: command.contactName,
    phone: command.phone,
    email: command.email,
    notes: command.notes,
    active: command.active,
  };
  if (!command.id) {
    await tx.supplier.create({ data: { restaurantId, ...data } });
    return;
  }
  const updated = await tx.supplier.updateMany({ where: { id: command.id, restaurantId }, data });
  if (updated.count !== 1) throw new NotFoundError("Proveedor");
}

async function archiveSupplier(tx: Prisma.TransactionClient, restaurantId: string, id: string) {
  const updated = await tx.supplier.updateMany({ where: { id, restaurantId }, data: { active: false } });
  if (updated.count !== 1) throw new NotFoundError("Proveedor");
}

async function resolveSupplierId(tx: Prisma.TransactionClient, restaurantId: string, supplierId?: string | null) {
  if (!supplierId) return null;
  const found = await tx.supplier.findFirst({ where: { id: supplierId, restaurantId }, select: { id: true } });
  if (!found) throw new NotFoundError("Proveedor");
  return found.id;
}

async function resolveUniqueCode(
  tx: Prisma.TransactionClient,
  kind: "item" | "recipe",
  restaurantId: string,
  requestedCode: string | undefined,
  ignoreId?: string,
): Promise<string> {
  const trimmed = requestedCode?.trim() ?? "";
  if (trimmed) {
    const existing = kind === "item"
      ? await tx.inventoryItem.findFirst({
          where: { restaurantId, code: trimmed, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
          select: { id: true },
        })
      : await tx.recipe.findFirst({
          where: { restaurantId, code: trimmed, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
          select: { id: true },
        });
    if (existing) throw new ConflictError(`Ya existe un registro con el código ${trimmed}.`);
    return trimmed;
  }
  const rows = kind === "item"
    ? await tx.inventoryItem.findMany({ where: { restaurantId }, select: { code: true } })
    : await tx.recipe.findMany({ where: { restaurantId }, select: { code: true } });
  return nextSequentialCode(kind === "item" ? "INS" : "REC", rows.map((row) => row.code));
}

async function saveItem(tx: Prisma.TransactionClient, restaurantId: string, actorId: string, command: Command<"save-item">) {
  const supplierId = await resolveSupplierId(tx, restaurantId, command.supplierId);
  const minStockMilli = toBaseMilli(command.minStock, command.unit, command.unit);

  if (!command.id) {
    const code = await resolveUniqueCode(tx, "item", restaurantId, command.code);
    const initialMilli = command.initialStock !== undefined
      ? toBaseMilli(command.initialStock, command.unit, command.unit)
      : 0;
    const created = await tx.inventoryItem.create({
      data: {
        restaurantId,
        code,
        name: command.name,
        unit: command.unit,
        unitCostCents: command.unitCostCents,
        currentStockMilli: initialMilli,
        minStockMilli,
        isDirectSale: command.isDirectSale,
        supplierId,
        active: true,
      },
    });
    if (initialMilli > 0) {
      await tx.inventoryMovement.create({
        data: {
          restaurantId,
          inventoryItemId: created.id,
          kind: "PURCHASE_IN",
          deltaMilli: initialMilli,
          balanceMilli: initialMilli,
          unitCostCents: command.unitCostCents,
          supplierId,
          referenceLabel: "Stock inicial",
          notes: "Alta de producto en inventario",
          actorId,
        },
      });
    }
    return;
  }

  const existing = await tx.inventoryItem.findFirst({
    where: { id: command.id, restaurantId },
    select: { id: true, unit: true, code: true },
  });
  if (!existing) throw new NotFoundError("Producto de inventario");

  const code = command.code?.trim()
    ? await resolveUniqueCode(tx, "item", restaurantId, command.code, existing.id)
    : existing.code;

  await tx.inventoryItem.update({
    where: { id: existing.id },
    data: {
      code,
      name: command.name,
      unit: command.unit,
      unitCostCents: command.unitCostCents,
      minStockMilli,
      isDirectSale: command.isDirectSale,
      supplierId,
      active: true,
    },
  });
}

async function archiveItem(tx: Prisma.TransactionClient, restaurantId: string, id: string) {
  const inUse = await tx.recipeIngredient.findFirst({
    where: { restaurantId, inventoryItemId: id, recipe: { active: true } },
    select: { recipe: { select: { name: true } } },
  });
  if (inUse) {
    throw new ConflictError(`Este producto forma parte de la receta "${inUse.recipe.name}". Quitálo de la receta antes de archivarlo.`);
  }
  const updated = await tx.inventoryItem.updateMany({ where: { id, restaurantId }, data: { active: false } });
  if (updated.count !== 1) throw new NotFoundError("Producto de inventario");
}

async function recordPurchase(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  actorId: string,
  command: Command<"record-purchase">,
) {
  const item = await tx.inventoryItem.findFirst({
    where: { id: command.inventoryItemId, restaurantId, active: true },
    select: { id: true, unit: true, currentStockMilli: true, unitCostCents: true, supplierId: true },
  });
  if (!item) throw new NotFoundError("Producto de inventario activo");
  const baseUnit = item.unit as InventoryBaseUnit;
  const deltaMilli = toBaseMilli(command.quantity, baseUnit, command.displayUnit ?? baseUnit);
  if (deltaMilli <= 0) throw new BadRequestError("La cantidad ingresada debe ser mayor a cero.");

  const supplierId = command.supplierId !== undefined
    ? await resolveSupplierId(tx, restaurantId, command.supplierId)
    : item.supplierId;
  const nextBalance = item.currentStockMilli + deltaMilli;
  const nextCost = command.unitCostCents ?? item.unitCostCents;

  await tx.inventoryItem.update({
    where: { id: item.id },
    data: {
      currentStockMilli: nextBalance,
      unitCostCents: nextCost,
      supplierId,
    },
  });

  await tx.inventoryMovement.create({
    data: {
      restaurantId,
      inventoryItemId: item.id,
      kind: "PURCHASE_IN",
      deltaMilli,
      balanceMilli: nextBalance,
      unitCostCents: nextCost,
      supplierId,
      referenceLabel: "Compra / Entrada",
      notes: command.notes,
      actorId,
    },
  });
}

async function adjustStock(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  actorId: string,
  command: Command<"adjust-stock">,
) {
  const item = await tx.inventoryItem.findFirst({
    where: { id: command.inventoryItemId, restaurantId, active: true },
    select: { id: true, unit: true, currentStockMilli: true },
  });
  if (!item) throw new NotFoundError("Producto de inventario activo");
  const baseUnit = item.unit as InventoryBaseUnit;
  const deltaMilli = toBaseMilli(command.delta, baseUnit, command.displayUnit ?? baseUnit);
  if (deltaMilli === 0) throw new BadRequestError("Indicá una variación distinta de cero.");

  const nextBalance = item.currentStockMilli + deltaMilli;
  await tx.inventoryItem.update({
    where: { id: item.id },
    data: { currentStockMilli: nextBalance },
  });
  await tx.inventoryMovement.create({
    data: {
      restaurantId,
      inventoryItemId: item.id,
      kind: "MANUAL_ADJUSTMENT",
      deltaMilli,
      balanceMilli: nextBalance,
      referenceLabel: "Ajuste manual",
      notes: command.notes,
      actorId,
    },
  });
}

async function saveRecipe(tx: Prisma.TransactionClient, restaurantId: string, command: Command<"save-recipe">) {
  const seen = new Set<string>();
  const itemIds = command.ingredients.map((ing) => {
    if (seen.has(ing.inventoryItemId)) {
      throw new BadRequestError("No repitas el mismo ingrediente dentro de la receta.");
    }
    seen.add(ing.inventoryItemId);
    return ing.inventoryItemId;
  });

  const dbItems = await tx.inventoryItem.findMany({
    where: { restaurantId, active: true, id: { in: itemIds } },
    select: { id: true, unit: true },
  });
  const itemUnitMap = new Map(dbItems.map((item) => [item.id, item.unit as InventoryBaseUnit]));

  const ingredientRows = command.ingredients.map((ing) => {
    const baseUnit = itemUnitMap.get(ing.inventoryItemId);
    if (!baseUnit) throw new NotFoundError("Ingrediente activo de inventario");
    const quantityMilli = toBaseMilli(ing.amount, baseUnit, ing.displayUnit);
    if (quantityMilli <= 0) throw new BadRequestError("La cantidad de cada ingrediente debe ser mayor a cero.");
    return {
      inventoryItem: {
        connect: {
          id_restaurantId: {
            id: ing.inventoryItemId,
            restaurantId,
          },
        },
      },
      quantityMilli,
      displayUnit: ing.displayUnit,
    };
  });

  if (!command.id) {
    const code = await resolveUniqueCode(tx, "recipe", restaurantId, command.code);
    await tx.recipe.create({
      data: {
        restaurantId,
        code,
        name: command.name,
        yieldPortions: command.yieldPortions,
        notes: command.notes,
        active: true,
        ingredients: { create: ingredientRows },
      },
    });
    return;
  }

  const existing = await tx.recipe.findFirst({ where: { id: command.id, restaurantId }, select: { id: true, code: true } });
  if (!existing) throw new NotFoundError("Receta");
  const code = command.code?.trim()
    ? await resolveUniqueCode(tx, "recipe", restaurantId, command.code, existing.id)
    : existing.code;

  await tx.recipe.update({
    where: { id: existing.id },
    data: {
      code,
      name: command.name,
      yieldPortions: command.yieldPortions,
      notes: command.notes,
      active: true,
      ingredients: {
        deleteMany: {},
        create: ingredientRows,
      },
    },
  });
}

async function archiveRecipe(tx: Prisma.TransactionClient, restaurantId: string, id: string) {
  const updated = await tx.recipe.updateMany({ where: { id, restaurantId }, data: { active: false } });
  if (updated.count !== 1) throw new NotFoundError("Receta");
}

async function applyDeduction(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  actorId: string,
  params: {
    inventoryItemId: string;
    requiredMilli: number;
    kind: "SALE_CONSUMPTION" | "RECIPE_PREPARATION";
    recipeId?: string | null;
    orderLineId?: string | null;
    referenceLabel: string;
    notes?: string;
  },
): Promise<StockWarningView | null> {
  const item = await tx.inventoryItem.findFirst({
    where: { id: params.inventoryItemId, restaurantId },
    select: { id: true, name: true, unit: true, currentStockMilli: true, minStockMilli: true },
  });
  if (!item) return null;

  const before = item.currentStockMilli;
  const after = before - params.requiredMilli;
  await tx.inventoryItem.update({
    where: { id: item.id },
    data: { currentStockMilli: after },
  });

  await tx.inventoryMovement.create({
    data: {
      restaurantId,
      inventoryItemId: item.id,
      kind: params.kind,
      deltaMilli: -params.requiredMilli,
      balanceMilli: after,
      recipeId: params.recipeId ?? null,
      orderLineId: params.orderLineId ?? null,
      referenceLabel: params.referenceLabel,
      notes: params.notes ?? "",
      actorId,
    },
  });

  if (before < params.requiredMilli) {
    return {
      inventoryItemId: item.id,
      itemName: item.name,
      unit: item.unit as InventoryBaseUnit,
      requiredMilli: params.requiredMilli,
      availableBeforeMilli: before,
      balanceAfterMilli: after,
      minStockMilli: item.minStockMilli,
      kind: "INSUFFICIENT",
    };
  }
  if (after <= item.minStockMilli) {
    return {
      inventoryItemId: item.id,
      itemName: item.name,
      unit: item.unit as InventoryBaseUnit,
      requiredMilli: params.requiredMilli,
      availableBeforeMilli: before,
      balanceAfterMilli: after,
      minStockMilli: item.minStockMilli,
      kind: "LOW_STOCK",
    };
  }
  return null;
}

async function prepareRecipe(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  actorId: string,
  command: Command<"prepare-recipe">,
): Promise<StockWarningView[]> {
  const recipe = await tx.recipe.findFirst({
    where: { id: command.recipeId, restaurantId, active: true },
    include: { ingredients: true },
  });
  if (!recipe) throw new NotFoundError("Receta activa");

  const warnings: StockWarningView[] = [];
  for (const ing of recipe.ingredients) {
    const requiredMilli = computeIngredientDeductionMilli(ing.quantityMilli, command.portions, recipe.yieldPortions);
    const warning = await applyDeduction(tx, restaurantId, actorId, {
      inventoryItemId: ing.inventoryItemId,
      requiredMilli,
      kind: "RECIPE_PREPARATION",
      recipeId: recipe.id,
      referenceLabel: `Preparación: ${recipe.name} (${command.portions} porciones)`,
      notes: command.notes,
    });
    if (warning) warnings.push(warning);
  }
  return warnings;
}

async function submitProposal(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  actorId: string,
  command: Command<"submit-proposal">,
) {
  if (command.sourceKind === "RECIPE") {
    const recipe = await tx.recipe.findFirst({
      where: { id: command.sourceId, restaurantId, active: true },
      select: { id: true, name: true },
    });
    if (!recipe) throw new NotFoundError("Receta activa");

    const linkedProduct = await tx.serviceProduct.findFirst({
      where: { restaurantId, recipeId: recipe.id, active: true },
      select: { id: true },
    });
    if (linkedProduct) throw new ConflictError("Esta receta ya está aprobada en el Catálogo actual.");

    const existingPending = await tx.catalogProductProposal.findFirst({
      where: { restaurantId, recipeId: recipe.id, status: "PENDING" },
      select: { id: true },
    });
    if (existingPending) throw new ConflictError("Esta receta ya tiene una solicitud pendiente de aprobación.");

    await tx.catalogProductProposal.create({
      data: {
        restaurantId,
        sourceKind: "RECIPE",
        recipeId: recipe.id,
        proposedName: command.proposedName ?? recipe.name,
        suggestedPriceCents: command.suggestedPriceCents ?? null,
        suggestedStation: command.suggestedStation,
        status: "PENDING",
        createdBy: actorId,
      },
    });
    return;
  }

  const item = await tx.inventoryItem.findFirst({
    where: { id: command.sourceId, restaurantId, active: true },
    select: { id: true, name: true, isDirectSale: true },
  });
  if (!item) throw new NotFoundError("Producto de inventario activo");
  if (!item.isDirectSale) {
    throw new BadRequestError("Activá Venta directa en el producto antes de enviarlo al Catálogo.");
  }

  const linkedProduct = await tx.serviceProduct.findFirst({
    where: { restaurantId, inventoryItemId: item.id, active: true },
    select: { id: true },
  });
  if (linkedProduct) throw new ConflictError("Este producto ya está aprobado en el Catálogo actual.");

  const existingPending = await tx.catalogProductProposal.findFirst({
    where: { restaurantId, inventoryItemId: item.id, status: "PENDING" },
    select: { id: true },
  });
  if (existingPending) throw new ConflictError("Este producto ya tiene una solicitud pendiente de aprobación.");

  await tx.catalogProductProposal.create({
    data: {
      restaurantId,
      sourceKind: "INVENTORY_ITEM",
      inventoryItemId: item.id,
      proposedName: command.proposedName ?? item.name,
      suggestedPriceCents: command.suggestedPriceCents ?? null,
      suggestedStation: command.suggestedStation,
      status: "PENDING",
      createdBy: actorId,
    },
  });
}

async function rejectProposal(
  tx: Prisma.TransactionClient,
  restaurantId: string,
  actorId: string,
  command: Command<"reject-proposal">,
) {
  const updated = await tx.catalogProductProposal.updateMany({
    where: { id: command.proposalId, restaurantId, status: "PENDING" },
    data: {
      status: "REJECTED",
      rejectionReason: command.reason?.trim() || "Rechazada desde Catálogo.",
      reviewedBy: actorId,
      reviewedAt: new Date(),
    },
  });
  if (updated.count !== 1) throw new NotFoundError("Solicitud pendiente de aprobación");
}

export class InventoryService {
  constructor(private readonly database: PrismaClient) {}

  async snapshot(restaurantId: string): Promise<InventorySnapshot> {
    return withSqliteTransaction(this.database, (tx) => readSnapshot(tx, restaurantId));
  }

  async execute(restaurantId: string, actorId: string, command: InventoryCommand): Promise<InventoryExecutionResult> {
    return withSqliteTransaction(this.database, async (tx) => {
      await ensureRestaurantExists(tx, restaurantId);
      let warnings: StockWarningView[] = [];
      switch (command.action) {
        case "save-supplier":
          await saveSupplier(tx, restaurantId, command);
          break;
        case "archive-supplier":
          await archiveSupplier(tx, restaurantId, command.id);
          break;
        case "save-item":
          await saveItem(tx, restaurantId, actorId, command);
          break;
        case "archive-item":
          await archiveItem(tx, restaurantId, command.id);
          break;
        case "record-purchase":
          await recordPurchase(tx, restaurantId, actorId, command);
          break;
        case "adjust-stock":
          await adjustStock(tx, restaurantId, actorId, command);
          break;
        case "save-recipe":
          await saveRecipe(tx, restaurantId, command);
          break;
        case "archive-recipe":
          await archiveRecipe(tx, restaurantId, command.id);
          break;
        case "prepare-recipe":
          warnings = await prepareRecipe(tx, restaurantId, actorId, command);
          break;
        case "submit-proposal":
          await submitProposal(tx, restaurantId, actorId, command);
          break;
        case "reject-proposal":
          await rejectProposal(tx, restaurantId, actorId, command);
          break;
      }
      return {
        snapshot: await readSnapshot(tx, restaurantId),
        warnings,
      };
    });
  }
}

export const inventoryStockPort: ServiceStockPort = {
  async consumeForOrderLines(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    actorId: string,
    referenceLabel: string,
    lines: OrderStockConsumptionLine[],
  ): Promise<StockWarningView[]> {
    const productIds = [...new Set(lines.map((line) => line.productId))];
    if (productIds.length === 0) return [];

    const products = await tx.serviceProduct.findMany({
      where: { restaurantId, id: { in: productIds } },
      select: {
        id: true,
        recipeId: true,
        inventoryItemId: true,
        recipe: {
          select: {
            id: true,
            yieldPortions: true,
            ingredients: { select: { inventoryItemId: true, quantityMilli: true } },
          },
        },
      },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));
    const warnings: StockWarningView[] = [];

    for (const line of lines) {
      const product = productMap.get(line.productId);
      if (!product) continue;

      if (product.recipe) {
        for (const ing of product.recipe.ingredients) {
          const requiredMilli = computeIngredientDeductionMilli(
            ing.quantityMilli,
            line.quantity,
            product.recipe.yieldPortions,
          );
          const warning = await applyDeduction(tx, restaurantId, actorId, {
            inventoryItemId: ing.inventoryItemId,
            requiredMilli,
            kind: "SALE_CONSUMPTION",
            recipeId: product.recipe.id,
            orderLineId: line.orderLineId,
            referenceLabel: `${referenceLabel} · ${line.quantity}x ${line.productName}`,
          });
          if (warning) warnings.push(warning);
        }
      } else if (product.inventoryItemId) {
        const requiredMilli = line.quantity * 1000;
        const warning = await applyDeduction(tx, restaurantId, actorId, {
          inventoryItemId: product.inventoryItemId,
          requiredMilli,
          kind: "SALE_CONSUMPTION",
          orderLineId: line.orderLineId,
          referenceLabel: `${referenceLabel} · ${line.quantity}x ${line.productName}`,
        });
        if (warning) warnings.push(warning);
      }
    }

    return warnings;
  },

  async syncCancelledOrderLine(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    actorId: string,
    referenceLabel: string,
    params,
  ): Promise<void> {
    const deltaCancelled = params.nextCancelledQuantity - params.previousCancelledQuantity;
    if (deltaCancelled === 0) return;

    const product = await tx.serviceProduct.findFirst({
      where: { id: params.productId, restaurantId },
      select: {
        id: true,
        name: true,
        inventoryItemId: true,
        recipe: {
          select: {
            id: true,
            yieldPortions: true,
            ingredients: { select: { inventoryItemId: true, quantityMilli: true } },
          },
        },
      },
    });
    if (!product) return;

    const adjustments: { inventoryItemId: string; qtyMilli: number; recipeId: string | null }[] = [];
    if (product.recipe) {
      for (const ing of product.recipe.ingredients) {
        adjustments.push({
          inventoryItemId: ing.inventoryItemId,
          qtyMilli: computeIngredientDeductionMilli(ing.quantityMilli, Math.abs(deltaCancelled), product.recipe.yieldPortions),
          recipeId: product.recipe.id,
        });
      }
    } else if (product.inventoryItemId) {
      adjustments.push({
        inventoryItemId: product.inventoryItemId,
        qtyMilli: Math.abs(deltaCancelled) * 1000,
        recipeId: null,
      });
    }

    const isReversal = deltaCancelled > 0;
    for (const adj of adjustments) {
      const item = await tx.inventoryItem.findFirst({
        where: { id: adj.inventoryItemId, restaurantId },
        select: { id: true, currentStockMilli: true },
      });
      if (!item) continue;
      const signedDelta = isReversal ? adj.qtyMilli : -adj.qtyMilli;
      const nextBalance = item.currentStockMilli + signedDelta;
      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { currentStockMilli: nextBalance },
      });
      await tx.inventoryMovement.create({
        data: {
          restaurantId,
          inventoryItemId: item.id,
          kind: isReversal ? "SALE_REVERSAL" : "SALE_CONSUMPTION",
          deltaMilli: signedDelta,
          balanceMilli: nextBalance,
          recipeId: adj.recipeId,
          orderLineId: params.orderLineId,
          referenceLabel: `${referenceLabel} · ${isReversal ? "Anulación" : "Reactivación"} ${Math.abs(deltaCancelled)}x ${product.name}`,
          actorId,
        },
      });
    }
  },
};
