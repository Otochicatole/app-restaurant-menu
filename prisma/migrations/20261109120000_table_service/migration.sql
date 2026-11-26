BEGIN;
-- AlterTable
ALTER TABLE "ReservationAllocationTable" ADD COLUMN "releasedAt" DATETIME;

-- CreateTable
CREATE TABLE "ServiceProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK (typeof("unitPriceCents") = 'integer' AND "unitPriceCents" BETWEEN 1 AND 2147483647 AND "active" IN (0,1)),
    CONSTRAINT "ServiceProduct_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceAccount" (
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
    CHECK (typeof("version") = 'integer' AND "version" >= 0 AND ("paymentMethod" IS NULL OR "paymentMethod" IN ('CASH','CARD','TRANSFER_QR'))),
    CHECK (("closedAt" IS NULL AND "closedBy" IS NULL AND "receiptNumber" IS NULL AND "businessDate" IS NULL AND "totalCents" IS NULL AND "paymentMethod" IS NULL)
        OR ("closedAt" IS NOT NULL AND "closedBy" IS NOT NULL AND "receiptNumber" IS NOT NULL AND "businessDate" IS NOT NULL AND "totalCents" IS NOT NULL AND
           typeof("totalCents") = 'integer' AND "totalCents" <= 2147483647 AND
           (("totalCents" = 0 AND "paymentMethod" IS NULL) OR ("totalCents" > 0 AND "paymentMethod" IS NOT NULL)))),
    CONSTRAINT "ServiceAccount_allocationId_restaurantId_reservationId_roomId_fkey" FOREIGN KEY ("allocationId", "restaurantId", "reservationId", "roomId") REFERENCES "ReservationAllocation" ("id", "restaurantId", "reservationId", "roomId") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "ServiceAccountTable" (
    "accountId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "releasedAt" DATETIME,

    PRIMARY KEY ("accountId", "tableId"),
    CONSTRAINT "ServiceAccountTable_accountId_restaurantId_roomId_fkey" FOREIGN KEY ("accountId", "restaurantId", "roomId") REFERENCES "ServiceAccount" ("id", "restaurantId", "roomId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceAccountTable_tableId_restaurantId_roomId_fkey" FOREIGN KEY ("tableId", "restaurantId", "roomId") REFERENCES "DiningTable" ("id", "restaurantId", "roomId") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "ServiceOrderLine" (
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
    CHECK (typeof("unitPriceCents") = 'integer' AND "unitPriceCents" BETWEEN 1 AND 2147483647
        AND typeof("quantity") = 'integer' AND "quantity" BETWEEN 1 AND 99
        AND typeof("deliveredQuantity") = 'integer' AND typeof("cancelledQuantity") = 'integer'
        AND "deliveredQuantity" >= 0 AND "cancelledQuantity" >= 0 AND "deliveredQuantity" + "cancelledQuantity" <= "quantity"),
    CONSTRAINT "ServiceOrderLine_accountId_restaurantId_fkey" FOREIGN KEY ("accountId", "restaurantId") REFERENCES "ServiceAccount" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceOrderLine_productId_restaurantId_fkey" FOREIGN KEY ("productId", "restaurantId") REFERENCES "ServiceProduct" ("id", "restaurantId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ServiceCashEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cashCents" INTEGER NOT NULL DEFAULT 0,
    "cardCents" INTEGER NOT NULL DEFAULT 0,
    "transferCents" INTEGER NOT NULL DEFAULT 0,
    "receiptCount" INTEGER NOT NULL DEFAULT 0,
    CHECK ("revision" > 0 AND "kind" IN ('CLOSE','REOPEN') AND ("kind" = 'CLOSE' OR length(trim(coalesce("reason",''))) > 0)),
    CHECK ("cashCents" >= 0 AND "cardCents" >= 0 AND "transferCents" >= 0 AND "receiptCount" >= 0),
    CONSTRAINT "ServiceCashEvent_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
CREATE TABLE "new_AppSchemaState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "generation" INTEGER NOT NULL DEFAULT 5,
    "state" TEXT NOT NULL DEFAULT 'READY',
    "migrationJson" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AppSchemaState" ("generation", "id", "migrationJson", "state", "updatedAt") SELECT 5, "id", "migrationJson", "state", "updatedAt" FROM "AppSchemaState";
DROP TABLE "AppSchemaState";
ALTER TABLE "new_AppSchemaState" RENAME TO "AppSchemaState";

-- CreateIndex
CREATE INDEX "ServiceProduct_restaurantId_active_name_idx" ON "ServiceProduct"("restaurantId", "active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProduct_id_restaurantId_key" ON "ServiceProduct"("id", "restaurantId");

-- CreateIndex
CREATE INDEX "ServiceAccount_restaurantId_closedAt_idx" ON "ServiceAccount"("restaurantId", "closedAt");

-- CreateIndex
CREATE INDEX "ServiceAccount_restaurantId_businessDate_closedAt_idx" ON "ServiceAccount"("restaurantId", "businessDate", "closedAt");

-- CreateIndex
CREATE INDEX "ServiceAccount_allocationId_closedAt_idx" ON "ServiceAccount"("allocationId", "closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAccount_id_restaurantId_key" ON "ServiceAccount"("id", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAccount_id_restaurantId_roomId_key" ON "ServiceAccount"("id", "restaurantId", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceAccount_restaurantId_receiptNumber_key" ON "ServiceAccount"("restaurantId", "receiptNumber");

-- CreateIndex
CREATE INDEX "ServiceAccountTable_restaurantId_tableId_idx" ON "ServiceAccountTable"("restaurantId", "tableId");

-- CreateIndex
CREATE INDEX "ServiceOrderLine_accountId_createdAt_idx" ON "ServiceOrderLine"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCashEvent_restaurantId_businessDate_revision_key" ON "ServiceCashEvent"("restaurantId", "businessDate", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationAllocation_id_restaurantId_reservationId_roomId_key" ON "ReservationAllocation"("id", "restaurantId", "reservationId", "roomId");

-- An open account owns its physical table even after the reservation's planned interval.
CREATE UNIQUE INDEX "ServiceAccountTable_active_table_key" ON "ServiceAccountTable"("restaurantId","tableId") WHERE "releasedAt" IS NULL;

CREATE TEMP TABLE "_ServiceForeignKeyGuard" ("violations" INTEGER NOT NULL CHECK ("violations" = 0));
INSERT INTO "_ServiceForeignKeyGuard" SELECT COUNT(*) FROM pragma_foreign_key_check;
DROP TABLE "_ServiceForeignKeyGuard";
COMMIT;
