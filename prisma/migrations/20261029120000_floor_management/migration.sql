-- Generation 3: floor plans, physical allocations, and a restaurant-scoped shared reader.
-- Preserve existing CHECK constraints, NOCASE email uniqueness, and all current data.
PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;

ALTER TABLE "Restaurant" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';
ALTER TABLE "Restaurant" ADD COLUMN "floorManagementEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TableReservation" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0 CONSTRAINT "TableReservation_revision_check" CHECK (typeof("revision")='integer' AND "revision">=0);
CREATE UNIQUE INDEX "TableReservation_id_restaurantId_key" ON "TableReservation"("id","restaurantId");

CREATE TABLE "new_Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL COLLATE NOCASE,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TENANT_ADMIN',
    "organizationId" TEXT,
    "restaurantId" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Admin_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Admin_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Admin_role_check" CHECK ("role" IN ('SUPER_ADMIN','TENANT_ADMIN','WAITER')),
    CONSTRAINT "Admin_role_organization_check" CHECK (("role"='SUPER_ADMIN' AND "organizationId" IS NULL AND "restaurantId" IS NULL) OR ("role"='TENANT_ADMIN' AND "organizationId" IS NOT NULL AND "restaurantId" IS NULL) OR ("role"='WAITER' AND "organizationId" IS NULL AND "restaurantId" IS NOT NULL))
);
INSERT INTO "new_Admin" ("id","email","passwordHash","role","organizationId","restaurantId","mustChangePassword","lastLoginAt","createdAt","updatedAt") SELECT "id","email","passwordHash","role","organizationId",NULL,"mustChangePassword","lastLoginAt","createdAt","updatedAt" FROM "Admin";
DROP TABLE "Admin";
ALTER TABLE "new_Admin" RENAME TO "Admin";
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");
CREATE UNIQUE INDEX "Admin_organizationId_key" ON "Admin"("organizationId");
CREATE UNIQUE INDEX "Admin_restaurantId_key" ON "Admin"("restaurantId");

CREATE TABLE "new_AppSchemaState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "generation" INTEGER NOT NULL DEFAULT 3,
    "state" TEXT NOT NULL DEFAULT 'READY',
    "migrationJson" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSchemaState" ("id","generation","state","migrationJson","updatedAt") SELECT "id",3,"state","migrationJson","updatedAt" FROM "AppSchemaState";
DROP TABLE "AppSchemaState";
ALTER TABLE "new_AppSchemaState" RENAME TO "AppSchemaState";

CREATE TABLE "DiningRoom" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" REAL NOT NULL DEFAULT 1200,
    "height" REAL NOT NULL DEFAULT 800,
    "fixturesJson" TEXT NOT NULL DEFAULT '[]',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiningRoom_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiningRoom_width_check" CHECK ("width">0),
    CONSTRAINT "DiningRoom_height_check" CHECK ("height">0),
    CONSTRAINT "DiningRoom_revision_check" CHECK (typeof("revision")='integer' AND "revision">=0)
);
CREATE UNIQUE INDEX "DiningRoom_id_restaurantId_key" ON "DiningRoom"("id", "restaurantId");
CREATE UNIQUE INDEX "DiningRoom_restaurantId_name_key" ON "DiningRoom"("restaurantId", "name");

CREATE TABLE "DiningTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "shape" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL DEFAULT 80,
    "height" REAL NOT NULL DEFAULT 80,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiningTable_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiningTable_roomId_restaurantId_fkey" FOREIGN KEY ("roomId", "restaurantId") REFERENCES "DiningRoom" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiningTable_width_check" CHECK ("width">0),
    CONSTRAINT "DiningTable_height_check" CHECK ("height">0),
    CONSTRAINT "DiningTable_shape_check" CHECK ("shape" IN ('SQUARE','RECTANGLE','CIRCLE')),
    CONSTRAINT "DiningTable_capacity_check" CHECK (typeof("capacity")='integer' AND "capacity">=1),
    CONSTRAINT "DiningTable_rotation_check" CHECK ("rotation" IN (0,90,180,270))
);
CREATE INDEX "DiningTable_restaurantId_roomId_active_idx" ON "DiningTable"("restaurantId", "roomId", "active");
CREATE UNIQUE INDEX "DiningTable_id_restaurantId_roomId_key" ON "DiningTable"("id", "restaurantId", "roomId");
CREATE UNIQUE INDEX "DiningTable_roomId_label_key" ON "DiningTable"("roomId", "label");

CREATE TABLE "DiningTableCombination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiningTableCombination_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiningTableCombination_roomId_restaurantId_fkey" FOREIGN KEY ("roomId", "restaurantId") REFERENCES "DiningRoom" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiningTableCombination_capacity_check" CHECK (typeof("capacity")='integer' AND "capacity">=1)
);
CREATE UNIQUE INDEX "DiningTableCombination_id_restaurantId_roomId_key" ON "DiningTableCombination"("id", "restaurantId", "roomId");
CREATE UNIQUE INDEX "DiningTableCombination_roomId_name_key" ON "DiningTableCombination"("roomId", "name");

