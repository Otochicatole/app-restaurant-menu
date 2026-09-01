PRAGMA foreign_keys=OFF;

CREATE TABLE "new_MenuProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "draftJson" TEXT NOT NULL,
    "draftRevision" INTEGER NOT NULL DEFAULT 0,
    "publishedJson" TEXT,
    "publishedRevision" INTEGER,
    "publishedAt" DATETIME,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuProject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_MenuProject" ("id", "tenantId", "draftJson", "draftRevision", "publishedJson", "publishedRevision", "publishedAt", "schemaVersion", "createdAt", "updatedAt")
SELECT "id", "tenantId", "draftJson", "draftRevision", "publishedJson", "publishedRevision", "publishedAt", "schemaVersion", "createdAt", "updatedAt"
FROM "MenuProject";

DROP TABLE "MenuProject";
ALTER TABLE "new_MenuProject" RENAME TO "MenuProject";

CREATE UNIQUE INDEX "MenuProject_tenantId_key" ON "MenuProject"("tenantId");
CREATE UNIQUE INDEX "MenuProject_id_tenantId_key" ON "MenuProject"("id", "tenantId");

DROP TABLE IF EXISTS "FeaturedProduct";
DROP TABLE IF EXISTS "Product";
DROP TABLE IF EXISTS "Group";
DROP TABLE IF EXISTS "HomePage";
DROP TABLE IF EXISTS "Font";
DROP TABLE IF EXISTS "Setting";

PRAGMA foreign_keys=ON;
