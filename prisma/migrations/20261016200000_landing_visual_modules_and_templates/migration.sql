-- AlterTable
ALTER TABLE "LandingPage" ADD COLUMN "documentJson" TEXT;

-- CreateTable
CREATE TABLE "LandingCustomModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'custom',
    "fieldsJson" TEXT NOT NULL DEFAULT '[]',
    "htmlTemplate" TEXT NOT NULL DEFAULT '',
    "cssTemplate" TEXT NOT NULL DEFAULT '',
    "jsTemplate" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LandingCustomModule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LandingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "documentJson" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL DEFAULT '',
    "cssContent" TEXT NOT NULL DEFAULT '',
    "jsContent" TEXT NOT NULL DEFAULT '',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "submittedAt" DATETIME,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LandingTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LandingCustomModule_tenantId_idx" ON "LandingCustomModule"("tenantId");

-- CreateIndex
CREATE INDEX "LandingTemplate_visibility_status_idx" ON "LandingTemplate"("visibility", "status");

-- CreateIndex
CREATE INDEX "LandingTemplate_tenantId_status_idx" ON "LandingTemplate"("tenantId", "status");
