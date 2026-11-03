import type { FloorAssignmentInput, FloorAssignmentOption, FloorLocation, FloorPose, FloorRoom, FloorRotation } from "../contracts";

export type FloorAssemblyPoint = { x: number; y: number };
export type FloorAssemblyTableUpdate = Partial<FloorAssemblyPoint> & { rotation?: FloorRotation };

export function assemblyPoses(room: FloorRoom | undefined, value: FloorAssignmentInput | null, options: FloorAssignmentOption[]): FloorPose[] {
  if (!room || value?.roomId !== room.id) return [];
  if (value.optionId === "custom") return (value.customTables ?? []).flatMap((pose) => {
    const table = room.tables.find((item) => item.id === pose.tableId);
    return table ? [{ label: table.label, capacity: table.capacity, width: table.width, height: table.height, shape: table.shape, ...pose }] : [];
  });
  const option = options.find((item) => item.id === value.optionId && item.roomId === room.id);
  if (!option) return [];
  const rotation = (value.rotation - option.rotation + 360) % 360;
  const angle = rotation * Math.PI / 180;
  return option.poses.map((pose) => ({ ...pose, x: value.x + (pose.x - option.x) * Math.cos(angle) - (pose.y - option.y) * Math.sin(angle), y: value.y + (pose.x - option.x) * Math.sin(angle) + (pose.y - option.y) * Math.cos(angle), rotation: ((pose.rotation + rotation) % 360) as FloorRotation }));
}

export function createAssembly(room: FloorRoom, location: FloorLocation, ids: string[], anchor: FloorAssemblyPoint = location): FloorAssignmentInput | null {
  const tables = room.tables.filter((table) => table.active && ids.includes(table.id));
  if (!tables.length) return null;
  let cursor = anchor.x - tables.reduce((sum, table) => sum + table.width, 0) / 2;
  const customTables = tables.map((table) => { const x = cursor + table.width / 2; cursor += table.width; return { tableId: table.id, x, y: anchor.y, rotation: 0 as FloorRotation }; });
  return { roomId: room.id, locationId: location.id, optionId: "custom", x: anchor.x, y: anchor.y, rotation: 0, customTables, capacity: Math.max(1, tables.reduce((sum, table) => sum + table.capacity, 0) - Math.max(0, tables.length - 1) * 2), expectedRoomRevision: room.revision, retainExisting: false };
}

export function containingLocation(room: FloorRoom, point: FloorAssemblyPoint): FloorLocation | undefined {
  return room.locations.find((location) => {
    if (!location.active) return false;
    const swap = location.rotation % 180 !== 0;
    const width = swap ? location.height : location.width;
    const height = swap ? location.width : location.height;
    return Math.abs(point.x - location.x) <= width / 2 && Math.abs(point.y - location.y) <= height / 2;
  });
}

export function customAssembly(value: FloorAssignmentInput, poses: FloorPose[], capacity: number): FloorAssignmentInput {
  return { ...value, optionId: "custom", rotation: 0, capacity, customTables: poses.map(({ tableId, x, y, rotation }) => ({ tableId, x, y, rotation })), retainExisting: false };
}
