-- Organization/restaurant cutover. Complete filesystem backfill with scripts/cutover-organizations.ts before serving traffic.
PRAGMA foreign_keys=OFF;
CREATE TABLE "AppSchemaState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "generation" INTEGER NOT NULL DEFAULT 2,
    "state" TEXT NOT NULL DEFAULT 'READY',
    "migrationJson" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO AppSchemaState(id,generation,state,updatedAt) VALUES('singleton',2,'MIGRATING',CURRENT_TIMESTAMP);
BEGIN IMMEDIATE;
DROP INDEX IF EXISTS "Admin_email_key";
DROP INDEX IF EXISTS "Admin_tenantId_key";
DROP INDEX IF EXISTS "Tenant_slug_key";
DROP INDEX IF EXISTS "Session_jti_key";
DROP INDEX IF EXISTS "Session_adminId_idx";
DROP INDEX IF EXISTS "Session_expiresAt_idx";
DROP INDEX IF EXISTS "LoginThrottle_updatedAt_idx";
DROP INDEX IF EXISTS "AssetCleanupJob_storageKey_key";
DROP INDEX IF EXISTS "AssetCleanupJob_availableAt_idx";
DROP INDEX IF EXISTS "MenuProject_slug_key";
DROP INDEX IF EXISTS "MenuProject_tenantId_idx";
DROP INDEX IF EXISTS "MenuProject_tenantId_isPrimary_idx";
DROP INDEX IF EXISTS "MenuProject_id_tenantId_key";
DROP INDEX IF EXISTS "MenuAsset_storageKey_key";
DROP INDEX IF EXISTS "MenuAsset_tenantId_kind_idx";
DROP INDEX IF EXISTS "MenuAsset_id_tenantId_key";
DROP INDEX IF EXISTS "MenuAssetReference_tenantId_scope_idx";
DROP INDEX IF EXISTS "MenuTemplate_visibility_status_idx";
DROP INDEX IF EXISTS "MenuTemplate_tenantId_status_idx";
DROP INDEX IF EXISTS "MenuTemplateAsset_storageKey_key";
DROP INDEX IF EXISTS "MenuTemplateAssetReference_tenantId_assetId_idx";
DROP INDEX IF EXISTS "LandingPage_tenantId_key";
DROP INDEX IF EXISTS "LandingPage_tenantId_idx";
DROP INDEX IF EXISTS "LandingCustomModule_tenantId_idx";
DROP INDEX IF EXISTS "LandingTemplate_visibility_status_idx";
DROP INDEX IF EXISTS "LandingTemplate_tenantId_status_idx";
DROP INDEX IF EXISTS "ReservationTimeSlot_tenantId_active_idx";
DROP INDEX IF EXISTS "ReservationTimeSlot_tenantId_time_key";
DROP INDEX IF EXISTS "ReservationRecurringClosure_tenantId_idx";
DROP INDEX IF EXISTS "ReservationRecurringClosure_tenantId_dayOfWeek_key";
DROP INDEX IF EXISTS "ReservationBlockedDate_tenantId_date_idx";
DROP INDEX IF EXISTS "ReservationBlockedDate_tenantId_date_key";
DROP INDEX IF EXISTS "RestaurantEvent_tenantId_date_status_idx";
DROP INDEX IF EXISTS "TableReservation_tenantId_date_status_idx";
DROP INDEX IF EXISTS "TableReservation_tenantId_status_idx";
DROP INDEX IF EXISTS "TableReservation_eventId_idx";
ALTER TABLE "Admin" RENAME TO "_OrganizationLegacy_Admin";
ALTER TABLE "Tenant" RENAME TO "_OrganizationLegacy_Tenant";
ALTER TABLE "Session" RENAME TO "_OrganizationLegacy_Session";
ALTER TABLE "LoginThrottle" RENAME TO "_OrganizationLegacy_LoginThrottle";
ALTER TABLE "AssetCleanupJob" RENAME TO "_OrganizationLegacy_AssetCleanupJob";
ALTER TABLE "MenuProject" RENAME TO "_OrganizationLegacy_MenuProject";
ALTER TABLE "MenuAsset" RENAME TO "_OrganizationLegacy_MenuAsset";
ALTER TABLE "MenuAssetReference" RENAME TO "_OrganizationLegacy_MenuAssetReference";
ALTER TABLE "MenuTemplate" RENAME TO "_OrganizationLegacy_MenuTemplate";
ALTER TABLE "MenuTemplateAsset" RENAME TO "_OrganizationLegacy_MenuTemplateAsset";
ALTER TABLE "MenuTemplateAssetReference" RENAME TO "_OrganizationLegacy_MenuTemplateAssetReference";
ALTER TABLE "LandingPage" RENAME TO "_OrganizationLegacy_LandingPage";
ALTER TABLE "LandingCustomModule" RENAME TO "_OrganizationLegacy_LandingCustomModule";
ALTER TABLE "LandingTemplate" RENAME TO "_OrganizationLegacy_LandingTemplate";
ALTER TABLE "ReservationTimeSlot" RENAME TO "_OrganizationLegacy_ReservationTimeSlot";
ALTER TABLE "ReservationRecurringClosure" RENAME TO "_OrganizationLegacy_ReservationRecurringClosure";
ALTER TABLE "ReservationBlockedDate" RENAME TO "_OrganizationLegacy_ReservationBlockedDate";
ALTER TABLE "RestaurantEvent" RENAME TO "_OrganizationLegacy_RestaurantEvent";
ALTER TABLE "TableReservation" RENAME TO "_OrganizationLegacy_TableReservation";

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TENANT_ADMIN',
    "organizationId" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Admin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "maxRestaurants" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
