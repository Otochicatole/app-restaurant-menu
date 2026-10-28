-- Keep these SQL CHECK constraints and Admin.email COLLATE NOCASE when rebuilding tables.
-- Run scripts/schema-hardening-preflight.ts first for actionable row IDs.
-- Existing invalid data aborts the transaction; nothing is silently repaired or removed.
PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;

CREATE TABLE "new_Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL COLLATE NOCASE,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TENANT_ADMIN',
    "organizationId" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Admin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Admin_role_check" CHECK ("role" IN ('SUPER_ADMIN', 'TENANT_ADMIN')),
    CONSTRAINT "Admin_role_organization_check" CHECK (("role" = 'SUPER_ADMIN' AND "organizationId" IS NULL) OR ("role" = 'TENANT_ADMIN' AND "organizationId" IS NOT NULL))
);
INSERT INTO "new_Admin" ("id", "email", "passwordHash", "role", "organizationId", "mustChangePassword", "lastLoginAt", "createdAt", "updatedAt") SELECT "id", "email", "passwordHash", "role", "organizationId", "mustChangePassword", "lastLoginAt", "createdAt", "updatedAt" FROM "Admin";
DROP TABLE "Admin";
ALTER TABLE "new_Admin" RENAME TO "Admin";
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE UNIQUE INDEX "Admin_organizationId_key" ON "Admin"("organizationId");

CREATE TABLE "new_Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "maxRestaurants" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Organization_status_check" CHECK ("status" IN ('ACTIVE', 'SUSPENDED')),
    CONSTRAINT "Organization_maxRestaurants_check" CHECK ((typeof("maxRestaurants") = 'integer' AND "maxRestaurants" >= 1))
);
INSERT INTO "new_Organization" ("id", "name", "slug", "status", "maxRestaurants", "createdAt", "updatedAt") SELECT "id", "name", "slug", "status", "maxRestaurants", "createdAt", "updatedAt" FROM "Organization";
DROP TABLE "Organization";
ALTER TABLE "new_Organization" RENAME TO "Organization";
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

CREATE TABLE "new_Restaurant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicDescription" TEXT NOT NULL DEFAULT 'Menú digital',
    "assetQuotaBytes" INTEGER NOT NULL DEFAULT 262144000,
    "dailyReservationCapacity" INTEGER NOT NULL DEFAULT 50,
    "slug" TEXT NOT NULL,
    "landingSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "landingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Restaurant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Restaurant_status_check" CHECK ("status" IN ('ACTIVE', 'SUSPENDED')),
    CONSTRAINT "Restaurant_assetQuotaBytes_check" CHECK ((typeof("assetQuotaBytes") = 'integer' AND "assetQuotaBytes" >= 1)),
    CONSTRAINT "Restaurant_dailyReservationCapacity_check" CHECK ((typeof("dailyReservationCapacity") = 'integer' AND "dailyReservationCapacity" >= 1))
);
INSERT INTO "new_Restaurant" ("id", "organizationId", "name", "publicDescription", "assetQuotaBytes", "dailyReservationCapacity", "slug", "landingSlug", "status", "landingEnabled", "createdAt", "updatedAt") SELECT "id", "organizationId", "name", "publicDescription", "assetQuotaBytes", "dailyReservationCapacity", "slug", "landingSlug", "status", "landingEnabled", "createdAt", "updatedAt" FROM "Restaurant";
DROP TABLE "Restaurant";
ALTER TABLE "new_Restaurant" RENAME TO "Restaurant";
CREATE INDEX "Restaurant_organizationId_idx" ON "Restaurant"("organizationId");
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");
CREATE UNIQUE INDEX "Restaurant_landingSlug_key" ON "Restaurant"("landingSlug");

