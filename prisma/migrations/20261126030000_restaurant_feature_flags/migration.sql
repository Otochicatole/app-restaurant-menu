-- Add commercial feature flags per restaurant
ALTER TABLE "Restaurant" ADD COLUMN "menuEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Restaurant" ADD COLUMN "reservationsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Restaurant" ADD COLUMN "inventoryEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Preserve existing behavior: reservations were gated by landingEnabled
UPDATE "Restaurant" SET "reservationsEnabled" = "landingEnabled";

-- Preserve existing inventory usage where inventory records already exist
UPDATE "Restaurant"
SET "inventoryEnabled" = true
WHERE EXISTS (SELECT 1 FROM "InventoryItem" i WHERE i."restaurantId" = "Restaurant"."id")
   OR EXISTS (SELECT 1 FROM "Supplier" s WHERE s."restaurantId" = "Restaurant"."id")
   OR EXISTS (SELECT 1 FROM "Recipe" r WHERE r."restaurantId" = "Restaurant"."id");
