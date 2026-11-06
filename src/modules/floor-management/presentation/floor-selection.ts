import {
  floorAssignmentSchema, getJoinedTableGroups, validateFloorPlacement, validateTableArrangement,
  type FloorAllocationView, type FloorAssignmentInput, type FloorInterval, type FloorLease, type FloorPose, type FloorRoom, type FloorTable,
} from "../contracts";
import { capacityAfterLayout, separateLayoutTables } from "./floor-table-layout";

export type FloorSelectionState = {
  room: FloorRoom;
  allocations: FloorAllocationView[];
  draft: null | { poses: FloorPose[]; interval: FloorInterval; locationId?: string; capacity: number };
};
type SelectionResource = { resourceId: string; table: FloorTable; allocation: FloorAllocationView | null };
export type FloorSelectionLayout = {
  updates: Array<{ reservationId: string; expectedRevision: number; expectedAllocationVersion: number; assignment: FloorAssignmentInput }>;
  draft?: { poses: FloorPose[]; capacity: number };
};

/** Canvas identities distinguish draft tables from their committed physical resources. */
export function resolveFloorSelection(state: FloorSelectionState, resourceIds: string[]): SelectionResource[] {
  return [...new Set(resourceIds)].flatMap((resourceId) => {
    const draft = resourceId.startsWith("draft:");
    const tableId = draft ? resourceId.slice(6) : resourceId;
    const stock = state.room.tables.find((table) => table.id === tableId && table.active);
    if (!stock) return [];
    const allocation = draft ? null : state.allocations.find((item) => item.roomId === state.room.id && item.poses.some((pose) => pose.tableId === tableId));
    const pose = (draft ? state.draft?.poses : allocation?.poses)?.find((item) => item.tableId === tableId);
    if (!pose) return [];
    return [{ resourceId, allocation: allocation ?? null, table: { ...stock, id: resourceId, x: pose.x, y: pose.y, rotation: pose.rotation } }];
  });
}

export function contextFloorSelection(current: string[], hit: string[], available: string[]): string[] {
  const allowed = new Set(available);
  const selected = new Set(current.filter((id) => allowed.has(id)));
  return selected.size ? [...selected] : [...new Set(hit)].filter((id) => allowed.has(id));
}

function inventoryPoses(room: FloorRoom, poses: FloorPose[]): FloorPose[] | string {
  if (!poses.length || new Set(poses.map((pose) => pose.tableId)).size !== poses.length) return "El armado cambió. Actualizá la sala antes de modificar la selección.";
  const result: FloorPose[] = [];
  for (const pose of poses) {
    const table = room.tables.find((item) => item.id === pose.tableId && item.active);
    if (!table) return "El inventario cambió. Actualizá la sala antes de modificar la selección.";
    result.push({ tableId: table.id, label: table.label, shape: table.shape, capacity: table.capacity, width: table.width, height: table.height, x: pose.x, y: pose.y, rotation: pose.rotation });
  }
  return result;
}

function selectionMembers(state: FloorSelectionState, ids: string[]): SelectionResource[] | string {
  const distinct = [...new Set(ids)];
  const selected = resolveFloorSelection(state, distinct);
  return distinct.length && selected.length === distinct.length ? selected : "La selección cambió. Volvé a seleccionar las mesas.";
}

