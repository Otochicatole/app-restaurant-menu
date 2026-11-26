PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;

-- AlterTable Restaurant
ALTER TABLE "Restaurant" ADD COLUMN "reservationPreparationMinutes" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "Restaurant" ADD COLUMN "reservationDurationMinutes" INTEGER NOT NULL DEFAULT 120;

-- Recreate TableReservation with NO_SHOW in check constraint
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
    CONSTRAINT "TableReservation_status_check" CHECK ("status" IN ('PENDING','CONFIRMED','COMPLETED','CANCELLED','REJECTED','NO_SHOW')),
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

-- Recreate ServiceAccount with tipCents, discountCents, discountReason, cashCents, cardCents, transferCents
CREATE TABLE "new_ServiceAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "reservationCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedBy" TEXT NOT NULL,
    "closedAt" DATETIME,
    "closedBy" TEXT,
    "businessDate" TEXT,
    "paymentMethod" TEXT,
    "totalCents" INTEGER,
    "receiptNumber" TEXT,
    "tipCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "cashCents" INTEGER NOT NULL DEFAULT 0,
    "cardCents" INTEGER NOT NULL DEFAULT 0,
    "transferCents" INTEGER NOT NULL DEFAULT 0,
    CHECK (typeof("version") = 'integer' AND "version" >= 0 AND ("paymentMethod" IS NULL OR "paymentMethod" IN ('CASH','CARD','TRANSFER_QR','SPLIT'))),
    CHECK (("closedAt" IS NULL AND "closedBy" IS NULL AND "receiptNumber" IS NULL AND "businessDate" IS NULL AND "totalCents" IS NULL AND "paymentMethod" IS NULL)
        OR ("closedAt" IS NOT NULL AND "closedBy" IS NOT NULL AND "receiptNumber" IS NOT NULL AND "businessDate" IS NOT NULL AND "totalCents" IS NOT NULL AND
           typeof("totalCents") = 'integer' AND "totalCents" <= 2147483647 AND
           (("totalCents" = 0 AND "paymentMethod" IS NULL) OR ("totalCents" > 0 AND "paymentMethod" IS NOT NULL)))),
    CHECK ("tipCents" >= 0 AND "discountCents" >= 0 AND "cashCents" >= 0 AND "cardCents" >= 0 AND "transferCents" >= 0),
    CONSTRAINT "ServiceAccount_allocationId_restaurantId_reservationId_roomId_fkey" FOREIGN KEY ("allocationId", "restaurantId", "reservationId", "roomId") REFERENCES "ReservationAllocation" ("id", "restaurantId", "reservationId", "roomId") ON DELETE RESTRICT ON UPDATE RESTRICT
);
INSERT INTO "new_ServiceAccount" ("id", "restaurantId", "reservationId", "allocationId", "roomId", "roomName", "reservationCode", "customerName", "version", "openedAt", "openedBy", "closedAt", "closedBy", "businessDate", "paymentMethod", "totalCents", "receiptNumber", "tipCents", "discountCents", "discountReason", "cashCents", "cardCents", "transferCents")
SELECT "id", "restaurantId", "reservationId", "allocationId", "roomId", "roomName", "reservationCode", "customerName", "version", "openedAt", "openedBy", "closedAt", "closedBy", "businessDate", "paymentMethod", "totalCents", "receiptNumber", 0, 0, NULL,
  CASE WHEN "paymentMethod" = 'CASH' THEN coalesce("totalCents", 0) ELSE 0 END,
  CASE WHEN "paymentMethod" = 'CARD' THEN coalesce("totalCents", 0) ELSE 0 END,
  CASE WHEN "paymentMethod" = 'TRANSFER_QR' THEN coalesce("totalCents", 0) ELSE 0 END
