import type { FloorAssignmentOption, FloorInterval, FloorLease, FloorPose, FloorRoom, FloorRoomInput, FloorRotation, FloorTable } from "../contracts";

const epsilon = 0.001;
type Footprint = { x: number; y: number; width: number; height: number; rotation: number; shape?: string };
function basePose(table: FloorTable): FloorPose {
  return { tableId: table.id, label: table.label, shape: table.shape, capacity: table.capacity,
    x: table.x, y: table.y, width: table.width, height: table.height, rotation: table.rotation };
}
function bounds(pose: Footprint) {
  const swap = pose.rotation % 180 !== 0;
  const width = swap ? pose.height : pose.width;
  const height = swap ? pose.width : pose.height;
  return { left: pose.x - width / 2, right: pose.x + width / 2, top: pose.y - height / 2, bottom: pose.y + height / 2 };
}
function intersects(a: Footprint, b: Footprint, margin = -epsilon): boolean {
  if (a.shape === "CIRCLE" && b.shape === "CIRCLE") return Math.hypot(a.x - b.x, a.y - b.y) < (a.width + b.width) / 2 + margin;
  if (a.shape === "CIRCLE" || b.shape === "CIRCLE") {
    const circle = a.shape === "CIRCLE" ? a : b;
    const rect = bounds(a.shape === "CIRCLE" ? b : a);
    const dx = circle.x - Math.max(rect.left, Math.min(circle.x, rect.right));
    const dy = circle.y - Math.max(rect.top, Math.min(circle.y, rect.bottom));
    return Math.hypot(dx, dy) < circle.width / 2 + margin;
  }
  const x = bounds(a); const y = bounds(b);
  return x.left < y.right + margin && x.right > y.left - margin && x.top < y.bottom + margin && x.bottom > y.top - margin;
}
function validatePoses(room: Pick<FloorRoom, "width" | "height" | "fixtures">, poses: FloorPose[]): string | null {
  for (let i = 0; i < poses.length; i++) {
    const pose = poses[i]; const box = bounds(pose);
    if (box.left < -epsilon || box.top < -epsilon || box.right > room.width + epsilon || box.bottom > room.height + epsilon) return `La mesa ${pose.label} queda fuera del salón.`;
    const fixture = room.fixtures.find((item) => item.type !== "LABEL" && intersects(pose, item));
    if (fixture) return `La mesa ${pose.label} se superpone con ${fixture.label || (fixture.type === "WALL" ? "una pared" : "la barra")}.`;
    for (let j = 0; j < i; j++) if (intersects(pose, poses[j])) return `Las mesas ${pose.label} y ${poses[j].label} se superponen.`;
  }
  return null;
}
export function transformPoses(poses: FloorPose[], x: number, y: number, rotation: FloorRotation): FloorPose[] {
  const angle = rotation * Math.PI / 180;
  return poses.map((pose) => ({ ...pose,
    x: x + pose.x * Math.cos(angle) - pose.y * Math.sin(angle),
    y: y + pose.x * Math.sin(angle) + pose.y * Math.cos(angle),
    rotation: ((pose.rotation + rotation) % 360) as FloorRotation,
  }));
}
export function buildFloorOptions(room: FloorRoom): FloorAssignmentOption[] {
  const tables = room.tables.filter((table) => table.active);
  const anchor = room.locations?.find((location) => location.active) ?? { x: room.width / 2, y: room.height / 2 };
  const singles = tables.map((table): FloorAssignmentOption => {
    return { id: `table:${table.id}`, roomId: room.id, label: `Mesa ${table.label}`, capacity: table.capacity,
      x: anchor.x, y: anchor.y, rotation: 0, poses: [{ ...basePose(table), x: anchor.x, y: anchor.y, rotation: 0 }], available: true };
  });
  const combinations = room.combinations.filter((combination) => combination.active).flatMap((combination): FloorAssignmentOption[] => {
    const members = combination.members.map((member) => ({ member, table: tables.find((table) => table.id === member.tableId) }));
    if (members.some(({ table }) => !table)) return [];
    const { x, y } = anchor;
    const relative = members.map(({ member, table }): FloorPose => ({ tableId: member.tableId, label: table!.label, shape: table!.shape,
      width: table!.width, height: table!.height, capacity: table!.capacity, x: member.x, y: member.y, rotation: member.rotation }));
    return [{ id: `combination:${combination.id}`, roomId: room.id, label: combination.name, capacity: combination.capacity,
      x, y, rotation: 0, poses: transformPoses(relative, x, y, 0), available: true }];
  });
  return [...singles, ...combinations];
}
export function effectiveLeaseEnd(lease: FloorLease): number {
  return Math.min(Date.parse(lease.blockedUntil), lease.releasedAt ? Date.parse(lease.releasedAt) : Infinity);
}
export function leaseOverlaps(lease: FloorLease, from: number, until: number): boolean {
  const start = Date.parse(lease.blockedFrom); const end = effectiveLeaseEnd(lease);
  return end > start && start < until && end > from;
}
export function composeRoomPoses(room: FloorRoom, leases: FloorLease[], at: string | number): FloorPose[] {
  const poses = new Map<string, FloorPose>();
  const instant = typeof at === "number" ? at : Date.parse(at);
  for (const lease of leases) if (lease.roomId === room.id && Date.parse(lease.blockedFrom) <= instant && effectiveLeaseEnd(lease) > instant) {
    for (const pose of lease.poses) poses.set(pose.tableId, pose);
  }
  return [...poses.values()];
}
export function validateRoomLayout(room: FloorRoomInput): string | null {
  for (const fixture of room.fixtures) {
    const box = bounds(fixture);
    if (box.left < -epsilon || box.top < -epsilon || box.right > room.width + epsilon || box.bottom > room.height + epsilon) return `La referencia ${fixture.label || fixture.type} queda fuera del salón.`;
  }
  const locations = room.locations ?? [];
  if (new Set(locations.map((location) => location.id)).size !== locations.length || new Set(locations.map((location) => location.name)).size !== locations.length) return "Cada sector debe tener un identificador y nombre únicos dentro del salón.";
  for (const location of locations.filter((item) => item.active)) {
    const box = bounds(location);
    if (box.left < -epsilon || box.top < -epsilon || box.right > room.width + epsilon || box.bottom > room.height + epsilon) return `El sector ${location.name} queda fuera del salón.`;
  }
  if (new Set(room.tables.map((table) => table.id)).size !== room.tables.length || new Set(room.tables.map((table) => table.label)).size !== room.tables.length) return "Cada mesa debe tener un identificador y número únicos dentro del salón.";
  if (new Set(room.combinations.map((item) => item.id)).size !== room.combinations.length) return "Hay combinaciones repetidas.";
  for (const combination of room.combinations.filter((item) => item.active)) {
    if (new Set(combination.members.map((member) => member.tableId)).size !== combination.members.length) return `La combinación ${combination.name} repite una mesa.`;
    const members = combination.members.map((member) => ({ member, table: room.tables.find((table) => table.id === member.tableId && table.active) }));
    if (members.some(({ table }) => !table)) return `La combinación ${combination.name} usa mesas inexistentes o inactivas.`;
    if (combination.capacity > members.reduce((sum, { table }) => sum + table!.capacity, 0)) return `La capacidad útil de ${combination.name} supera la capacidad física.`;
    const pieces = members.map(({ table, member }): FloorPose => ({ ...basePose(table!), ...member }));
    const invalid = validateAssembly(pieces);
    if (invalid) return `La combinación ${combination.name}: ${invalid}`;
  }
  return null;
}
export function validateAssembly(poses: FloorPose[]): string | null {
  if (!poses.length || new Set(poses.map((pose) => pose.tableId)).size !== poses.length) return "El armado debe usar mesas distintas.";
  const connected = new Set([0]);
  for (let pass = 0; pass < poses.length; pass++) for (let i = 0; i < poses.length; i++) for (const j of connected) {
    if (i !== j && intersects(poses[i], poses[j])) return `Las mesas ${poses[i].label} y ${poses[j].label} se superponen.`;
    if (intersects(poses[i], poses[j], epsilon)) connected.add(i);
  }
  return connected.size === poses.length ? null : "Las mesas del armado deben estar unidas por sus bordes.";
}
function validateSector(room: FloorRoom, lease: FloorLease): string | null {
  // Null identifies an allocation preserved from a previous schema generation.
  if (!lease.locationId) return null;
  const location = room.locations?.find((item) => item.id === lease.locationId && item.active);
  if (!location) return "El sector asignado ya no está disponible.";
  const area = bounds(location);
  for (const pose of lease.poses) {
    const box = bounds(pose);
    if (box.left < area.left - epsilon || box.right > area.right + epsilon || box.top < area.top - epsilon || box.bottom > area.bottom + epsilon) return `La mesa ${pose.label} queda fuera del sector ${location.name}.`;
  }
  return null;
}
export function validateFloorPlacement(room: FloorRoom, proposal: FloorLease | null, leases: FloorLease[]): string | null {
  const relevant = leases.filter((lease) => lease.roomId === room.id && lease.id !== proposal?.id && lease.reservationId !== proposal?.reservationId);
  if (proposal) {
    const sectorError = validateSector(room, proposal); if (sectorError) return sectorError;
    const poseError = validatePoses(room, proposal.poses); if (poseError) return poseError;
    const from = Date.parse(proposal.blockedFrom); const until = effectiveLeaseEnd(proposal);
    const ids = new Set(proposal.poses.map((pose) => pose.tableId));
    const conflict = relevant.find((lease) => leaseOverlaps(lease, from, until) && lease.poses.some((pose) => ids.has(pose.tableId)));
    if (conflict) return `Una mesa ya está asignada a la reserva ${conflict.reservationId} durante ese horario.`;
    const points = [from, until, ...relevant.flatMap((lease) => [Date.parse(lease.blockedFrom), effectiveLeaseEnd(lease)])]
      .filter((value) => value >= from && value <= until).sort((a, b) => a - b);
    for (let index = 0; index < points.length - 1; index++) if (points[index + 1] > points[index]) {
      const invalid = validatePoses(room, composeRoomPoses(room, [...relevant, proposal], (points[index] + points[index + 1]) / 2));
      if (invalid) return invalid;
    }
    return null;
  }
  for (const lease of relevant) {
    if (effectiveLeaseEnd(lease) <= Date.parse(lease.blockedFrom)) continue;
    const invalid = validateSector(room, lease) ?? validatePoses(room, lease.poses);
    if (invalid) return invalid;
  }
  const points = [...new Set(relevant.flatMap((lease) => [Date.parse(lease.blockedFrom), effectiveLeaseEnd(lease)]))].sort((a, b) => a - b);
  for (let index = 0; index < points.length - 1; index++) if (points[index + 1] > points[index]) {
    const invalid = validatePoses(room, composeRoomPoses(room, relevant, (points[index] + points[index + 1]) / 2));
    if (invalid) return invalid;
  }
  return null;
}

