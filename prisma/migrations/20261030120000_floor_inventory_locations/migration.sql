-- Generation 4: table inventory, allowed assembly sectors and walk-in service.
-- Keep the previous SQL constraints and every historical allocation unchanged.
PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;

CREATE TABLE "DiningRoomLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL,
    "height" REAL NOT NULL,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiningRoomLocation_roomId_restaurantId_fkey" FOREIGN KEY ("roomId", "restaurantId") REFERENCES "DiningRoom" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DiningRoomLocation_width_check" CHECK ("width">0),
    CONSTRAINT "DiningRoomLocation_height_check" CHECK ("height">0),
    CONSTRAINT "DiningRoomLocation_rotation_check" CHECK ("rotation" IN (0,90,180,270))
);
CREATE UNIQUE INDEX "DiningRoomLocation_id_restaurantId_roomId_key" ON "DiningRoomLocation"("id","restaurantId","roomId");
CREATE UNIQUE INDEX "DiningRoomLocation_roomId_name_key" ON "DiningRoomLocation"("roomId","name");
CREATE INDEX "DiningRoomLocation_restaurantId_roomId_active_idx" ON "DiningRoomLocation"("restaurantId","roomId","active");

-- Existing rooms retain their full usable footprint and all saved table poses.
INSERT INTO "DiningRoomLocation" ("id","restaurantId","roomId","name","x","y","width","height","active","createdAt","updatedAt")
SELECT 'legacy-room-location-' || "id","restaurantId","id",'Salón completo',"width"/2.0,"height"/2.0,"width","height","active","createdAt","updatedAt" FROM "DiningRoom";

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
    "revision" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TableReservation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TableReservation_eventId_restaurantId_fkey" FOREIGN KEY ("eventId", "restaurantId") REFERENCES "RestaurantEvent" ("id", "restaurantId") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "TableReservation_partySize_check" CHECK (typeof("partySize")='integer' AND "partySize">=1),
    CONSTRAINT "TableReservation_status_check" CHECK ("status" IN ('PENDING','CONFIRMED','COMPLETED','CANCELLED','REJECTED')),
    CONSTRAINT "TableReservation_source_check" CHECK ("source" IN ('ADMIN','LANDING','WALK_IN')),
    CONSTRAINT "TableReservation_revision_check" CHECK (typeof("revision")='integer' AND "revision">=0)
);
INSERT INTO "new_TableReservation" SELECT "id","restaurantId","code","customerName","customerEmail","customerPhone","partySize","date","time","notes","adminNotes","status","source","eventId","createdAt","updatedAt","revision" FROM "TableReservation";
DROP TABLE "TableReservation";
ALTER TABLE "new_TableReservation" RENAME TO "TableReservation";
CREATE UNIQUE INDEX "TableReservation_id_restaurantId_key" ON "TableReservation"("id","restaurantId");
CREATE UNIQUE INDEX "TableReservation_restaurantId_code_key" ON "TableReservation"("restaurantId","code");
CREATE INDEX "TableReservation_restaurantId_date_status_idx" ON "TableReservation"("restaurantId","date","status");
CREATE INDEX "TableReservation_restaurantId_status_idx" ON "TableReservation"("restaurantId","status");
CREATE INDEX "TableReservation_eventId_idx" ON "TableReservation"("eventId");

CREATE TABLE "new_ReservationAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "combinationId" TEXT,
    "locationId" TEXT,
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
    CONSTRAINT "ReservationAllocation_reservationId_restaurantId_fkey" FOREIGN KEY ("reservationId","restaurantId") REFERENCES "TableReservation" ("id","restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationAllocation_roomId_restaurantId_fkey" FOREIGN KEY ("roomId","restaurantId") REFERENCES "DiningRoom" ("id","restaurantId") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "ReservationAllocation_combinationId_restaurantId_roomId_fkey" FOREIGN KEY ("combinationId","restaurantId","roomId") REFERENCES "DiningTableCombination" ("id","restaurantId","roomId") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "ReservationAllocation_locationId_restaurantId_roomId_fkey" FOREIGN KEY ("locationId","restaurantId","roomId") REFERENCES "DiningRoomLocation" ("id","restaurantId","roomId") ON DELETE NO ACTION ON UPDATE CASCADE,
    CONSTRAINT "ReservationAllocation_capacity_check" CHECK (typeof("capacity")='integer' AND "capacity">=1),
    CONSTRAINT "ReservationAllocation_roomRevision_check" CHECK (typeof("roomRevision")='integer' AND "roomRevision">=0),
    CONSTRAINT "ReservationAllocation_version_check" CHECK (typeof("version")='integer' AND "version">=0),
    CONSTRAINT "ReservationAllocation_service_interval_check" CHECK ("serviceEndAt">"serviceStartAt"),
    CONSTRAINT "ReservationAllocation_blocked_interval_check" CHECK ("blockedUntil">"blockedFrom" AND "blockedFrom"<="serviceStartAt" AND "blockedUntil">="serviceEndAt")
);
INSERT INTO "new_ReservationAllocation" SELECT "id","restaurantId","reservationId","roomId","combinationId",'legacy-room-location-' || "roomId","capacity","timeZone","serviceStartAt","serviceEndAt","blockedFrom","blockedUntil","releasedAt","roomRevision","version","createdAt","updatedAt" FROM "ReservationAllocation";
DROP TABLE "ReservationAllocation";
ALTER TABLE "new_ReservationAllocation" RENAME TO "ReservationAllocation";
CREATE UNIQUE INDEX "ReservationAllocation_reservationId_key" ON "ReservationAllocation"("reservationId");
CREATE UNIQUE INDEX "ReservationAllocation_id_restaurantId_roomId_key" ON "ReservationAllocation"("id","restaurantId","roomId");
CREATE UNIQUE INDEX "ReservationAllocation_reservationId_restaurantId_key" ON "ReservationAllocation"("reservationId","restaurantId");
CREATE INDEX "ReservationAllocation_restaurantId_blockedFrom_idx" ON "ReservationAllocation"("restaurantId","blockedFrom");
CREATE INDEX "ReservationAllocation_restaurantId_roomId_blockedFrom_idx" ON "ReservationAllocation"("restaurantId","roomId","blockedFrom");
CREATE INDEX "ReservationAllocation_restaurantId_roomId_locationId_blockedFrom_idx" ON "ReservationAllocation"("restaurantId","roomId","locationId","blockedFrom");

CREATE TABLE "new_AppSchemaState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "generation" INTEGER NOT NULL DEFAULT 4,
    "state" TEXT NOT NULL DEFAULT 'READY',
    "migrationJson" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSchemaState" SELECT "id",4,"state","migrationJson","updatedAt" FROM "AppSchemaState";
DROP TABLE "AppSchemaState";
ALTER TABLE "new_AppSchemaState" RENAME TO "AppSchemaState";

CREATE TEMP TABLE "_FloorInventoryForeignKeyGuard" ("violations" INTEGER NOT NULL CONSTRAINT "FloorInventory_foreign_keys_check" CHECK ("violations"=0));
INSERT INTO "_FloorInventoryForeignKeyGuard" SELECT COUNT(*) FROM pragma_foreign_key_check;
DROP TABLE "_FloorInventoryForeignKeyGuard";
COMMIT;
PRAGMA foreign_keys=ON;
