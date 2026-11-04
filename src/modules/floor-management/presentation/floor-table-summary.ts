import { composeRoomPoses, type FloorLease, type FloorRoom } from "../contracts";

export type FloorTableCounts = { total: number; free: number; occupied: number; inactive: number };

export function summarizeFloorTables(room: FloorRoom, allocations: FloorLease[], at: string): FloorTableCounts {
  const active = new Set(room.tables.filter((table) => table.active).map((table) => table.id));
  const occupied = composeRoomPoses(room, allocations, at).filter((pose) => active.has(pose.tableId)).length;
  const inactive = new Set(room.tables.filter((table) => !table.active).map((table) => table.id)).size;
  return { total: active.size, free: active.size - occupied, occupied, inactive };
}
