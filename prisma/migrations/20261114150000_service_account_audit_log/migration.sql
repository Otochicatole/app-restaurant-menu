PRAGMA foreign_keys=OFF;
BEGIN IMMEDIATE;

-- CreateTable ServiceAccountAuditLog
CREATE TABLE "ServiceAccountAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "summary" TEXT NOT NULL,
    "detailsJson" TEXT,
    "amountDeltaCents" INTEGER NOT NULL DEFAULT 0,
    "waiterName" TEXT,
    "actorId" TEXT NOT NULL,
    "actorLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (typeof("sequence") = 'integer' AND "sequence" >= 1),
    CHECK ("severity" IN ('INFO', 'WARNING')),
    CONSTRAINT "ServiceAccountAuditLog_accountId_restaurantId_fkey" FOREIGN KEY ("accountId", "restaurantId") REFERENCES "ServiceAccount" ("id", "restaurantId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ServiceAccountAuditLog_accountId_sequence_key" ON "ServiceAccountAuditLog"("accountId", "sequence");
CREATE INDEX "ServiceAccountAuditLog_accountId_createdAt_idx" ON "ServiceAccountAuditLog"("accountId", "createdAt");
CREATE INDEX "ServiceAccountAuditLog_restaurantId_createdAt_idx" ON "ServiceAccountAuditLog"("restaurantId", "createdAt");

COMMIT;
PRAGMA foreign_keys=ON;