/** A bounded fit check for availability; actual assignments still validate their exact positions. */
export function findFloorPlacement(room: FloorRoom, option: FloorAssignmentOption, interval: FloorInterval, leases: FloorLease[], excludeReservationId?: string): { locationId: string; x: number; y: number; rotation: FloorRotation; poses: FloorPose[] } | null {
  const relevant = leases.filter((lease) => lease.roomId === room.id && lease.reservationId !== excludeReservationId && leaseOverlaps(lease, Date.parse(interval.blockedFrom), Date.parse(interval.blockedUntil)));
  const occupied = relevant.flatMap((lease) => lease.poses).map(bounds);
  const obstacles = room.fixtures.filter((fixture) => fixture.type !== "LABEL").map(bounds);
  const relative = option.poses.map((pose) => ({ ...pose, x: pose.x - option.x, y: pose.y - option.y }));
  for (const location of (room.locations ?? []).filter((item) => item.active)) for (const rotation of [0, 90, 180, 270] as FloorRotation[]) {
    const delta = ((rotation - option.rotation + 360) % 360) as FloorRotation;
    const rotated = transformPoses(relative, 0, 0, delta);
    const boxes = rotated.map(bounds);
    const footprint = { left: Math.min(...boxes.map((box) => box.left)), right: Math.max(...boxes.map((box) => box.right)), top: Math.min(...boxes.map((box) => box.top)), bottom: Math.max(...boxes.map((box) => box.bottom)) };
    const area = bounds(location);
    if (footprint.right - footprint.left > area.right - area.left + epsilon || footprint.bottom - footprint.top > area.bottom - area.top + epsilon) continue;
    const xValues = [location.x, area.left - footprint.left, area.right - footprint.right, ...[...occupied, ...obstacles].flatMap((box) => [box.left - footprint.right, box.right - footprint.left])];
    const yValues = [location.y, area.top - footprint.top, area.bottom - footprint.bottom, ...[...occupied, ...obstacles].flatMap((box) => [box.top - footprint.bottom, box.bottom - footprint.top])];
    const xs = [...new Set(xValues)].filter((x) => x + footprint.left >= area.left - epsilon && x + footprint.right <= area.right + epsilon).slice(0, 20);
    const ys = [...new Set(yValues)].filter((y) => y + footprint.top >= area.top - epsilon && y + footprint.bottom <= area.bottom + epsilon).slice(0, 20);
    for (const x of xs) for (const y of ys) {
      const poses = rotated.map((pose) => ({ ...pose, x: pose.x + x, y: pose.y + y }));
      const proposal: FloorLease = { ...interval, id: "availability-proposal", reservationId: excludeReservationId ?? "availability-proposal", roomId: room.id, locationId: location.id, poses, releasedAt: null };
      if (!validateFloorPlacement(room, proposal, relevant)) return { locationId: location.id, x, y, rotation, poses };
    }
  }
  return null;
}
