-- CreateTable
CREATE TABLE "MenuProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "draftJson" TEXT NOT NULL,
    "draftRevision" INTEGER NOT NULL DEFAULT 0,
    "publishedJson" TEXT,
    "publishedRevision" INTEGER,
    "publishedAt" DATETIME,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "legacyFallback" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuProject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fontFamily" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuAssetReference" (
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,

    PRIMARY KEY ("projectId", "assetId", "scope"),
    CONSTRAINT "MenuAssetReference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuAssetReference_projectId_tenantId_fkey" FOREIGN KEY ("projectId", "tenantId") REFERENCES "MenuProject" ("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuAssetReference_assetId_tenantId_fkey" FOREIGN KEY ("assetId", "tenantId") REFERENCES "MenuAsset" ("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "publicDescription" TEXT NOT NULL DEFAULT 'Menú digital',
    "assetQuotaBytes" INTEGER NOT NULL DEFAULT 262144000,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tenant" ("assetQuotaBytes", "createdAt", "id", "name", "publicDescription", "slug", "status", "updatedAt") SELECT 262144000, "createdAt", "id", "name", COALESCE((SELECT "description" FROM "HomePage" WHERE "HomePage"."tenantId" = "Tenant"."id"), 'Menú digital'), "slug", "status", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MenuProject_tenantId_key" ON "MenuProject"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuProject_id_tenantId_key" ON "MenuProject"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuAsset_storageKey_key" ON "MenuAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MenuAsset_tenantId_kind_idx" ON "MenuAsset"("tenantId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "MenuAsset_id_tenantId_key" ON "MenuAsset"("id", "tenantId");

-- CreateIndex
CREATE INDEX "MenuAssetReference_tenantId_scope_idx" ON "MenuAssetReference"("tenantId", "scope");
