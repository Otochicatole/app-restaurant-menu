PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;

-- Sector quotas on DiningRoomLocation
ALTER TABLE "DiningRoomLocation" ADD COLUMN "maxTables" INTEGER;
ALTER TABLE "DiningRoomLocation" ADD COLUMN "maxCapacity" INTEGER;

-- Fixed sector reference on DiningTable
ALTER TABLE "DiningTable" ADD COLUMN "locationId" TEXT;
CREATE INDEX "DiningTable_restaurantId_roomId_locationId_idx" ON "DiningTable"("restaurantId", "roomId", "locationId");

-- Split-payment tracking on ServiceOrderLine
ALTER TABLE "ServiceOrderLine" ADD COLUMN "paidQuantity" INTEGER NOT NULL DEFAULT 0;

-- Partial/split payments table
CREATE TABLE "ServiceAccountPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "splitMode" TEXT NOT NULL,
    "payerLabel" TEXT NOT NULL DEFAULT '',
    "businessDate" TEXT NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "discountReason" TEXT,
    "tipCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "cashCents" INTEGER NOT NULL DEFAULT 0,
    "cardCents" INTEGER NOT NULL DEFAULT 0,
    "transferCents" INTEGER NOT NULL DEFAULT 0,
    "itemsJson" TEXT,
    "paidBy" TEXT NOT NULL,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (typeof("sequence") = 'integer' AND "sequence" >= 1),
    CHECK ("splitMode" IN ('FULL', 'BY_ITEMS', 'BY_PEOPLE', 'CUSTOM_AMOUNT')),
    CHECK ("paymentMethod" IN ('CASH', 'CARD', 'TRANSFER_QR', 'SPLIT')),
    CHECK (typeof("subtotalCents") = 'integer' AND "subtotalCents" >= 0),
    CHECK (typeof("discountCents") = 'integer' AND "discountCents" >= 0 AND "discountCents" <= "subtotalCents"),
    CHECK (typeof("tipCents") = 'integer' AND "tipCents" >= 0),
    CHECK (typeof("totalCents") = 'integer' AND "totalCents" >= 0),
    CHECK (typeof("cashCents") = 'integer' AND "cashCents" >= 0),
    CHECK (typeof("cardCents") = 'integer' AND "cardCents" >= 0),
    CHECK (typeof("transferCents") = 'integer' AND "transferCents" >= 0),
    CONSTRAINT "ServiceAccountPayment_accountId_restaurantId_fkey" FOREIGN KEY ("accountId", "restaurantId") REFERENCES "ServiceAccount" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ServiceAccountPayment_accountId_sequence_key" ON "ServiceAccountPayment"("accountId", "sequence");
CREATE UNIQUE INDEX "ServiceAccountPayment_restaurantId_receiptNumber_key" ON "ServiceAccountPayment"("restaurantId", "receiptNumber");
CREATE INDEX "ServiceAccountPayment_accountId_paidAt_idx" ON "ServiceAccountPayment"("accountId", "paidAt");
CREATE INDEX "ServiceAccountPayment_restaurantId_businessDate_idx" ON "ServiceAccountPayment"("restaurantId", "businessDate");

COMMIT;
PRAGMA foreign_keys=ON;
