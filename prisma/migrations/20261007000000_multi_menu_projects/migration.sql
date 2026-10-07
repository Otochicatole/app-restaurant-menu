PRAGMA foreign_keys=OFF;

-- Tenant: privilege flag for multiple menus
ALTER TABLE "Tenant" ADD COLUMN "multiMenuEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Rebuild MenuProject with per-menu identity fields and 1:N tenant relation
CREATE TABLE "new_MenuProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicDescription" TEXT NOT NULL DEFAULT 'Menú digital',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
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

INSERT INTO "new_MenuProject" (
    "id",
    "tenantId",
    "name",
    "slug",
    "publicDescription",
    "isPrimary",
    "draftJson",
    "draftRevision",
    "publishedJson",
    "publishedRevision",
    "publishedAt",
    "schemaVersion",
    "createdAt",
    "updatedAt"
)
SELECT
    mp."id",
    mp."tenantId",
    t."name",
    t."slug",
    t."publicDescription",
    true,
    mp."draftJson",
    mp."draftRevision",
    mp."publishedJson",
    mp."publishedRevision",
    mp."publishedAt",
    mp."schemaVersion",
    mp."createdAt",
    mp."updatedAt"
FROM "MenuProject" mp
INNER JOIN "Tenant" t ON t."id" = mp."tenantId";

DROP TABLE "MenuProject";
ALTER TABLE "new_MenuProject" RENAME TO "MenuProject";

CREATE UNIQUE INDEX "MenuProject_slug_key" ON "MenuProject"("slug");
CREATE UNIQUE INDEX "MenuProject_id_tenantId_key" ON "MenuProject"("id", "tenantId");
CREATE INDEX "MenuProject_tenantId_idx" ON "MenuProject"("tenantId");
CREATE INDEX "MenuProject_tenantId_isPrimary_idx" ON "MenuProject"("tenantId", "isPrimary");

PRAGMA foreign_keys=ON;