FROM "ServiceAccount";
DROP TABLE "ServiceAccount";
ALTER TABLE "new_ServiceAccount" RENAME TO "ServiceAccount";
CREATE UNIQUE INDEX "ServiceAccount_id_restaurantId_key" ON "ServiceAccount"("id", "restaurantId");
CREATE UNIQUE INDEX "ServiceAccount_id_restaurantId_roomId_key" ON "ServiceAccount"("id", "restaurantId", "roomId");
CREATE UNIQUE INDEX "ServiceAccount_restaurantId_receiptNumber_key" ON "ServiceAccount"("restaurantId", "receiptNumber");
CREATE INDEX "ServiceAccount_restaurantId_closedAt_idx" ON "ServiceAccount"("restaurantId", "closedAt");
CREATE INDEX "ServiceAccount_restaurantId_businessDate_closedAt_idx" ON "ServiceAccount"("restaurantId", "businessDate", "closedAt");
CREATE INDEX "ServiceAccount_allocationId_closedAt_idx" ON "ServiceAccount"("allocationId", "closedAt");

-- Recreate ServiceOrderLine with notes, kitchenStatus, round, station
CREATE TABLE "new_ServiceOrderLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "deliveredQuantity" INTEGER NOT NULL DEFAULT 0,
    "cancelledQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL DEFAULT '',
    "kitchenStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "round" INTEGER NOT NULL DEFAULT 1,
    "station" TEXT NOT NULL DEFAULT 'KITCHEN',
    CHECK (typeof("unitPriceCents") = 'integer' AND "unitPriceCents" BETWEEN 1 AND 2147483647),
    CHECK (typeof("quantity") = 'integer' AND "quantity" BETWEEN 1 AND 99),
    CHECK (typeof("deliveredQuantity") = 'integer' AND "deliveredQuantity" BETWEEN 0 AND 99),
    CHECK (typeof("cancelledQuantity") = 'integer' AND "cancelledQuantity" BETWEEN 0 AND 99),
    CHECK ("deliveredQuantity" + "cancelledQuantity" <= "quantity"),
    CHECK ("kitchenStatus" IN ('PENDING', 'IN_PREP', 'READY', 'SERVED', 'CANCELLED')),
    CHECK ("station" IN ('KITCHEN', 'BAR')),
    CONSTRAINT "ServiceOrderLine_accountId_restaurantId_fkey" FOREIGN KEY ("accountId", "restaurantId") REFERENCES "ServiceAccount" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrderLine_productId_restaurantId_fkey" FOREIGN KEY ("productId", "restaurantId") REFERENCES "ServiceProduct" ("id", "restaurantId") ON DELETE RESTRICT ON UPDATE RESTRICT
);
INSERT INTO "new_ServiceOrderLine" SELECT "id", "accountId", "restaurantId", "productId", "name", "unitPriceCents", "quantity", "deliveredQuantity", "cancelledQuantity", "createdAt", '', 'PENDING', 1, 'KITCHEN' FROM "ServiceOrderLine";
DROP TABLE "ServiceOrderLine";
ALTER TABLE "new_ServiceOrderLine" RENAME TO "ServiceOrderLine";
CREATE INDEX "ServiceOrderLine_accountId_createdAt_idx" ON "ServiceOrderLine"("accountId", "createdAt");

-- Update AppSchemaState to Generation 6
CREATE TABLE "new_AppSchemaState" (
    "generation" INTEGER NOT NULL,
    "id" TEXT NOT NULL PRIMARY KEY,
    "migrationJson" TEXT,
    "state" TEXT NOT NULL DEFAULT 'READY',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSchemaState" ("generation", "id", "migrationJson", "state", "updatedAt") SELECT 6, "id", "migrationJson", "state", "updatedAt" FROM "AppSchemaState";
DROP TABLE "AppSchemaState";
ALTER TABLE "new_AppSchemaState" RENAME TO "AppSchemaState";

CREATE TEMP TABLE "_KitchenForeignKeyGuard" ("violations" INTEGER NOT NULL CONSTRAINT "Kitchen_foreign_keys_check" CHECK ("violations"=0));
INSERT INTO "_KitchenForeignKeyGuard" SELECT COUNT(*) FROM pragma_foreign_key_check;
DROP TABLE "_KitchenForeignKeyGuard";

COMMIT;
PRAGMA foreign_keys=ON;