CREATE TABLE "new_LoginThrottle" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" DATETIME NOT NULL,
    "blockedUntil" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoginThrottle_failures_check" CHECK ((typeof("failures") = 'integer' AND "failures" >= 0))
);
INSERT INTO "new_LoginThrottle" ("key", "failures", "windowStartedAt", "blockedUntil", "updatedAt") SELECT "key", "failures", "windowStartedAt", "blockedUntil", "updatedAt" FROM "LoginThrottle";
DROP TABLE "LoginThrottle";
ALTER TABLE "new_LoginThrottle" RENAME TO "LoginThrottle";
CREATE INDEX "LoginThrottle_updatedAt_idx" ON "LoginThrottle"("updatedAt");

CREATE TABLE "new_AssetCleanupJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storageKey" TEXT NOT NULL,
    "deletePrefix" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetCleanupJob_attempts_check" CHECK ((typeof("attempts") = 'integer' AND "attempts" >= 0))
);
INSERT INTO "new_AssetCleanupJob" ("id", "storageKey", "deletePrefix", "attempts", "availableAt", "lastError", "createdAt", "updatedAt") SELECT "id", "storageKey", "deletePrefix", "attempts", "availableAt", "lastError", "createdAt", "updatedAt" FROM "AssetCleanupJob";
DROP TABLE "AssetCleanupJob";
ALTER TABLE "new_AssetCleanupJob" RENAME TO "AssetCleanupJob";
CREATE UNIQUE INDEX "AssetCleanupJob_storageKey_key" ON "AssetCleanupJob"("storageKey");
CREATE INDEX "AssetCleanupJob_availableAt_idx" ON "AssetCleanupJob"("availableAt");

CREATE TABLE "new_MenuProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
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
    CONSTRAINT "MenuProject_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuProject_draftRevision_check" CHECK ((typeof("draftRevision") = 'integer' AND "draftRevision" >= 0)),
    CONSTRAINT "MenuProject_publishedRevision_check" CHECK ("publishedRevision" IS NULL OR (typeof("publishedRevision") = 'integer' AND "publishedRevision" >= 0)),
    CONSTRAINT "MenuProject_published_revision_order_check" CHECK ("publishedRevision" IS NULL OR "publishedRevision" <= "draftRevision"),
    CONSTRAINT "MenuProject_schemaVersion_check" CHECK ((typeof("schemaVersion") = 'integer' AND "schemaVersion" >= 1))
);
INSERT INTO "new_MenuProject" ("id", "restaurantId", "name", "slug", "publicDescription", "isPrimary", "draftJson", "draftRevision", "publishedJson", "publishedRevision", "publishedAt", "schemaVersion", "createdAt", "updatedAt") SELECT "id", "restaurantId", "name", "slug", "publicDescription", "isPrimary", "draftJson", "draftRevision", "publishedJson", "publishedRevision", "publishedAt", "schemaVersion", "createdAt", "updatedAt" FROM "MenuProject";
DROP TABLE "MenuProject";
ALTER TABLE "new_MenuProject" RENAME TO "MenuProject";
CREATE UNIQUE INDEX "MenuProject_restaurantId_key" ON "MenuProject"("restaurantId");
CREATE UNIQUE INDEX "MenuProject_slug_key" ON "MenuProject"("slug");
CREATE UNIQUE INDEX "MenuProject_id_restaurantId_key" ON "MenuProject"("id", "restaurantId");

