-- Invalid legacy slots were never renderable; remove them before enforcing the invariant.
DELETE FROM "FeaturedProduct"
WHERE "position" NOT BETWEEN 1 AND 3;

-- Keep the first valid slot when legacy data contains the same product more than once.
DELETE FROM "FeaturedProduct" duplicate
USING "FeaturedProduct" keeper
WHERE duplicate."tenantId" = keeper."tenantId"
  AND duplicate."productId" = keeper."productId"
  AND duplicate."position" > keeper."position";

ALTER TABLE "FeaturedProduct"
  ADD CONSTRAINT "FeaturedProduct_position_check" CHECK ("position" BETWEEN 1 AND 3),
  ADD CONSTRAINT "FeaturedProduct_tenant_product_key" UNIQUE ("tenantId", "productId");

CREATE INDEX "Session_adminId_idx" ON "Session"("adminId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "LoginThrottle_updatedAt_idx" ON "LoginThrottle"("updatedAt");

CREATE TABLE "AssetCleanupJob" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "deletePrefix" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AssetCleanupJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetCleanupJob_storageKey_key" ON "AssetCleanupJob"("storageKey");
CREATE INDEX "AssetCleanupJob_availableAt_idx" ON "AssetCleanupJob"("availableAt");
