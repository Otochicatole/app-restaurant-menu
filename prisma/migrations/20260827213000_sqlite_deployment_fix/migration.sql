-- Remove the compatibility tenant on genuinely fresh databases. Legacy databases
-- keep it because at least one tenant-scoped record or account references it.
DELETE FROM "Tenant"
WHERE "id" = 'legacy-fuzion'
  AND NOT EXISTS (SELECT 1 FROM "Admin" WHERE "tenantId" = 'legacy-fuzion')
  AND NOT EXISTS (SELECT 1 FROM "Group" WHERE "tenantId" = 'legacy-fuzion')
  AND NOT EXISTS (SELECT 1 FROM "HomePage" WHERE "tenantId" = 'legacy-fuzion')
  AND NOT EXISTS (SELECT 1 FROM "Font" WHERE "tenantId" = 'legacy-fuzion')
  AND NOT EXISTS (SELECT 1 FROM "Setting" WHERE "tenantId" = 'legacy-fuzion');

-- SQLite treats a NULL CHECK result as valid. Rebuild Product so the media pair
-- explicitly rejects a non-null path with a null/unsupported media type.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" REAL NOT NULL,
    "groupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "mediaPath" TEXT,
    "mediaType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_price_check" CHECK ("price" >= 0),
    CONSTRAINT "Product_sortOrder_check" CHECK ("sortOrder" >= 0),
    CONSTRAINT "Product_media_check" CHECK (
        ("mediaPath" IS NULL AND "mediaType" IS NULL) OR
        ("mediaPath" IS NOT NULL AND "mediaType" IS NOT NULL AND "mediaType" IN ('image', 'video'))
    ),
    CONSTRAINT "Product_groupId_tenantId_fkey" FOREIGN KEY ("groupId", "tenantId") REFERENCES "Group" ("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" (
    "id", "tenantId", "name", "description", "price", "groupId", "sortOrder", "mediaPath", "mediaType", "createdAt", "updatedAt"
)
SELECT
    "id", "tenantId", "name", "description", "price", "groupId", "sortOrder",
    CASE WHEN "mediaPath" IS NOT NULL AND "mediaType" IN ('image', 'video') THEN "mediaPath" ELSE NULL END,
    CASE WHEN "mediaPath" IS NOT NULL AND "mediaType" IN ('image', 'video') THEN "mediaType" ELSE NULL END,
    "createdAt", "updatedAt"
FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");
CREATE INDEX "Product_tenantId_groupId_idx" ON "Product"("tenantId", "groupId");
CREATE UNIQUE INDEX "Product_id_tenantId_key" ON "Product"("id", "tenantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