CREATE TABLE "new_MenuTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
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
    CONSTRAINT "MenuTemplate_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuTemplate_schemaVersion_check" CHECK ((typeof("schemaVersion") = 'integer' AND "schemaVersion" >= 1)),
    CONSTRAINT "MenuTemplate_visibility_check" CHECK ("visibility" IN ('PRIVATE', 'PUBLIC')),
    CONSTRAINT "MenuTemplate_status_check" CHECK ("status" IN ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED'))
);
INSERT INTO "new_MenuTemplate" ("id", "restaurantId", "name", "description", "documentJson", "schemaVersion", "visibility", "status", "isSystem", "rejectionReason", "submittedAt", "publishedAt", "createdAt", "updatedAt") SELECT "id", "restaurantId", "name", "description", "documentJson", "schemaVersion", "visibility", "status", "isSystem", "rejectionReason", "submittedAt", "publishedAt", "createdAt", "updatedAt" FROM "MenuTemplate";
DROP TABLE "MenuTemplate";
ALTER TABLE "new_MenuTemplate" RENAME TO "MenuTemplate";
CREATE INDEX "MenuTemplate_visibility_status_idx" ON "MenuTemplate"("visibility", "status");
CREATE INDEX "MenuTemplate_restaurantId_status_idx" ON "MenuTemplate"("restaurantId", "status");
CREATE UNIQUE INDEX "MenuTemplate_id_restaurantId_key" ON "MenuTemplate"("id", "restaurantId");

CREATE TABLE "new_LandingTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT,
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
    CONSTRAINT "LandingTemplate_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LandingTemplate_schemaVersion_check" CHECK ((typeof("schemaVersion") = 'integer' AND "schemaVersion" >= 1)),
    CONSTRAINT "LandingTemplate_visibility_check" CHECK ("visibility" IN ('PRIVATE', 'PUBLIC')),
    CONSTRAINT "LandingTemplate_status_check" CHECK ("status" IN ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED'))
);
INSERT INTO "new_LandingTemplate" ("id", "restaurantId", "name", "description", "documentJson", "htmlContent", "cssContent", "jsContent", "schemaVersion", "visibility", "status", "isSystem", "rejectionReason", "submittedAt", "publishedAt", "createdAt", "updatedAt") SELECT "id", "restaurantId", "name", "description", "documentJson", "htmlContent", "cssContent", "jsContent", "schemaVersion", "visibility", "status", "isSystem", "rejectionReason", "submittedAt", "publishedAt", "createdAt", "updatedAt" FROM "LandingTemplate";
DROP TABLE "LandingTemplate";
ALTER TABLE "new_LandingTemplate" RENAME TO "LandingTemplate";
CREATE INDEX "LandingTemplate_visibility_status_idx" ON "LandingTemplate"("visibility", "status");
CREATE INDEX "LandingTemplate_restaurantId_status_idx" ON "LandingTemplate"("restaurantId", "status");

CREATE TABLE "new_MenuAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
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
    CONSTRAINT "MenuAsset_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuAsset_kind_check" CHECK ("kind" IN ('IMAGE', 'VIDEO', 'FONT')),
    CONSTRAINT "MenuAsset_byteSize_check" CHECK ((typeof("byteSize") = 'integer' AND "byteSize" >= 0)),
    CONSTRAINT "MenuAsset_width_check" CHECK ("width" IS NULL OR (typeof("width") = 'integer' AND "width" >= 1)),
    CONSTRAINT "MenuAsset_height_check" CHECK ("height" IS NULL OR (typeof("height") = 'integer' AND "height" >= 1))
);
INSERT INTO "new_MenuAsset" ("id", "restaurantId", "kind", "name", "storageKey", "mimeType", "byteSize", "checksum", "width", "height", "fontFamily", "createdAt", "updatedAt") SELECT "id", "restaurantId", "kind", "name", "storageKey", "mimeType", "byteSize", "checksum", "width", "height", "fontFamily", "createdAt", "updatedAt" FROM "MenuAsset";
DROP TABLE "MenuAsset";
ALTER TABLE "new_MenuAsset" RENAME TO "MenuAsset";
CREATE UNIQUE INDEX "MenuAsset_storageKey_key" ON "MenuAsset"("storageKey");
CREATE INDEX "MenuAsset_restaurantId_kind_idx" ON "MenuAsset"("restaurantId", "kind");
CREATE UNIQUE INDEX "MenuAsset_id_restaurantId_key" ON "MenuAsset"("id", "restaurantId");

