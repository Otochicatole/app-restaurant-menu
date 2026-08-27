DO $$ BEGIN
  CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'TENANT_ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

ALTER TABLE "Admin"
  ADD COLUMN IF NOT EXISTS "role" "AdminRole" NOT NULL DEFAULT 'TENANT_ADMIN',
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT,
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "HomePage" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "FeaturedProduct" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Font" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Setting" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

INSERT INTO "Tenant" ("id", "name", "slug", "status", "createdAt", "updatedAt")
VALUES ('legacy-fuzion', 'Fuzion', 'fuzion', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Admin"
SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'fuzion'),
    "role" = 'TENANT_ADMIN';
UPDATE "Group" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'fuzion');
UPDATE "HomePage" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'fuzion');
UPDATE "Product" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'fuzion');
UPDATE "FeaturedProduct" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'fuzion');
UPDATE "Font"
SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'fuzion')
WHERE "source" = 'custom';
UPDATE "Setting" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'fuzion');

DROP INDEX IF EXISTS "Group_name_key";
DROP INDEX IF EXISTS "FeaturedProduct_position_key";
DROP INDEX IF EXISTS "Font_name_key";
ALTER TABLE "Setting" DROP CONSTRAINT IF EXISTS "Setting_pkey";

ALTER TABLE "Group" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "HomePage" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "FeaturedProduct" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Setting" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "Admin" ADD CONSTRAINT "Admin_tenantId_key" UNIQUE ("tenantId");
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_role_tenant_check"
  CHECK (("role" = 'SUPER_ADMIN' AND "tenantId" IS NULL) OR ("role" = 'TENANT_ADMIN' AND "tenantId" IS NOT NULL));

ALTER TABLE "Group" ADD CONSTRAINT "Group_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Group" ADD CONSTRAINT "Group_tenant_name_key" UNIQUE ("tenantId", "name");
ALTER TABLE "Group" ADD CONSTRAINT "Group_id_tenantId_key" UNIQUE ("id", "tenantId");

ALTER TABLE "HomePage" ADD CONSTRAINT "HomePage_tenantId_key" UNIQUE ("tenantId");
ALTER TABLE "HomePage" ADD CONSTRAINT "HomePage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_group_tenant_fkey"
  FOREIGN KEY ("groupId", "tenantId") REFERENCES "Group"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeaturedProduct" ADD CONSTRAINT "FeaturedProduct_tenant_position_key" UNIQUE ("tenantId", "position");
ALTER TABLE "FeaturedProduct" ADD CONSTRAINT "FeaturedProduct_id_tenantId_key" UNIQUE ("id", "tenantId");
ALTER TABLE "FeaturedProduct" ADD CONSTRAINT "FeaturedProduct_product_tenant_fkey"
  FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Font" ADD CONSTRAINT "Font_tenant_name_key" UNIQUE ("tenantId", "name");
ALTER TABLE "Font" ADD CONSTRAINT "Font_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Font_system_name_unique" ON "Font"("name") WHERE "tenantId" IS NULL;

ALTER TABLE "Setting" ADD CONSTRAINT "Setting_pkey" PRIMARY KEY ("tenantId", "key");
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Group_tenantId_idx" ON "Group"("tenantId");
CREATE INDEX "HomePage_tenantId_idx" ON "HomePage"("tenantId");
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");
CREATE INDEX "Product_tenantId_groupId_idx" ON "Product"("tenantId", "groupId");
CREATE INDEX "FeaturedProduct_tenantId_idx" ON "FeaturedProduct"("tenantId");
CREATE INDEX "Font_tenantId_idx" ON "Font"("tenantId");
