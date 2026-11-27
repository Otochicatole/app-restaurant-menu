-- Allow archived sectors and tables (active = 0) to release their names/labels for reuse
DROP INDEX IF EXISTS "DiningRoomLocation_roomId_name_key";
DROP INDEX IF EXISTS "DiningTable_roomId_label_key";

CREATE INDEX IF NOT EXISTS "DiningRoomLocation_roomId_name_idx" ON "DiningRoomLocation"("roomId", "name");
CREATE INDEX IF NOT EXISTS "DiningTable_roomId_label_idx" ON "DiningTable"("roomId", "label");

CREATE UNIQUE INDEX "DiningRoomLocation_roomId_active_name_key" ON "DiningRoomLocation"("roomId", "name") WHERE "active" = 1;
CREATE UNIQUE INDEX "DiningTable_roomId_active_label_key" ON "DiningTable"("roomId", "label") WHERE "active" = 1;