CREATE TABLE "DiningTableCombinationMember" (
    "combinationId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "rotation" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("combinationId", "tableId"),
    CONSTRAINT "DiningTableCombinationMember_combinationId_restaurantId_roomId_fkey" FOREIGN KEY ("combinationId", "restaurantId", "roomId") REFERENCES "DiningTableCombination" ("id", "restaurantId", "roomId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiningTableCombinationMember_tableId_restaurantId_roomId_fkey" FOREIGN KEY ("tableId", "restaurantId", "roomId") REFERENCES "DiningTable" ("id", "restaurantId", "roomId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiningTableCombinationMember_rotation_check" CHECK ("rotation" IN (0,90,180,270))
);


CREATE TABLE "RestaurantEventRoom" (
    "eventId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,

    PRIMARY KEY ("eventId", "roomId"),
    CONSTRAINT "RestaurantEventRoom_eventId_restaurantId_fkey" FOREIGN KEY ("eventId", "restaurantId") REFERENCES "RestaurantEvent" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RestaurantEventRoom_roomId_restaurantId_fkey" FOREIGN KEY ("roomId", "restaurantId") REFERENCES "DiningRoom" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE
);


CREATE TABLE "ReservationAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "combinationId" TEXT,
    "capacity" INTEGER NOT NULL,
    "timeZone" TEXT NOT NULL,
    "serviceStartAt" DATETIME NOT NULL,
    "serviceEndAt" DATETIME NOT NULL,
    "blockedFrom" DATETIME NOT NULL,
    "blockedUntil" DATETIME NOT NULL,
    "releasedAt" DATETIME,
    "roomRevision" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReservationAllocation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationAllocation_reservationId_restaurantId_fkey" FOREIGN KEY ("reservationId", "restaurantId") REFERENCES "TableReservation" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationAllocation_roomId_restaurantId_fkey" FOREIGN KEY ("roomId", "restaurantId") REFERENCES "DiningRoom" ("id", "restaurantId") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "ReservationAllocation_combinationId_restaurantId_roomId_fkey" FOREIGN KEY ("combinationId", "restaurantId", "roomId") REFERENCES "DiningTableCombination" ("id", "restaurantId", "roomId") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "ReservationAllocation_capacity_check" CHECK (typeof("capacity")='integer' AND "capacity">=1),
    CONSTRAINT "ReservationAllocation_roomRevision_check" CHECK (typeof("roomRevision")='integer' AND "roomRevision">=0),
    CONSTRAINT "ReservationAllocation_version_check" CHECK (typeof("version")='integer' AND "version">=0),
    CONSTRAINT "ReservationAllocation_service_interval_check" CHECK ("serviceEndAt">"serviceStartAt"),
    CONSTRAINT "ReservationAllocation_blocked_interval_check" CHECK ("blockedUntil">"blockedFrom" AND "blockedFrom"<="serviceStartAt" AND "blockedUntil">="serviceEndAt")
);
CREATE UNIQUE INDEX "ReservationAllocation_reservationId_key" ON "ReservationAllocation"("reservationId");
CREATE UNIQUE INDEX "ReservationAllocation_id_restaurantId_roomId_key" ON "ReservationAllocation"("id", "restaurantId", "roomId");
CREATE UNIQUE INDEX "ReservationAllocation_reservationId_restaurantId_key" ON "ReservationAllocation"("reservationId", "restaurantId");

CREATE TABLE "ReservationAllocationTable" (
    "allocationId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "labelSnapshot" TEXT NOT NULL,
    "shapeSnapshot" TEXT NOT NULL,
    "capacitySnapshot" INTEGER NOT NULL,
    "width" REAL NOT NULL,
    "height" REAL NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "rotation" INTEGER NOT NULL,

    PRIMARY KEY ("allocationId", "tableId"),
    CONSTRAINT "ReservationAllocationTable_allocationId_restaurantId_roomId_fkey" FOREIGN KEY ("allocationId", "restaurantId", "roomId") REFERENCES "ReservationAllocation" ("id", "restaurantId", "roomId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationAllocationTable_tableId_restaurantId_roomId_fkey" FOREIGN KEY ("tableId", "restaurantId", "roomId") REFERENCES "DiningTable" ("id", "restaurantId", "roomId") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "ReservationAllocationTable_width_check" CHECK ("width">0),
    CONSTRAINT "ReservationAllocationTable_height_check" CHECK ("height">0),
    CONSTRAINT "ReservationAllocationTable_shapeSnapshot_check" CHECK ("shapeSnapshot" IN ('SQUARE','RECTANGLE','CIRCLE')),
    CONSTRAINT "ReservationAllocationTable_capacitySnapshot_check" CHECK (typeof("capacitySnapshot")='integer' AND "capacitySnapshot">=1),
    CONSTRAINT "ReservationAllocationTable_rotation_check" CHECK ("rotation" IN (0,90,180,270))
);
CREATE INDEX "ReservationAllocationTable_restaurantId_tableId_allocationId_idx" ON "ReservationAllocationTable"("restaurantId", "tableId", "allocationId");

CREATE TEMP TABLE "_FloorManagementForeignKeyGuard" ("violations" INTEGER NOT NULL CONSTRAINT "FloorManagement_foreign_keys_check" CHECK ("violations"=0));
CREATE INDEX "DiningTableCombinationMember_restaurantId_tableId_idx" ON "DiningTableCombinationMember"("restaurantId","tableId");
CREATE INDEX "RestaurantEventRoom_restaurantId_roomId_idx" ON "RestaurantEventRoom"("restaurantId","roomId");
CREATE INDEX "ReservationAllocation_restaurantId_blockedFrom_idx" ON "ReservationAllocation"("restaurantId","blockedFrom");
CREATE INDEX "ReservationAllocation_restaurantId_roomId_blockedFrom_idx" ON "ReservationAllocation"("restaurantId","roomId","blockedFrom");
INSERT INTO "_FloorManagementForeignKeyGuard" SELECT COUNT(*) FROM pragma_foreign_key_check;
DROP TABLE "_FloorManagementForeignKeyGuard";
COMMIT;
PRAGMA foreign_keys=ON;

