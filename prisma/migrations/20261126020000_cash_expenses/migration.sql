PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;

CREATE TABLE "ServiceCashExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "category" TEXT NOT NULL CHECK ("category" IN ('SUPPLIER_PAYMENT', 'LAST_MINUTE', 'DELIVERY', 'MAINTENANCE', 'ADVANCE', 'OTHER')),
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH' CHECK ("paymentMethod" IN ('CASH', 'CARD', 'TRANSFER_QR')),
    "amountCents" INTEGER NOT NULL CHECK (typeof("amountCents") = 'integer' AND "amountCents" >= 1),
    "notes" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceCashExpense_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ServiceCashExpense_id_restaurantId_key" ON "ServiceCashExpense"("id", "restaurantId");
CREATE INDEX "ServiceCashExpense_restaurantId_businessDate_createdAt_idx" ON "ServiceCashExpense"("restaurantId", "businessDate", "createdAt");

COMMIT;
PRAGMA foreign_keys=ON;
