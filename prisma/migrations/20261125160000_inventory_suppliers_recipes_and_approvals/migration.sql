PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;

CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Supplier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Supplier_id_restaurantId_key" ON "Supplier"("id", "restaurantId");
CREATE INDEX "Supplier_restaurantId_active_name_idx" ON "Supplier"("restaurantId", "active", "name");

CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'U' CHECK ("unit" IN ('KG', 'L', 'U')),
    "unitCostCents" INTEGER NOT NULL DEFAULT 0 CHECK (typeof("unitCostCents") = 'integer' AND "unitCostCents" >= 0),
    "currentStockMilli" INTEGER NOT NULL DEFAULT 0 CHECK (typeof("currentStockMilli") = 'integer'),
    "minStockMilli" INTEGER NOT NULL DEFAULT 0 CHECK (typeof("minStockMilli") = 'integer' AND "minStockMilli" >= 0),
    "isDirectSale" BOOLEAN NOT NULL DEFAULT false,
    "supplierId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_supplierId_restaurantId_fkey" FOREIGN KEY ("supplierId", "restaurantId") REFERENCES "Supplier" ("id", "restaurantId") ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InventoryItem_id_restaurantId_key" ON "InventoryItem"("id", "restaurantId");
CREATE UNIQUE INDEX "InventoryItem_restaurantId_code_key" ON "InventoryItem"("restaurantId", "code");
CREATE INDEX "InventoryItem_restaurantId_active_name_idx" ON "InventoryItem"("restaurantId", "active", "name");
CREATE INDEX "InventoryItem_restaurantId_supplierId_idx" ON "InventoryItem"("restaurantId", "supplierId");

CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "yieldPortions" INTEGER NOT NULL DEFAULT 1 CHECK (typeof("yieldPortions") = 'integer' AND "yieldPortions" >= 1),
    "notes" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Recipe_id_restaurantId_key" ON "Recipe"("id", "restaurantId");
CREATE UNIQUE INDEX "Recipe_restaurantId_code_key" ON "Recipe"("restaurantId", "code");
CREATE INDEX "Recipe_restaurantId_active_name_idx" ON "Recipe"("restaurantId", "active", "name");

CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantityMilli" INTEGER NOT NULL CHECK (typeof("quantityMilli") = 'integer' AND "quantityMilli" >= 1),
    "displayUnit" TEXT NOT NULL DEFAULT 'U' CHECK ("displayUnit" IN ('KG', 'G', 'L', 'ML', 'U')),
    CONSTRAINT "RecipeIngredient_recipeId_restaurantId_fkey" FOREIGN KEY ("recipeId", "restaurantId") REFERENCES "Recipe" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeIngredient_inventoryItemId_restaurantId_fkey" FOREIGN KEY ("inventoryItemId", "restaurantId") REFERENCES "InventoryItem" ("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RecipeIngredient_recipeId_inventoryItemId_key" ON "RecipeIngredient"("recipeId", "inventoryItemId");
CREATE INDEX "RecipeIngredient_restaurantId_inventoryItemId_idx" ON "RecipeIngredient"("restaurantId", "inventoryItemId");

CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "kind" TEXT NOT NULL CHECK ("kind" IN ('PURCHASE_IN', 'SALE_CONSUMPTION', 'SALE_REVERSAL', 'RECIPE_PREPARATION', 'MANUAL_ADJUSTMENT')),
    "deltaMilli" INTEGER NOT NULL CHECK (typeof("deltaMilli") = 'integer'),
    "balanceMilli" INTEGER NOT NULL CHECK (typeof("balanceMilli") = 'integer'),
    "unitCostCents" INTEGER CHECK ("unitCostCents" IS NULL OR (typeof("unitCostCents") = 'integer' AND "unitCostCents" >= 0)),
    "supplierId" TEXT,
    "recipeId" TEXT,
    "orderLineId" TEXT,
    "referenceLabel" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryMovement_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryMovement_inventoryItemId_restaurantId_fkey" FOREIGN KEY ("inventoryItemId", "restaurantId") REFERENCES "InventoryItem" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryMovement_supplierId_restaurantId_fkey" FOREIGN KEY ("supplierId", "restaurantId") REFERENCES "Supplier" ("id", "restaurantId") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "InventoryMovement_recipeId_restaurantId_fkey" FOREIGN KEY ("recipeId", "restaurantId") REFERENCES "Recipe" ("id", "restaurantId") ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE INDEX "InventoryMovement_restaurantId_createdAt_idx" ON "InventoryMovement"("restaurantId", "createdAt");
CREATE INDEX "InventoryMovement_restaurantId_inventoryItemId_createdAt_idx" ON "InventoryMovement"("restaurantId", "inventoryItemId", "createdAt");
CREATE INDEX "InventoryMovement_orderLineId_idx" ON "InventoryMovement"("orderLineId");

ALTER TABLE "ServiceProduct" ADD COLUMN "recipeId" TEXT;
ALTER TABLE "ServiceProduct" ADD COLUMN "inventoryItemId" TEXT;
CREATE INDEX "ServiceProduct_restaurantId_recipeId_idx" ON "ServiceProduct"("restaurantId", "recipeId");
CREATE INDEX "ServiceProduct_restaurantId_inventoryItemId_idx" ON "ServiceProduct"("restaurantId", "inventoryItemId");

CREATE TABLE "CatalogProductProposal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL CHECK ("sourceKind" IN ('RECIPE', 'INVENTORY_ITEM')),
    "recipeId" TEXT,
    "inventoryItemId" TEXT,
    "proposedName" TEXT NOT NULL,
    "suggestedPriceCents" INTEGER CHECK ("suggestedPriceCents" IS NULL OR (typeof("suggestedPriceCents") = 'integer' AND "suggestedPriceCents" >= 1)),
    "suggestedStation" TEXT NOT NULL DEFAULT 'KITCHEN' CHECK ("suggestedStation" IN ('KITCHEN', 'BAR')),
    "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'APPROVED', 'REJECTED')),
    "rejectionReason" TEXT,
    "approvedProductId" TEXT,
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK (
      ("sourceKind" = 'RECIPE' AND "recipeId" IS NOT NULL AND "inventoryItemId" IS NULL) OR
      ("sourceKind" = 'INVENTORY_ITEM' AND "inventoryItemId" IS NOT NULL AND "recipeId" IS NULL)
    ),
    CONSTRAINT "CatalogProductProposal_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CatalogProductProposal_recipeId_restaurantId_fkey" FOREIGN KEY ("recipeId", "restaurantId") REFERENCES "Recipe" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CatalogProductProposal_inventoryItemId_restaurantId_fkey" FOREIGN KEY ("inventoryItemId", "restaurantId") REFERENCES "InventoryItem" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CatalogProductProposal_approvedProductId_restaurantId_fkey" FOREIGN KEY ("approvedProductId", "restaurantId") REFERENCES "ServiceProduct" ("id", "restaurantId") ON DELETE NO ACTION ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CatalogProductProposal_id_restaurantId_key" ON "CatalogProductProposal"("id", "restaurantId");
CREATE INDEX "CatalogProductProposal_restaurantId_status_createdAt_idx" ON "CatalogProductProposal"("restaurantId", "status", "createdAt");

COMMIT;
PRAGMA foreign_keys=ON;
