PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL COLLATE NOCASE,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tenant_status_check" CHECK ("status" IN ('ACTIVE', 'SUSPENDED'))
);
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

INSERT INTO "Tenant" ("id", "name", "slug", "status", "createdAt", "updatedAt")
VALUES ('legacy-fuzion', 'Fuzion', 'fuzion', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

CREATE TABLE "new_Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL COLLATE NOCASE,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TENANT_ADMIN',
    "tenantId" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Admin_role_check" CHECK ("role" IN ('SUPER_ADMIN', 'TENANT_ADMIN')),
    CONSTRAINT "Admin_role_tenant_check" CHECK (
        ("role" = 'SUPER_ADMIN' AND "tenantId" IS NULL) OR
        ("role" = 'TENANT_ADMIN' AND "tenantId" IS NOT NULL)
    ),
    CONSTRAINT "Admin_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Admin" (
    "id", "email", "passwordHash", "role", "tenantId", "mustChangePassword", "createdAt", "updatedAt"
)
SELECT
    "id",
    LOWER("email"),
    "passwordHash",
    CASE WHEN "id" = (SELECT "id" FROM "Admin" ORDER BY "createdAt", "id" LIMIT 1)
        THEN 'TENANT_ADMIN' ELSE 'SUPER_ADMIN' END,
    CASE WHEN "id" = (SELECT "id" FROM "Admin" ORDER BY "createdAt", "id" LIMIT 1)
        THEN 'legacy-fuzion' ELSE NULL END,
    false,
    "createdAt",
    "updatedAt"
FROM "Admin";
DROP TABLE "Admin";
ALTER TABLE "new_Admin" RENAME TO "Admin";
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE UNIQUE INDEX "Admin_tenantId_key" ON "Admin"("tenantId");

CREATE TABLE "new_Group" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL COLLATE NOCASE,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Group_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Group" ("id", "tenantId", "name", "description", "createdAt", "updatedAt")
SELECT "id", 'legacy-fuzion', "name", "description", "createdAt", "updatedAt" FROM "Group";
DROP TABLE "Group";
ALTER TABLE "new_Group" RENAME TO "Group";
CREATE INDEX "Group_tenantId_idx" ON "Group"("tenantId");
CREATE UNIQUE INDEX "Group_tenantId_name_key" ON "Group"("tenantId", "name");
CREATE UNIQUE INDEX "Group_id_tenantId_key" ON "Group"("id", "tenantId");

CREATE TABLE "new_HomePage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Fuzion',
    "description" TEXT NOT NULL DEFAULT 'Desayunos y meriendas',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HomePage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HomePage" ("id", "tenantId", "title", "description", "createdAt", "updatedAt")
SELECT "id", 'legacy-fuzion', "title", "description", "createdAt", "updatedAt"
FROM "HomePage"
ORDER BY "createdAt", "id"
LIMIT 1;
DROP TABLE "HomePage";
ALTER TABLE "new_HomePage" RENAME TO "HomePage";
CREATE UNIQUE INDEX "HomePage_tenantId_key" ON "HomePage"("tenantId");

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
        ("mediaPath" IS NOT NULL AND "mediaType" IN ('image', 'video'))
    ),
    CONSTRAINT "Product_groupId_tenantId_fkey" FOREIGN KEY ("groupId", "tenantId") REFERENCES "Group" ("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" (
    "id", "tenantId", "name", "description", "price", "groupId", "sortOrder", "mediaPath", "mediaType", "createdAt", "updatedAt"
)
SELECT
    "id", 'legacy-fuzion', "name", "description", "price", "groupId", "sortOrder",
    CASE WHEN "mediaType" IN ('image', 'video') THEN "mediaPath" ELSE NULL END,
    CASE WHEN "mediaPath" IS NOT NULL AND "mediaType" IN ('image', 'video') THEN "mediaType" ELSE NULL END,
    "createdAt", "updatedAt"
FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");
CREATE INDEX "Product_tenantId_groupId_idx" ON "Product"("tenantId", "groupId");
CREATE UNIQUE INDEX "Product_id_tenantId_key" ON "Product"("id", "tenantId");

CREATE TABLE "new_FeaturedProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FeaturedProduct_position_check" CHECK ("position" BETWEEN 1 AND 3),
    CONSTRAINT "FeaturedProduct_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product" ("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FeaturedProduct" ("id", "tenantId", "position", "productId", "createdAt", "updatedAt")
SELECT "id", 'legacy-fuzion', "position", "productId", "createdAt", "updatedAt"
FROM "FeaturedProduct" featured
WHERE "position" BETWEEN 1 AND 3
  AND "position" = (
      SELECT MIN(candidate."position")
      FROM "FeaturedProduct" candidate
      WHERE candidate."productId" = featured."productId"
        AND candidate."position" BETWEEN 1 AND 3
  );
DROP TABLE "FeaturedProduct";
ALTER TABLE "new_FeaturedProduct" RENAME TO "FeaturedProduct";
CREATE INDEX "FeaturedProduct_tenantId_idx" ON "FeaturedProduct"("tenantId");
CREATE UNIQUE INDEX "FeaturedProduct_tenantId_position_key" ON "FeaturedProduct"("tenantId", "position");
CREATE UNIQUE INDEX "FeaturedProduct_tenant_product_key" ON "FeaturedProduct"("tenantId", "productId");
CREATE UNIQUE INDEX "FeaturedProduct_id_tenantId_key" ON "FeaturedProduct"("id", "tenantId");

CREATE TABLE "new_Font" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "name" TEXT NOT NULL COLLATE NOCASE,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "googleFamily" TEXT,
    "fontFamily" TEXT NOT NULL,
    "weights" TEXT NOT NULL DEFAULT '400;700',
    "filePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Font_category_check" CHECK ("category" IN ('serif', 'sans-serif', 'monospace', 'display', 'script')),
    CONSTRAINT "Font_source_check" CHECK ("source" IN ('google', 'custom')),
    CONSTRAINT "Font_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Font" (
    "id", "tenantId", "name", "category", "source", "googleFamily", "fontFamily", "weights", "filePath", "createdAt", "updatedAt"
)
SELECT
    "id", CASE WHEN "source" = 'custom' THEN 'legacy-fuzion' ELSE NULL END,
    "name", "category", "source", "googleFamily", "fontFamily", "weights", "filePath", "createdAt", "updatedAt"
FROM "Font";
DROP TABLE "Font";
ALTER TABLE "new_Font" RENAME TO "Font";
CREATE INDEX "Font_tenantId_idx" ON "Font"("tenantId");
CREATE UNIQUE INDEX "Font_tenantId_name_key" ON "Font"("tenantId", "name");
CREATE UNIQUE INDEX "Font_system_name_unique" ON "Font"("name") WHERE "tenantId" IS NULL;

CREATE TABLE "new_Setting" (
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    PRIMARY KEY ("tenantId", "key"),
    CONSTRAINT "Setting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Setting" ("tenantId", "key", "value", "createdAt", "updatedAt")
SELECT 'legacy-fuzion', "key", "value", "createdAt", "updatedAt" FROM "Setting";
DROP TABLE "Setting";
ALTER TABLE "new_Setting" RENAME TO "Setting";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
