import { composeRoomPoses, type FloorLease, type FloorRoom } from "../contracts";
import { groupInventoryTables } from "./floor-table-groups";

export type FloorTableCounts = {
  total: number;
  free: number;
  occupied: number;
  inactive: number;
  freeByType: { key: string; label: string; free: number }[];
};

export function summarizeFloorTables(room: FloorRoom, allocations: FloorLease[], at: string): FloorTableCounts {
  const active = new Map(room.tables.filter((table) => table.active).map((table) => [table.id, table]));
  const occupied = new Set(composeRoomPoses(room, allocations, at).map((pose) => pose.tableId).filter((id) => active.has(id)));
  const inactive = new Set(room.tables.filter((table) => !table.active).map((table) => table.id)).size;
  const freeByType = groupInventoryTables([...active.values()]).map(({ key, label, tables }) => ({
    key,
    label,
    free: tables.filter((table) => !occupied.has(table.id)).length,
  }));
  return { total: active.size, free: active.size - occupied.size, occupied: occupied.size, inactive, freeByType };
}