-- AppSchemaState was created before the transactional cutover.

-- CreateTable
CREATE TABLE "Restaurant" (
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
    CONSTRAINT "Restaurant_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" DATETIME NOT NULL,
    "blockedUntil" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AssetCleanupJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storageKey" TEXT NOT NULL,
    "deletePrefix" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MenuProject" (
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
    CONSTRAINT "MenuProject_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuAsset" (
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
    CONSTRAINT "MenuAsset_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuAssetReference" (
    "restaurantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,

    PRIMARY KEY ("projectId", "assetId", "scope"),
    CONSTRAINT "MenuAssetReference_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuAssetReference_projectId_restaurantId_fkey" FOREIGN KEY ("projectId", "restaurantId") REFERENCES "MenuProject" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuAssetReference_assetId_restaurantId_fkey" FOREIGN KEY ("assetId", "restaurantId") REFERENCES "MenuAsset" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuTemplate" (
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
    CONSTRAINT "MenuTemplate_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "MenuTemplateAssetReference" (
    "restaurantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    PRIMARY KEY ("templateId", "assetId"),
    CONSTRAINT "MenuTemplateAssetReference_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuTemplateAssetReference_templateId_restaurantId_fkey" FOREIGN KEY ("templateId", "restaurantId") REFERENCES "MenuTemplate" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuTemplateAssetReference_assetId_restaurantId_fkey" FOREIGN KEY ("assetId", "restaurantId") REFERENCES "MenuAsset" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LandingPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "documentJson" TEXT,
    "htmlContent" TEXT NOT NULL DEFAULT '',
    "cssContent" TEXT NOT NULL DEFAULT '',
    "jsContent" TEXT NOT NULL DEFAULT '',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LandingPage_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LandingCustomModule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'custom',
    "fieldsJson" TEXT NOT NULL DEFAULT '[]',
    "htmlTemplate" TEXT NOT NULL DEFAULT '',
    "cssTemplate" TEXT NOT NULL DEFAULT '',
    "jsTemplate" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LandingCustomModule_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LandingTemplate" (
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
    CONSTRAINT "LandingTemplate_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationTimeSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReservationTimeSlot_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationRecurringClosure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'Cerrado por descanso semanal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReservationRecurringClosure_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationBlockedDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'Cerrado por fecha especial',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReservationBlockedDate_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RestaurantEvent" (
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
    CONSTRAINT "RestaurantEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TableReservation" (
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
    CONSTRAINT "TableReservation_eventId_restaurantId_fkey" FOREIGN KEY ("eventId", "restaurantId") REFERENCES "RestaurantEvent" ("id", "restaurantId") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_organizationId_key" ON "Admin"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex


-- CreateIndex

CREATE INDEX "Restaurant_organizationId_idx" ON "Restaurant"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_jti_key" ON "Session"("jti");

-- CreateIndex
CREATE INDEX "Session_adminId_idx" ON "Session"("adminId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginThrottle_updatedAt_idx" ON "LoginThrottle"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCleanupJob_storageKey_key" ON "AssetCleanupJob"("storageKey");

-- CreateIndex
CREATE INDEX "AssetCleanupJob_availableAt_idx" ON "AssetCleanupJob"("availableAt");

-- CreateIndex
CREATE UNIQUE INDEX "MenuProject_restaurantId_key" ON "MenuProject"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuProject_slug_key" ON "MenuProject"("slug");

-- CreateIndex
CREATE INDEX "MenuProject_restaurantId_idx" ON "MenuProject"("restaurantId");

-- CreateIndex
CREATE INDEX "MenuProject_restaurantId_isPrimary_idx" ON "MenuProject"("restaurantId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "MenuProject_id_restaurantId_key" ON "MenuProject"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuAsset_storageKey_key" ON "MenuAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MenuAsset_restaurantId_kind_idx" ON "MenuAsset"("restaurantId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "MenuAsset_id_restaurantId_key" ON "MenuAsset"("id", "restaurantId");

-- CreateIndex
CREATE INDEX "MenuAssetReference_restaurantId_scope_idx" ON "MenuAssetReference"("restaurantId", "scope");

-- CreateIndex
CREATE INDEX "MenuTemplate_visibility_status_idx" ON "MenuTemplate"("visibility", "status");

-- CreateIndex
CREATE INDEX "MenuTemplate_restaurantId_status_idx" ON "MenuTemplate"("restaurantId", "status");
CREATE UNIQUE INDEX "MenuTemplate_id_restaurantId_key" ON "MenuTemplate"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuTemplateAsset_storageKey_key" ON "MenuTemplateAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MenuTemplateAssetReference_restaurantId_assetId_idx" ON "MenuTemplateAssetReference"("restaurantId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_restaurantId_key" ON "LandingPage"("restaurantId");

-- CreateIndex
CREATE INDEX "LandingPage_restaurantId_idx" ON "LandingPage"("restaurantId");

-- CreateIndex
CREATE INDEX "LandingCustomModule_restaurantId_idx" ON "LandingCustomModule"("restaurantId");

-- CreateIndex
CREATE INDEX "LandingTemplate_visibility_status_idx" ON "LandingTemplate"("visibility", "status");

-- CreateIndex
CREATE INDEX "LandingTemplate_restaurantId_status_idx" ON "LandingTemplate"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "ReservationTimeSlot_restaurantId_active_idx" ON "ReservationTimeSlot"("restaurantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationTimeSlot_restaurantId_time_key" ON "ReservationTimeSlot"("restaurantId", "time");

-- CreateIndex
CREATE INDEX "ReservationRecurringClosure_restaurantId_idx" ON "ReservationRecurringClosure"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationRecurringClosure_restaurantId_dayOfWeek_key" ON "ReservationRecurringClosure"("restaurantId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "ReservationBlockedDate_restaurantId_date_idx" ON "ReservationBlockedDate"("restaurantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationBlockedDate_restaurantId_date_key" ON "ReservationBlockedDate"("restaurantId", "date");

-- CreateIndex
CREATE INDEX "RestaurantEvent_restaurantId_date_status_idx" ON "RestaurantEvent"("restaurantId", "date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantEvent_id_restaurantId_key" ON "RestaurantEvent"("id", "restaurantId");

-- CreateIndex
CREATE INDEX "TableReservation_restaurantId_date_status_idx" ON "TableReservation"("restaurantId", "date", "status");

-- CreateIndex
CREATE INDEX "TableReservation_restaurantId_status_idx" ON "TableReservation"("restaurantId", "status");

-- CreateIndex
CREATE INDEX "TableReservation_eventId_idx" ON "TableReservation"("eventId");

INSERT INTO Organization (id,name,slug,status,maxRestaurants,createdAt,updatedAt) SELECT t.id,t.name,t.slug,t.status,MAX(1,t.maxMenus,(SELECT COUNT(*) FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=t.id)),t.createdAt,t.updatedAt FROM "_OrganizationLegacy_Tenant" t;
INSERT INTO Restaurant (id,organizationId,name,publicDescription,assetQuotaBytes,dailyReservationCapacity,slug,landingSlug,status,landingEnabled,createdAt,updatedAt) SELECT p.id,t.id,p.name,p.publicDescription,t.assetQuotaBytes,t.dailyReservationCapacity,p.slug,CASE WHEN p.id=(SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId = t.id ORDER BY p.isPrimary DESC, p.createdAt ASC, p.id ASC LIMIT 1) THEN t.slug ELSE p.slug END,'ACTIVE',t.landingEnabled,p.createdAt,p.updatedAt FROM "_OrganizationLegacy_MenuProject" p JOIN "_OrganizationLegacy_Tenant" t ON p.tenantId=t.id;
INSERT INTO Restaurant (id,organizationId,name,publicDescription,assetQuotaBytes,dailyReservationCapacity,slug,landingSlug,status,landingEnabled,createdAt,updatedAt) SELECT 'restaurant-'||t.id,t.id,t.name,t.publicDescription,t.assetQuotaBytes,t.dailyReservationCapacity,t.slug,t.slug,'ACTIVE',t.landingEnabled,t.createdAt,t.updatedAt FROM "_OrganizationLegacy_Tenant" t WHERE NOT EXISTS (SELECT 1 FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=t.id);

-- Allocate colliding public slugs deterministically; existing public URLs get priority.
WITH RECURSIVE sources AS (
 SELECT id,"slug" AS base,ROW_NUMBER() OVER (ORDER BY CASE WHEN EXISTS(SELECT 1 FROM "_OrganizationLegacy_MenuProject" p WHERE p.id=Restaurant.id) THEN 0 ELSE 1 END,createdAt,id) AS rn FROM Restaurant
), walk(rn,attempt,candidate,used) AS (
 SELECT 1,0,(SELECT base FROM sources WHERE rn=1),json_array() WHERE EXISTS (SELECT 1 FROM sources)
 UNION ALL
 SELECT
  CASE WHEN EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate) THEN walk.rn ELSE walk.rn+1 END,
  CASE WHEN EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate) THEN walk.attempt+1 ELSE 0 END,
  CASE WHEN EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate)
   THEN rtrim(substr(sources.base,1,49-length(CAST(walk.attempt+1 AS TEXT))),'-')||'-'||(walk.attempt+1)
   ELSE (SELECT base FROM sources next WHERE next.rn=walk.rn+1) END,
  CASE WHEN EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate) THEN walk.used ELSE json_insert(walk.used,'$[#]',walk.candidate) END
 FROM walk JOIN sources ON sources.rn=walk.rn
 WHERE walk.rn < (SELECT MAX(rn) FROM sources) OR EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate)
), chosen AS (
 SELECT sources.id,walk.candidate FROM walk JOIN sources ON sources.rn=walk.rn WHERE NOT EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate)
) UPDATE Restaurant SET "slug"=(SELECT candidate FROM chosen WHERE chosen.id=Restaurant.id);

-- Allocate colliding public slugs deterministically; existing public URLs get priority.
WITH RECURSIVE sources AS (
 SELECT id,"landingSlug" AS base,ROW_NUMBER() OVER (ORDER BY CASE WHEN Restaurant.id=COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=Restaurant.organizationId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||Restaurant.organizationId) THEN 0 ELSE 1 END,createdAt,id) AS rn FROM Restaurant
), walk(rn,attempt,candidate,used) AS (
 SELECT 1,0,(SELECT base FROM sources WHERE rn=1),json_array() WHERE EXISTS (SELECT 1 FROM sources)
 UNION ALL
 SELECT
  CASE WHEN EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate) THEN walk.rn ELSE walk.rn+1 END,
  CASE WHEN EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate) THEN walk.attempt+1 ELSE 0 END,
  CASE WHEN EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate)
   THEN rtrim(substr(sources.base,1,49-length(CAST(walk.attempt+1 AS TEXT))),'-')||'-'||(walk.attempt+1)
   ELSE (SELECT base FROM sources next WHERE next.rn=walk.rn+1) END,
  CASE WHEN EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate) THEN walk.used ELSE json_insert(walk.used,'$[#]',walk.candidate) END
 FROM walk JOIN sources ON sources.rn=walk.rn
 WHERE walk.rn < (SELECT MAX(rn) FROM sources) OR EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate)
), chosen AS (
 SELECT sources.id,walk.candidate FROM walk JOIN sources ON sources.rn=walk.rn WHERE NOT EXISTS(SELECT 1 FROM json_each(walk.used) WHERE value=walk.candidate)
) UPDATE Restaurant SET "landingSlug"=(SELECT candidate FROM chosen WHERE chosen.id=Restaurant.id);
CREATE UNIQUE INDEX "Restaurant_slug_key" ON "Restaurant"("slug");
CREATE UNIQUE INDEX "Restaurant_landingSlug_key" ON "Restaurant"("landingSlug");
INSERT INTO "Admin" ("id","email","passwordHash","role","organizationId","mustChangePassword","lastLoginAt","createdAt","updatedAt") SELECT old."id",old."email",old."passwordHash",old."role",old.tenantId,old."mustChangePassword",old."lastLoginAt",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_Admin" old;
INSERT INTO "Session" ("id","adminId","jti","expiresAt","revoked","createdAt") SELECT old."id",old."adminId",old."jti",old."expiresAt",old."revoked",old."createdAt" FROM "_OrganizationLegacy_Session" old;
INSERT INTO "LoginThrottle" ("key","failures","windowStartedAt","blockedUntil","updatedAt") SELECT old."key",old."failures",old."windowStartedAt",old."blockedUntil",old."updatedAt" FROM "_OrganizationLegacy_LoginThrottle" old;
INSERT INTO "AssetCleanupJob" ("id","storageKey","deletePrefix","attempts","availableAt","lastError","createdAt","updatedAt") SELECT old."id",old."storageKey",old."deletePrefix",old."attempts",old."availableAt",old."lastError",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_AssetCleanupJob" old;
INSERT INTO "MenuProject" ("id","restaurantId","name","slug","publicDescription","isPrimary","draftJson","draftRevision","publishedJson","publishedRevision","publishedAt","schemaVersion","createdAt","updatedAt") SELECT old."id",old.id,old."name",old."slug",old."publicDescription",old."isPrimary",old."draftJson",old."draftRevision",old."publishedJson",old."publishedRevision",old."publishedAt",old."schemaVersion",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_MenuProject" old;
INSERT INTO "MenuAsset" ("id","restaurantId","kind","name","storageKey","mimeType","byteSize","checksum","width","height","fontFamily","createdAt","updatedAt") SELECT old."id",COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."kind",old."name",old."storageKey",old."mimeType",old."byteSize",old."checksum",old."width",old."height",old."fontFamily",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_MenuAsset" old;
INSERT INTO "MenuAssetReference" ("restaurantId","projectId","assetId","scope") SELECT COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."projectId",old."assetId",old."scope" FROM "_OrganizationLegacy_MenuAssetReference" old WHERE old.projectId=(SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1);
INSERT INTO "MenuTemplate" ("id","restaurantId","name","description","documentJson","schemaVersion","visibility","status","isSystem","rejectionReason","submittedAt","publishedAt","createdAt","updatedAt") SELECT old."id",COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."name",old."description",old."documentJson",old."schemaVersion",old."visibility",old."status",old."isSystem",old."rejectionReason",old."submittedAt",old."publishedAt",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_MenuTemplate" old;
INSERT INTO "MenuTemplateAsset" ("id","templateId","kind","name","storageKey","mimeType","byteSize","checksum","width","height","fontFamily","createdAt","updatedAt") SELECT old."id",old."templateId",old."kind",old."name",old."storageKey",old."mimeType",old."byteSize",old."checksum",old."width",old."height",old."fontFamily",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_MenuTemplateAsset" old;
INSERT INTO "MenuTemplateAssetReference" ("restaurantId","templateId","assetId") SELECT COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."templateId",old."assetId" FROM "_OrganizationLegacy_MenuTemplateAssetReference" old;
INSERT INTO "LandingPage" ("id","restaurantId","documentJson","htmlContent","cssContent","jsContent","published","publishedAt","createdAt","updatedAt") SELECT old."id",COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."documentJson",old."htmlContent",old."cssContent",old."jsContent",old."published",old."publishedAt",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_LandingPage" old;
INSERT INTO "LandingCustomModule" ("id","restaurantId","name","description","category","fieldsJson","htmlTemplate","cssTemplate","jsTemplate","createdAt","updatedAt") SELECT old."id",COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."name",old."description",old."category",old."fieldsJson",old."htmlTemplate",old."cssTemplate",old."jsTemplate",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_LandingCustomModule" old;
INSERT INTO "LandingTemplate" ("id","restaurantId","name","description","documentJson","htmlContent","cssContent","jsContent","schemaVersion","visibility","status","isSystem","rejectionReason","submittedAt","publishedAt","createdAt","updatedAt") SELECT old."id",COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."name",old."description",old."documentJson",old."htmlContent",old."cssContent",old."jsContent",old."schemaVersion",old."visibility",old."status",old."isSystem",old."rejectionReason",old."submittedAt",old."publishedAt",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_LandingTemplate" old;
INSERT INTO "ReservationTimeSlot" ("id","restaurantId","time","label","active","sortOrder","createdAt","updatedAt") SELECT old."id",COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."time",old."label",old."active",old."sortOrder",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_ReservationTimeSlot" old;
INSERT INTO "ReservationRecurringClosure" ("id","restaurantId","dayOfWeek","reason","createdAt","updatedAt") SELECT old."id",COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."dayOfWeek",old."reason",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_ReservationRecurringClosure" old;
INSERT INTO "ReservationBlockedDate" ("id","restaurantId","date","reason","createdAt","updatedAt") SELECT old."id",COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."date",old."reason",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_ReservationBlockedDate" old;
INSERT INTO "RestaurantEvent" ("id","restaurantId","title","description","date","startTime","endTime","capacity","priceLabel","imageUrl","blocksRegularReservations","status","createdAt","updatedAt") SELECT old."id",COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."title",old."description",old."date",old."startTime",old."endTime",old."capacity",old."priceLabel",old."imageUrl",old."blocksRegularReservations",old."status",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_RestaurantEvent" old;
INSERT INTO "TableReservation" ("id","restaurantId","code","customerName","customerEmail","customerPhone","partySize","date","time","notes","adminNotes","status","source","eventId","createdAt","updatedAt") SELECT old."id",COALESCE((SELECT p.id FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=old.tenantId ORDER BY p.isPrimary DESC,p.createdAt,p.id LIMIT 1),'restaurant-'||old.tenantId),old."code",old."customerName",old."customerEmail",old."customerPhone",old."partySize",old."date",old."time",old."notes",old."adminNotes",old."status",old."source",old."eventId",old."createdAt",old."updatedAt" FROM "_OrganizationLegacy_TableReservation" old;
INSERT INTO MenuProject (id,restaurantId,name,slug,publicDescription,isPrimary,draftJson,schemaVersion,createdAt,updatedAt) SELECT 'menu-'||t.id,'restaurant-'||t.id,t.name,(SELECT r.slug FROM Restaurant r WHERE r.id='restaurant-'||t.id),t.publicDescription,1,'{"schemaVersion":1,"background":"#FFFFFF","initialViewport":{"x":0,"y":0,"width":1240,"height":900},"nodes":[],"groups":[]}',1,t.createdAt,t.updatedAt FROM "_OrganizationLegacy_Tenant" t WHERE NOT EXISTS (SELECT 1 FROM "_OrganizationLegacy_MenuProject" p WHERE p.tenantId=t.id);
INSERT OR REPLACE INTO AppSchemaState (id,generation,state,migrationJson,updatedAt) VALUES ('singleton',2,CASE WHEN EXISTS (SELECT 1 FROM "_OrganizationLegacy_Tenant") THEN 'MIGRATING' ELSE 'READY' END,CASE WHEN EXISTS(SELECT 1 FROM "_OrganizationLegacy_Tenant") THEN json_object('tenants',json((SELECT json_group_array(json_object('id',"id",'slug',"slug",'dailyReservationCapacity',"dailyReservationCapacity")) FROM "_OrganizationLegacy_Tenant")),'projects',json((SELECT json_group_array(json_object('id',"id",'tenantId',"tenantId",'name',"name",'slug',"slug",'publicDescription',"publicDescription",'isPrimary',"isPrimary",'draftJson',"draftJson",'draftRevision',"draftRevision",'publishedJson',"publishedJson",'publishedRevision',"publishedRevision",'publishedAt',"publishedAt",'schemaVersion',"schemaVersion",'createdAt',"createdAt",'updatedAt',"updatedAt")) FROM "_OrganizationLegacy_MenuProject")),'assets',json((SELECT json_group_array(json_object('id',"id",'tenantId',"tenantId",'kind',"kind",'name',"name",'storageKey',"storageKey",'mimeType',"mimeType",'byteSize',"byteSize",'checksum',"checksum",'width',"width",'height',"height",'fontFamily',"fontFamily",'createdAt',"createdAt",'updatedAt',"updatedAt")) FROM "_OrganizationLegacy_MenuAsset")),'templates',json((SELECT json_group_array(json_object('id',"id",'tenantId',"tenantId",'name',"name",'description',"description",'documentJson',"documentJson",'schemaVersion',"schemaVersion",'visibility',"visibility",'status',"status",'isSystem',"isSystem",'rejectionReason',"rejectionReason",'submittedAt',"submittedAt",'publishedAt',"publishedAt",'createdAt',"createdAt",'updatedAt',"updatedAt")) FROM "_OrganizationLegacy_MenuTemplate")),'landings',json((SELECT json_group_array(json_object('tenantId',"tenantId",'published',"published")) FROM "_OrganizationLegacy_LandingPage"))) ELSE NULL END,CURRENT_TIMESTAMP);
DROP TABLE "_OrganizationLegacy_Admin";
DROP TABLE "_OrganizationLegacy_Tenant";
DROP TABLE "_OrganizationLegacy_Session";
DROP TABLE "_OrganizationLegacy_LoginThrottle";
DROP TABLE "_OrganizationLegacy_AssetCleanupJob";
DROP TABLE "_OrganizationLegacy_MenuProject";
DROP TABLE "_OrganizationLegacy_MenuAsset";
DROP TABLE "_OrganizationLegacy_MenuAssetReference";
DROP TABLE "_OrganizationLegacy_MenuTemplate";
DROP TABLE "_OrganizationLegacy_MenuTemplateAsset";
DROP TABLE "_OrganizationLegacy_MenuTemplateAssetReference";
DROP TABLE "_OrganizationLegacy_LandingPage";
DROP TABLE "_OrganizationLegacy_LandingCustomModule";
DROP TABLE "_OrganizationLegacy_LandingTemplate";
DROP TABLE "_OrganizationLegacy_ReservationTimeSlot";
DROP TABLE "_OrganizationLegacy_ReservationRecurringClosure";
DROP TABLE "_OrganizationLegacy_ReservationBlockedDate";
DROP TABLE "_OrganizationLegacy_RestaurantEvent";
DROP TABLE "_OrganizationLegacy_TableReservation";
COMMIT;
PRAGMA foreign_keys=ON;
