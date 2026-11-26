import {
  composeRoomPoses,
  summarizeSectorQuota,
  type FloorLease,
  type FloorRoom,
  type SectorQuotaSummary,
} from "../contracts";

export type FloorTableCounts = {
  total: number;
  free: number;
  reserved: number;
  occupied: number;
  inactive: number;
  sectors: SectorQuotaSummary[];
};

export function summarizeFloorTables(
  room: FloorRoom,
  allocations: FloorLease[],
  at: string,
  openAccountTableIds: Iterable<string> = [],
): FloorTableCounts {
  const active = new Map(room.tables.filter((table) => table.active).map((table) => [table.id, table]));
  const occupiedIds = new Set([...openAccountTableIds].filter((id) => active.has(id)));
  const allocatedIds = new Set(
    composeRoomPoses(room, allocations, at)
      .map((pose) => pose.tableId)
      .filter((id) => active.has(id)),
  );
  let reserved = 0;
  for (const id of allocatedIds) {
    if (!occupiedIds.has(id)) reserved += 1;
  }
  const occupied = occupiedIds.size;
  const inactive = room.tables.filter((table) => !table.active).length;
  const sectors = room.locations
    .filter((location) => location.active)
    .map((location) => summarizeSectorQuota(location, room.tables, allocations, at));
  return {
    total: active.size,
    free: Math.max(0, active.size - occupied - reserved),
    reserved,
    occupied,
    inactive,
    sectors,
  };
}
