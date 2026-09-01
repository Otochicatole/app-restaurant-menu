CREATE INDEX "Session_adminId_idx" ON "Session"("adminId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" DATETIME NOT NULL,
    "blockedUntil" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "LoginThrottle_updatedAt_idx" ON "LoginThrottle"("updatedAt");

CREATE TABLE "AssetCleanupJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storageKey" TEXT NOT NULL,
    "deletePrefix" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AssetCleanupJob_attempts_check" CHECK ("attempts" >= 0)
);
CREATE UNIQUE INDEX "AssetCleanupJob_storageKey_key" ON "AssetCleanupJob"("storageKey");
CREATE INDEX "AssetCleanupJob_availableAt_idx" ON "AssetCleanupJob"("availableAt");
