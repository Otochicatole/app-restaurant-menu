CREATE TABLE "MenuTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "documentJson" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "submittedAt" DATETIME,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MenuTemplateAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
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
    CONSTRAINT "MenuTemplateAsset_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MenuTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MenuTemplateAssetReference" (
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    PRIMARY KEY ("templateId", "assetId"),
    CONSTRAINT "MenuTemplateAssetReference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuTemplateAssetReference_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MenuTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuTemplateAssetReference_assetId_tenantId_fkey" FOREIGN KEY ("assetId", "tenantId") REFERENCES "MenuAsset" ("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MenuTemplateAsset_storageKey_key" ON "MenuTemplateAsset"("storageKey");
CREATE INDEX "MenuTemplate_visibility_status_idx" ON "MenuTemplate"("visibility", "status");
CREATE INDEX "MenuTemplate_tenantId_status_idx" ON "MenuTemplate"("tenantId", "status");
CREATE INDEX "MenuTemplateAssetReference_tenantId_assetId_idx" ON "MenuTemplateAssetReference"("tenantId", "assetId");