/** Build one complete proposal per affected reservation; only selected coordinates may change. */
export function buildSelectionLayout(state: FloorSelectionState, ids: string[], nextTables: FloorTable[]): FloorSelectionLayout | string {
  const selected = selectionMembers(state, ids);
  if (typeof selected === "string") return selected;
  const replacements = new Map(nextTables.map((table) => [table.id, table]));
  if (replacements.size !== nextTables.length || replacements.size !== selected.length || selected.some(({ resourceId }) => !replacements.has(resourceId))) {
    return "La selección cambió. Volvé a abrir el editor de mesas.";
  }
  const result: FloorSelectionLayout = { updates: [] };
  const affected = [...new Map(selected.flatMap(({ allocation }) => allocation ? [[allocation.id, allocation] as const] : [])).values()];
  const proposals: FloorLease[] = [];
  for (const allocation of affected) {
    if (!Number.isInteger(allocation.reservationRevision) || allocation.reservationRevision! < 0 || !Number.isInteger(allocation.version) || allocation.version < 0 || allocation.releasedAt) {
      return "La asignación cambió. Actualizá la sala antes de modificar la selección.";
    }
    if (!allocation.locationId || !state.room.locations.some((location) => location.id === allocation.locationId && location.active)) return "El grupo ya no tiene un sector válido. Actualizá la sala.";
    const before = inventoryPoses(state.room, allocation.poses);
    if (typeof before === "string") return before;
    const poses = before.map((pose) => {
      const replacement = selected.some((item) => item.resourceId === pose.tableId && item.allocation?.id === allocation.id) ? replacements.get(pose.tableId) : undefined;
      return replacement ? { ...pose, x: replacement.x, y: replacement.y, rotation: replacement.rotation } : pose;
    });
    const invalid = validateTableArrangement(poses);
    if (invalid) return invalid;
    const capacity = capacityAfterLayout(allocation.capacity, before, poses);
    if (capacity < allocation.partySize) return `La capacidad útil no alcanza: el armado tiene ${capacity} lugares para ${allocation.partySize} personas.`;
    const assignment = floorAssignmentSchema.safeParse({ roomId: state.room.id, locationId: allocation.locationId, optionId: "custom", customTables: poses.map(({ tableId, x, y, rotation }) => ({ tableId, x, y, rotation })), capacity,
      x: poses.reduce((sum, pose) => sum + pose.x, 0) / poses.length, y: poses.reduce((sum, pose) => sum + pose.y, 0) / poses.length,
      rotation: 0, expectedRoomRevision: state.room.revision, retainExisting: false });
    if (!assignment.success) return "Revisá la posición y la capacidad útil de las mesas seleccionadas.";
    proposals.push({ ...allocation, poses });
    result.updates.push({ reservationId: allocation.reservationId, expectedRevision: allocation.reservationRevision!, expectedAllocationVersion: allocation.version, assignment: assignment.data });
  }
  if (result.updates.length > 40 || proposals.reduce((count, proposal) => count + proposal.poses.length, 0) > 200) return "Elegí menos grupos para modificar la selección.";
  if (state.draft?.poses.length) {
    const before = inventoryPoses(state.room, state.draft.poses);
    if (typeof before === "string") return before;
    const poses = before.map((pose) => {
      const replacement = replacements.get(`draft:${pose.tableId}`);
      return replacement ? { ...pose, x: replacement.x, y: replacement.y, rotation: replacement.rotation } : pose;
    });
    const invalid = validateTableArrangement(poses);
    if (invalid) return invalid;
    const capacity = capacityAfterLayout(state.draft.capacity, before, poses);
    let identity = "__floor-selection-draft";
    while (state.allocations.some((allocation) => allocation.id === identity || allocation.reservationId === identity)) identity += ":draft";
    proposals.push({ ...state.draft.interval, id: identity, reservationId: identity, roomId: state.room.id, locationId: state.draft.locationId, poses, releasedAt: null });
    if (selected.some(({ resourceId }) => resourceId.startsWith("draft:"))) result.draft = { poses, capacity };
  }
  const leases = [...state.allocations.filter((allocation) => !affected.some((item) => item.id === allocation.id)), ...proposals];
  for (const proposal of proposals) {
    const invalid = validateFloorPlacement(state.room, proposal, leases);
    if (invalid) return invalid;
  }
  return result;
}

export function canSeparateFloorSelection(state: FloorSelectionState, ids: string[]): boolean {
  const selected = selectionMembers(state, ids);
  if (typeof selected === "string") return false;
  return selected.some(({ resourceId, allocation }) => {
    const poses = inventoryPoses(state.room, allocation?.poses ?? state.draft?.poses ?? []);
    const tableId = resourceId.startsWith("draft:") ? resourceId.slice(6) : resourceId;
    return typeof poses !== "string" && getJoinedTableGroups(poses).some((group) => group.length > 1 && group.some((pose) => pose.tableId === tableId));
  });
}

/** Separate selected members within each party's own sector, then validate the complete result. */
export function separateFloorSelection(state: FloorSelectionState, ids: string[]): FloorSelectionLayout | string {
  const selected = selectionMembers(state, ids);
  if (typeof selected === "string") return selected;
  if (!canSeparateFloorSelection(state, ids)) return "Seleccioná una mesa de un grupo unido para separarla.";
  const next = new Map(selected.map(({ resourceId, table }) => [resourceId, table]));
  const allocations = [...new Map(selected.flatMap(({ allocation }) => allocation ? [[allocation.id, allocation] as const] : [])).values()];
  const groups = [
    ...allocations.map((allocation) => ({ allocation, poses: allocation.poses, locationId: allocation.locationId })),
    ...(selected.some(({ resourceId }) => resourceId.startsWith("draft:")) && state.draft ? [{ allocation: null, poses: state.draft.poses, locationId: state.draft.locationId }] : []),
  ];
  for (const group of groups) {
    const area = state.room.locations.find((location) => location.id === group.locationId && location.active);
    if (!area) return "Elegí un sector válido para separar las mesas.";
    const poses = inventoryPoses(state.room, group.poses);
    if (typeof poses === "string") return poses;
    const resources = selected.filter((item) => group.allocation ? item.allocation?.id === group.allocation.id : item.resourceId.startsWith("draft:"));
    const result = separateLayoutTables(poses, resources.map(({ resourceId }) => group.allocation ? resourceId : resourceId.slice(6)), area);
    if (typeof result === "string") return result;
    for (const { resourceId, table } of resources) {
      const pose = result.find((item) => item.tableId === (group.allocation ? resourceId : resourceId.slice(6)))!;
      next.set(resourceId, { ...table, x: pose.x, y: pose.y, rotation: pose.rotation });
    }
  }
  return buildSelectionLayout(state, ids, [...next.values()]);
}