CREATE TABLE "new_MenuTemplateAsset" (
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
    CONSTRAINT "MenuTemplateAsset_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MenuTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuTemplateAsset_kind_check" CHECK ("kind" IN ('IMAGE', 'VIDEO', 'FONT')),
    CONSTRAINT "MenuTemplateAsset_byteSize_check" CHECK ((typeof("byteSize") = 'integer' AND "byteSize" >= 0)),
    CONSTRAINT "MenuTemplateAsset_width_check" CHECK ("width" IS NULL OR (typeof("width") = 'integer' AND "width" >= 1)),
    CONSTRAINT "MenuTemplateAsset_height_check" CHECK ("height" IS NULL OR (typeof("height") = 'integer' AND "height" >= 1))
);
INSERT INTO "new_MenuTemplateAsset" ("id", "templateId", "kind", "name", "storageKey", "mimeType", "byteSize", "checksum", "width", "height", "fontFamily", "createdAt", "updatedAt") SELECT "id", "templateId", "kind", "name", "storageKey", "mimeType", "byteSize", "checksum", "width", "height", "fontFamily", "createdAt", "updatedAt" FROM "MenuTemplateAsset";
DROP TABLE "MenuTemplateAsset";
ALTER TABLE "new_MenuTemplateAsset" RENAME TO "MenuTemplateAsset";
CREATE UNIQUE INDEX "MenuTemplateAsset_storageKey_key" ON "MenuTemplateAsset"("storageKey");

CREATE TABLE "new_MenuAssetReference" (
    "restaurantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,

    PRIMARY KEY ("projectId", "assetId", "scope"),
    CONSTRAINT "MenuAssetReference_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuAssetReference_projectId_restaurantId_fkey" FOREIGN KEY ("projectId", "restaurantId") REFERENCES "MenuProject" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuAssetReference_assetId_restaurantId_fkey" FOREIGN KEY ("assetId", "restaurantId") REFERENCES "MenuAsset" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuAssetReference_scope_check" CHECK ("scope" IN ('DRAFT', 'PUBLISHED'))
);
INSERT INTO "new_MenuAssetReference" ("restaurantId", "projectId", "assetId", "scope") SELECT "restaurantId", "projectId", "assetId", "scope" FROM "MenuAssetReference";
DROP TABLE "MenuAssetReference";
ALTER TABLE "new_MenuAssetReference" RENAME TO "MenuAssetReference";
CREATE INDEX "MenuAssetReference_restaurantId_scope_idx" ON "MenuAssetReference"("restaurantId", "scope");

CREATE TABLE "new_ReservationRecurringClosure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'Cerrado por descanso semanal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReservationRecurringClosure_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationRecurringClosure_dayOfWeek_check" CHECK (typeof("dayOfWeek") = 'integer' AND "dayOfWeek" BETWEEN 0 AND 6)
);
INSERT INTO "new_ReservationRecurringClosure" ("id", "restaurantId", "dayOfWeek", "reason", "createdAt", "updatedAt") SELECT "id", "restaurantId", "dayOfWeek", "reason", "createdAt", "updatedAt" FROM "ReservationRecurringClosure";
DROP TABLE "ReservationRecurringClosure";
ALTER TABLE "new_ReservationRecurringClosure" RENAME TO "ReservationRecurringClosure";
CREATE UNIQUE INDEX "ReservationRecurringClosure_restaurantId_dayOfWeek_key" ON "ReservationRecurringClosure"("restaurantId", "dayOfWeek");

