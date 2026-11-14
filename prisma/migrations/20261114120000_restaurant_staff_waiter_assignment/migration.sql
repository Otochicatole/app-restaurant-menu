PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;

-- CreateTable RestaurantStaffMember
CREATE TABLE "RestaurantStaffMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'WAITER',
    "phone" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "active" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CHECK ("role" IN ('WAITER', 'KITCHEN', 'BAR', 'CASHIER', 'HOST', 'MANAGER', 'OTHER')),
    CHECK ("active" IN (0, 1)),
    CONSTRAINT "RestaurantStaffMember_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RestaurantStaffMember_id_restaurantId_key" ON "RestaurantStaffMember"("id", "restaurantId");
CREATE INDEX "RestaurantStaffMember_restaurantId_active_role_name_idx" ON "RestaurantStaffMember"("restaurantId", "active", "role", "name");

-- Recreate ServiceAccount with assignedWaiterId and assignedWaiterName
CREATE TABLE "new_ServiceAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "restaurantId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "reservationCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "assignedWaiterId" TEXT,
    "assignedWaiterName" TEXT,
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
    CONSTRAINT "ServiceAccount_allocationId_restaurantId_reservationId_roomId_fkey" FOREIGN KEY ("allocationId", "restaurantId", "reservationId", "roomId") REFERENCES "ReservationAllocation" ("id", "restaurantId", "reservationId", "roomId") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "ServiceAccount_assignedWaiterId_restaurantId_fkey" FOREIGN KEY ("assignedWaiterId", "restaurantId") REFERENCES "RestaurantStaffMember" ("id", "restaurantId") ON DELETE NO ACTION ON UPDATE CASCADE
);
INSERT INTO "new_ServiceAccount" (
    "id", "restaurantId", "reservationId", "allocationId", "roomId", "roomName", "reservationCode", "customerName",
    "assignedWaiterId", "assignedWaiterName", "version", "openedAt", "openedBy", "closedAt", "closedBy", "businessDate",
    "paymentMethod", "totalCents", "receiptNumber", "tipCents", "discountCents", "discountReason", "cashCents", "cardCents", "transferCents"
)
SELECT
    "id", "restaurantId", "reservationId", "allocationId", "roomId", "roomName", "reservationCode", "customerName",
    NULL, NULL, "version", "openedAt", "openedBy", "closedAt", "closedBy", "businessDate",
    "paymentMethod", "totalCents", "receiptNumber", "tipCents", "discountCents", "discountReason", "cashCents", "cardCents", "transferCents"
FROM "ServiceAccount";
DROP TABLE "ServiceAccount";
ALTER TABLE "new_ServiceAccount" RENAME TO "ServiceAccount";
CREATE UNIQUE INDEX "ServiceAccount_id_restaurantId_key" ON "ServiceAccount"("id", "restaurantId");
CREATE UNIQUE INDEX "ServiceAccount_id_restaurantId_roomId_key" ON "ServiceAccount"("id", "restaurantId", "roomId");
CREATE UNIQUE INDEX "ServiceAccount_restaurantId_receiptNumber_key" ON "ServiceAccount"("restaurantId", "receiptNumber");
CREATE INDEX "ServiceAccount_restaurantId_closedAt_idx" ON "ServiceAccount"("restaurantId", "closedAt");
CREATE INDEX "ServiceAccount_restaurantId_businessDate_closedAt_idx" ON "ServiceAccount"("restaurantId", "businessDate", "closedAt");
CREATE INDEX "ServiceAccount_allocationId_closedAt_idx" ON "ServiceAccount"("allocationId", "closedAt");
CREATE INDEX "ServiceAccount_restaurantId_assignedWaiterId_idx" ON "ServiceAccount"("restaurantId", "assignedWaiterId");

CREATE TEMP TABLE "_StaffForeignKeyGuard" ("violations" INTEGER NOT NULL CONSTRAINT "Staff_foreign_keys_check" CHECK ("violations"=0));
INSERT INTO "_StaffForeignKeyGuard" SELECT COUNT(*) FROM pragma_foreign_key_check;
DROP TABLE "_StaffForeignKeyGuard";

COMMIT;
PRAGMA foreign_keys=ON;
