import { getJoinedTableGroups, validateTableArrangement, type FloorLocation, type FloorPose } from "../contracts";

function box(pose: Pick<FloorPose, "x" | "y" | "width" | "height" | "rotation">) {
  const width = pose.rotation % 180 ? pose.height : pose.width;
  const height = pose.rotation % 180 ? pose.width : pose.height;
  return { left: pose.x - width / 2, right: pose.x + width / 2, top: pose.y - height / 2, bottom: pose.y + height / 2, width, height };
}
function fits(poses: FloorPose[], area: FloorLocation) {
  const bounds = box(area);
  return !validateTableArrangement(poses) && poses.every((pose) => {
    const item = box(pose);
    return item.left >= bounds.left - 0.001 && item.right <= bounds.right + 0.001 && item.top >= bounds.top - 0.001 && item.bottom <= bounds.bottom + 0.001;
  });
}
function pack(poses: FloorPose[], ids: string[], gap: number, vertical: boolean, area: FloorLocation): FloorPose[] | null {
  const selected = ids.flatMap((id) => { const pose = poses.find((item) => item.tableId === id); return pose ? [pose] : []; });
  if (!selected.length) return null;
  const bounds = selected.map(box);
  const center = { x: (Math.min(...bounds.map((item) => item.left)) + Math.max(...bounds.map((item) => item.right))) / 2,
    y: (Math.min(...bounds.map((item) => item.top)) + Math.max(...bounds.map((item) => item.bottom))) / 2 };
  const length = bounds.reduce((sum, item) => sum + (vertical ? item.height : item.width), 0) + gap * (selected.length - 1);
  let cursor = (vertical ? center.y : center.x) - length / 2;
  const packed = selected.map((pose) => {
    const extent = vertical ? box(pose).height : box(pose).width;
    const coordinate = cursor + extent / 2; cursor += extent + gap;
    return { ...pose, x: vertical ? center.x : coordinate, y: vertical ? coordinate : center.y };
  });
  const target = box(area); const nextBounds = packed.map(box);
  const left = Math.min(...nextBounds.map((item) => item.left)); const right = Math.max(...nextBounds.map((item) => item.right));
  const top = Math.min(...nextBounds.map((item) => item.top)); const bottom = Math.max(...nextBounds.map((item) => item.bottom));
  const dx = left < target.left ? target.left - left : right > target.right ? target.right - right : 0;
  const dy = top < target.top ? target.top - top : bottom > target.bottom ? target.bottom - bottom : 0;
  const replacements = new Map(packed.map((pose) => [pose.tableId, { ...pose, x: pose.x + dx, y: pose.y + dy }]));
  const next = poses.map((pose) => replacements.get(pose.tableId) ?? pose);
  return fits(next, area) ? next : null;
}

/** Explicit editor action: arrange only the selected tables edge to edge. */
export function joinLayoutTables(poses: FloorPose[], ids: string[], area: FloorLocation): FloorPose[] | string {
  const distinct = [...new Set(ids)].filter((id) => poses.some((pose) => pose.tableId === id));
  if (distinct.length < 2) return "Seleccioná al menos dos mesas para unirlas.";
  return pack(poses, distinct, 0, false, area) ?? pack(poses, distinct, 0, true, area) ?? "No hay espacio para unir esas mesas en el sector. Movelas o elegí menos mesas.";
}

/** Keep the tables assigned to the reservation, opening a visible gap between them. */
export function separateLayoutTables(poses: FloorPose[], ids: string[], area: FloorLocation): FloorPose[] | string {
  const wanted = new Set(ids);
  let next = poses;
  for (const group of getJoinedTableGroups(poses)) {
    if (group.length < 2 || !group.some((pose) => wanted.has(pose.tableId))) continue;
    if (group.every((pose) => wanted.has(pose.tableId))) {
      const packed = pack(next, group.map((pose) => pose.tableId), 24, false, area) ?? pack(next, group.map((pose) => pose.tableId), 24, true, area);
      if (!packed) return "No hay espacio para separar esas mesas en el sector. Mové el grupo y volvé a intentar.";
      next = packed;
      continue;
    }
    for (const source of group.filter((pose) => wanted.has(pose.tableId))) {
      const current = next.find((pose) => pose.tableId === source.tableId)!;
      const others = group.filter((pose) => pose.tableId !== source.tableId).map((pose) => box(next.find((item) => item.tableId === pose.tableId)!));
      const size = box(current);
      const candidates = [{ x: Math.min(...others.map((item) => item.left)) - 24 - size.width / 2, y: current.y },
        { x: Math.max(...others.map((item) => item.right)) + 24 + size.width / 2, y: current.y },
        { x: current.x, y: Math.min(...others.map((item) => item.top)) - 24 - size.height / 2 },
        { x: current.x, y: Math.max(...others.map((item) => item.bottom)) + 24 + size.height / 2 }]
        .sort((a, b) => Math.hypot(a.x - current.x, a.y - current.y) - Math.hypot(b.x - current.x, b.y - current.y));
      const candidate = candidates.map((point) => next.map((pose) => pose.tableId === current.tableId ? { ...pose, ...point } : pose))
        .find((items) => fits(items, area) && getJoinedTableGroups(items).some((items) => items.length === 1 && items[0].tableId === current.tableId));
      if (!candidate) return "No hay espacio para separar esa mesa en el sector. Mové el grupo y volvé a intentar.";
      next = candidate;
    }
  }
  return next;
}

export function defaultLayoutCapacity(poses: FloorPose[]): number {
  return Math.max(1, getJoinedTableGroups(poses).reduce((sum, group) => sum + Math.max(1, group.reduce((capacity, pose) => capacity + pose.capacity, 0) - (group.length - 1) * 2), 0));
}