CREATE TABLE "new_RestaurantEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "priceLabel" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "blocksRegularReservations" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RestaurantEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestaurantEvent_capacity_check" CHECK ((typeof("capacity") = 'integer' AND "capacity" >= 1)),
    CONSTRAINT "RestaurantEvent_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'))
);
INSERT INTO "new_RestaurantEvent" ("id", "restaurantId", "title", "description", "date", "startTime", "endTime", "capacity", "priceLabel", "imageUrl", "blocksRegularReservations", "status", "createdAt", "updatedAt") SELECT "id", "restaurantId", "title", "description", "date", "startTime", "endTime", "capacity", "priceLabel", "imageUrl", "blocksRegularReservations", "status", "createdAt", "updatedAt" FROM "RestaurantEvent";
DROP TABLE "RestaurantEvent";
ALTER TABLE "new_RestaurantEvent" RENAME TO "RestaurantEvent";
CREATE INDEX "RestaurantEvent_restaurantId_date_status_idx" ON "RestaurantEvent"("restaurantId", "date", "status");
CREATE UNIQUE INDEX "RestaurantEvent_id_restaurantId_key" ON "RestaurantEvent"("id", "restaurantId");

CREATE TABLE "new_TableReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL DEFAULT '',
    "customerPhone" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL DEFAULT 2,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "adminNotes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'LANDING',
    "eventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TableReservation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TableReservation_eventId_restaurantId_fkey" FOREIGN KEY ("eventId", "restaurantId") REFERENCES "RestaurantEvent" ("id", "restaurantId") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "TableReservation_partySize_check" CHECK ((typeof("partySize") = 'integer' AND "partySize" >= 1)),
    CONSTRAINT "TableReservation_status_check" CHECK ("status" IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED')),
    CONSTRAINT "TableReservation_source_check" CHECK ("source" IN ('ADMIN', 'LANDING'))
);
INSERT INTO "new_TableReservation" ("id", "restaurantId", "code", "customerName", "customerEmail", "customerPhone", "partySize", "date", "time", "notes", "adminNotes", "status", "source", "eventId", "createdAt", "updatedAt") SELECT "id", "restaurantId", "code", "customerName", "customerEmail", "customerPhone", "partySize", "date", "time", "notes", "adminNotes", "status", "source", "eventId", "createdAt", "updatedAt" FROM "TableReservation";
DROP TABLE "TableReservation";
ALTER TABLE "new_TableReservation" RENAME TO "TableReservation";
CREATE INDEX "TableReservation_restaurantId_date_status_idx" ON "TableReservation"("restaurantId", "date", "status");
CREATE INDEX "TableReservation_restaurantId_status_idx" ON "TableReservation"("restaurantId", "status");
CREATE INDEX "TableReservation_eventId_idx" ON "TableReservation"("eventId");

DROP INDEX IF EXISTS "MenuProject_restaurantId_idx";
DROP INDEX IF EXISTS "MenuProject_restaurantId_isPrimary_idx";
DROP INDEX IF EXISTS "LandingPage_restaurantId_idx";
DROP INDEX IF EXISTS "ReservationRecurringClosure_restaurantId_idx";
DROP INDEX IF EXISTS "ReservationBlockedDate_restaurantId_date_idx";

CREATE UNIQUE INDEX "TableReservation_restaurantId_code_key" ON "TableReservation"("restaurantId", "code");
CREATE INDEX "MenuTemplateAsset_templateId_idx" ON "MenuTemplateAsset"("templateId");
CREATE INDEX "MenuAssetReference_restaurantId_assetId_idx" ON "MenuAssetReference"("restaurantId", "assetId");
CREATE INDEX "MenuAsset_restaurantId_checksum_idx" ON "MenuAsset"("restaurantId", "checksum");

-- A query-only PRAGMA would merely report violations. Make violations abort the transaction.
CREATE TEMP TABLE "_DatabaseHardeningForeignKeyGuard" (
    "violations" INTEGER NOT NULL CONSTRAINT "DatabaseHardening_foreign_keys_check" CHECK ("violations" = 0)
);
INSERT INTO "_DatabaseHardeningForeignKeyGuard" SELECT COUNT(*) FROM pragma_foreign_key_check;
DROP TABLE "_DatabaseHardeningForeignKeyGuard";
COMMIT;
PRAGMA foreign_keys=ON;
