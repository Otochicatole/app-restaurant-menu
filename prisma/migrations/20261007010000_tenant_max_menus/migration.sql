-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "maxMenus" INTEGER NOT NULL DEFAULT 1;

-- Keep existing multi-menu accounts at least at their current default cupo
UPDATE "Tenant" SET "maxMenus" = 1 WHERE "multiMenuEnabled" = 0;
