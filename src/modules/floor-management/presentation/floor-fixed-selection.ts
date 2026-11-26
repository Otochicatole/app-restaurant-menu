import {
  summarizeSectorQuota,
  type FloorAllocationView,
  type FloorAssignmentInput,
  type FloorLease,
  type FloorOptionsView,
  type FloorRoom,
  type SectorQuotaSummary,
} from "../contracts";

const normalizeText = (value: string) => value.trim().toLocaleLowerCase("es-AR");

export function findPreferredSector(
  rooms: FloorRoom[],
  preference?: string,
): { roomId: string; locationId: string } | null {
  const raw = preference?.trim();
  if (!raw) return null;
  const parts = raw.split("·").map(normalizeText).filter(Boolean);
  const targetSector = parts[0] ?? "";
  const targetRoom = parts[1];
  for (const room of rooms) {
    if (!room.active) continue;
    if (targetRoom && normalizeText(room.name) !== targetRoom) continue;
    const match = room.locations.find(
      (location) => location.active && normalizeText(location.name) === targetSector,
    );
    if (match) return { roomId: room.id, locationId: match.id };
  }
  for (const room of rooms) {
    if (!room.active) continue;
    const match = room.locations.find(
      (location) => location.active && normalizeText(location.name) === targetSector,
    );
    if (match) return { roomId: room.id, locationId: match.id };
  }
  return null;
}

export function selectedTableIdsFromAssignment(
  room: FloorRoom | undefined,
  value: FloorAssignmentInput | null,
  currentAllocation?: FloorAllocationView | null,
): string[] {
  if (!room || !value || value.roomId !== room.id) return [];
  if (value.retainExisting && currentAllocation?.roomId === room.id) {
    return currentAllocation.poses.map((pose) => pose.tableId);
  }
  if (value.optionId === "custom" && value.customTables?.length) {
    return value.customTables.map((table) => table.tableId);
  }
  if (value.optionId.startsWith("table:")) {
    return [value.optionId.slice("table:".length)];
  }
  return [];
}

export function buildFixedAssignment(
  room: FloorRoom,
  selectedTableIds: readonly string[],
  partySize: number,
  preferredLocationId?: string,
): FloorAssignmentInput | null {
  const tables = room.tables.filter((table) => table.active && selectedTableIds.includes(table.id));
  if (!tables.length) return null;
  const activeSectorIds = new Set(room.locations.filter((location) => location.active).map((location) => location.id));
  const resolvedLocationId =
    (tables[0].locationId && activeSectorIds.has(tables[0].locationId) ? tables[0].locationId : undefined)
    ?? (preferredLocationId && activeSectorIds.has(preferredLocationId) ? preferredLocationId : undefined)
    ?? room.locations.find((location) => location.active)?.id;
  if (!resolvedLocationId) return null;

  if (tables.length === 1) {
    const table = tables[0];
    return {
      roomId: room.id,
      locationId: resolvedLocationId,
      optionId: `table:${table.id}`,
      x: table.x,
      y: table.y,
      rotation: table.rotation,
      capacity: Math.max(table.capacity, partySize),
      expectedRoomRevision: room.revision,
      retainExisting: false,
    };
  }

  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
  const centerX = tables.reduce((sum, table) => sum + table.x, 0) / tables.length;
  const centerY = tables.reduce((sum, table) => sum + table.y, 0) / tables.length;
  return {
    roomId: room.id,
    locationId: resolvedLocationId,
    optionId: "custom",
    x: centerX,
    y: centerY,
    rotation: 0,
    capacity: Math.max(totalCapacity, partySize),
    customTables: tables.map((table) => ({
      tableId: table.id,
      x: table.x,
      y: table.y,
      rotation: table.rotation,
    })),
    expectedRoomRevision: room.revision,
    retainExisting: false,
  };
}

export function roomAvailableTableIds(
  room: FloorRoom | undefined,
  options: FloorOptionsView | null,
  retainedIds: readonly string[] = [],
): Set<string> {
  if (!room || !options) return new Set();
  const retained = new Set(retainedIds);
  const result = new Set<string>();
  for (const table of room.tables) {
    if (!table.active) continue;
    if (retained.has(table.id)) {
      result.add(table.id);
      continue;
    }
    const option = options.options.find(
      (candidate) => candidate.roomId === room.id && candidate.id === `table:${table.id}`,
    );
    if (option?.resourceAvailable ?? option?.available) {
      result.add(table.id);
    }
  }
  return result;
}

export function enrichRoomWithQuota(
  room: FloorRoom,
  allocations: FloorLease[],
  at: string,
  selectedTableIds: readonly string[],
  partySize: number,
  fallbackLocationId?: string,
) {
  const selectedSectorIds = new Set(
    room.tables
      .filter((table) => selectedTableIds.includes(table.id))
      .map((table) => table.locationId ?? fallbackLocationId)
      .filter((id): id is string => Boolean(id)),
  );
  const sectorQuotas: SectorQuotaSummary[] = room.locations
    .filter((location) => location.active)
    .map((location) =>
      summarizeSectorQuota(
        location,
        room.tables,
        allocations,
        at,
        selectedSectorIds.has(location.id) ? partySize : 0,
      ),
    );
  const quotaById = new Map(sectorQuotas.map((quota) => [quota.locationId, quota]));
  const enrichedRoom = {
    ...room,
    locations: room.locations
      .filter((location) => location.active)
      .map((location) => {
        const quota = quotaById.get(location.id);
        return {
          ...location,
          quotaStatus: quota?.status ?? "normal",
          quotaLabel: quota
            ? [
                quota.maxCapacity != null ? `${quota.occupiedPartySize}/${quota.maxCapacity}p` : `${quota.occupiedPartySize}p`,
                `${quota.freeTables}/${quota.placedTables} libres`,
              ].join(" · ")
            : undefined,
        };
      }),
  };
  const warnings = sectorQuotas.filter(
    (quota) => selectedSectorIds.has(quota.locationId) && (quota.status === "warning" || quota.status === "exceeded"),
  );
  return { enrichedRoom, sectorQuotas, warnings };
}
