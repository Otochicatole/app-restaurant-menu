-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL DEFAULT '',
    "cssContent" TEXT NOT NULL DEFAULT '',
    "jsContent" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LandingPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "multiMenuEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxMenus" INTEGER NOT NULL DEFAULT 1,
    "landingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Tenant" ("assetQuotaBytes", "createdAt", "id", "maxMenus", "multiMenuEnabled", "name", "publicDescription", "slug", "status", "updatedAt") SELECT "assetQuotaBytes", "createdAt", "id", "maxMenus", "multiMenuEnabled", "name", "publicDescription", "slug", "status", "updatedAt" FROM "Tenant";
DROP TABLE "Tenant";
ALTER TABLE "new_Tenant" RENAME TO "Tenant";
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_tenantId_key" ON "LandingPage"("tenantId");

-- CreateIndex
CREATE INDEX "LandingPage_tenantId_idx" ON "LandingPage"("tenantId");
