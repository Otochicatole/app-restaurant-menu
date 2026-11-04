import { describe, expect, it } from "vitest";
import type { FloorLease, FloorPose, FloorRoom } from "../contracts";
import { buildFloorOptions, composeRoomPoses, effectiveLeaseEnd, findFloorPlacement, getJoinedTableGroups, leaseOverlaps, transformPoses, validateAssembly, validateFloorPlacement, validateRoomLayout, validateTableArrangement } from "./floor-policy";

function room(overrides: Partial<FloorRoom> = {}): FloorRoom {
  return { id: "room", restaurantId: "restaurant", name: "Main", width: 800, height: 600, fixtures: [], locations: [{ id: "window", name: "Ventana", x: 400, y: 300, width: 800, height: 600, rotation: 0, active: true }], active: true,
    revision: 0, tables: [
      { id: "a", label: "1", shape: "SQUARE", capacity: 4, x: 100, y: 100, width: 80, height: 80, rotation: 0, active: true },
      { id: "b", label: "2", shape: "SQUARE", capacity: 4, x: 300, y: 100, width: 80, height: 80, rotation: 0, active: true },
    ], combinations: [{ id: "ab", name: "1+2", capacity: 6, active: true,
      members: [{ tableId: "a", x: -40, y: 0, rotation: 0 }, { tableId: "b", x: 40, y: 0, rotation: 0 }] }], ...overrides };
}
function pose(tableId = "a", overrides: Partial<FloorPose> = {}): FloorPose {
  return { tableId, label: tableId, shape: "SQUARE", capacity: 4, x: 100, y: 100, width: 80, height: 80, rotation: 0, ...overrides };
}
function lease(id: string, from: string, until: string, overrides: Partial<FloorLease> = {}): FloorLease {
  return { id, reservationId: id, roomId: "room", locationId: "window", blockedFrom: `2026-12-01T${from}:00Z`, blockedUntil: `2026-12-01T${until}:00Z`, releasedAt: null, poses: [pose()], ...overrides };
}
const at = (time: string) => Date.parse(`2026-12-01T${time}:00Z`);

describe("physical floor layouts", () => {
  it("keeps useful combination capacity separate from the sum of physical capacities", () => {
    const options = buildFloorOptions(room());
    expect(options.find((option) => option.id === "combination:ab")).toMatchObject({ capacity: 6, poses: [{ capacity: 4 }, { capacity: 4 }] });
    expect(validateRoomLayout(room())).toBeNull();
    const invalid = room(); invalid.combinations[0].capacity = 9;
    expect(validateRoomLayout(invalid)).toContain("capacidad física");
  });

  it("requires each combination to use active, distinct, edge-connected tables", () => {
    const duplicate = room(); duplicate.combinations[0].members[1].tableId = "a";
    expect(validateRoomLayout(duplicate)).toContain("repite");
    const inactive = room(); inactive.tables[1].active = false;
    expect(validateRoomLayout(inactive)).toContain("inactivas");
    const detached = room(); detached.combinations[0].members[1].x = 100;
    expect(validateRoomLayout(detached)).toContain("unidas");
    const overlapping = room(); overlapping.combinations[0].members[1].x = 20;
    expect(validateRoomLayout(overlapping)).toContain("superponen");
  });

  it("keeps inventory unplaced and validates obstacles only when tables are assembled", () => {
    const duplicate = room(); duplicate.tables[1].label = "1";
    expect(validateRoomLayout(duplicate)).toContain("únicos");
    const outside = room(); outside.tables[0].x = 39;
    expect(validateRoomLayout(outside)).toBeNull();
    expect(composeRoomPoses(outside, [], at("20:00"))).toEqual([]);
    const obstacle = room({ fixtures: [{ id: "bar", type: "BAR", label: "Barra", x: 100, y: 100, width: 100, height: 100, rotation: 0 }] });
    expect(validateRoomLayout(obstacle)).toBeNull();
    expect(validateFloorPlacement(obstacle, lease("new", "18:00", "22:00"), [])).toContain("Barra");
    obstacle.fixtures[0].type = "LABEL";
    expect(validateFloorPlacement(obstacle, lease("new", "18:00", "22:00"), [])).toBeNull();
  });

  it("accounts for rectangular rotation when checking room bounds", () => {
    const rotated = lease("new", "18:00", "22:00", { poses: [pose("a", { shape: "RECTANGLE", width: 160, height: 80, rotation: 90, x: 40, y: 80 })] });
    expect(validateFloorPlacement(room(), rotated, [])).toBeNull();
    rotated.poses[0].rotation = 0;
    expect(validateFloorPlacement(room(), rotated, [])).toContain("fuera");
  });

  it("uses circle geometry rather than rejecting disjoint bounding boxes", () => {
    const circles = lease("new", "18:00", "22:00", { poses: [
      pose("a", { shape: "CIRCLE", width: 100, height: 100, x: 100, y: 100 }),
      pose("b", { shape: "CIRCLE", width: 100, height: 100, x: 175, y: 175 }),
    ] });
    expect(validateFloorPlacement(room(), circles, [])).toBeNull();
    circles.poses[1].x = 160; circles.poses[1].y = 160;
    expect(validateFloorPlacement(room(), circles, [])).toContain("superponen");
  });

  it("rotates and translates a saved combination around its anchor", () => {
    const transformed = transformPoses([pose("a", { x: -40, y: 0 }), pose("b", { x: 40, y: 0, rotation: 90 })], 200, 300, 90);
    expect(transformed[0].x).toBeCloseTo(200); expect(transformed[0].y).toBeCloseTo(260);
    expect(transformed[1].x).toBeCloseTo(200); expect(transformed[1].y).toBeCloseTo(340);
    expect(transformed.map((item) => item.rotation)).toEqual([90, 180]);
  });
});

describe("independent tables and visual groups", () => {
  it("allows separated tables in a reservation while keeping predefined combinations connected", () => {
    const separate = [pose("a"), pose("b", { x: 300 })];
    expect(validateTableArrangement(separate)).toBeNull();
    expect(validateAssembly(separate)).toContain("unidas");
    const predefined = room(); predefined.combinations[0].members[1].x = 100;
    expect(validateRoomLayout(predefined)).toContain("unidas");
  });

  it("checks every pair for overlaps even when neither belongs to the first table's group", () => {
    const detachedOverlap = [pose("a"), pose("b", { x: 300 }), pose("c", { x: 320 })];
    expect(validateTableArrangement(detachedOverlap)).toContain("superponen");
    expect(validateAssembly(detachedOverlap)).toContain("superponen");
  });

  it("rejects empty, repeated and invalid footprints", () => {
    expect(validateTableArrangement([])).not.toBeNull();
    expect(validateTableArrangement([pose(), pose()])).not.toBeNull();
    expect(validateTableArrangement([pose("", { label: "Sin ID" })])).not.toBeNull();
    expect(validateTableArrangement([pose("a", { x: NaN })])).toContain("no son válidas");
    expect(validateTableArrangement([pose("a", { width: Infinity })])).toContain("no son válidas");
    expect(validateTableArrangement([pose("a", { height: 0 })])).toContain("no son válidas");
  });

  it("derives connected components transitively, preserving input order and separate singletons", () => {
    const pieces = [pose("a"), pose("c", { x: 260 }), pose("b", { x: 180 }), pose("d", { x: 500 })];
    expect(getJoinedTableGroups(pieces).map((group) => group.map((item) => item.tableId))).toEqual([["a", "c", "b"], ["d"]]);
    expect(getJoinedTableGroups([])).toEqual([]);
    expect(getJoinedTableGroups([pieces[3]])).toEqual([[pieces[3]]]);
    expect(pieces.map((item) => item.tableId)).toEqual(["a", "c", "b", "d"]);
  });

  it("uses rotated dimensions and circle tangency rather than overlapping bounding boxes", () => {
    const mixed = [pose("a"), pose("b", { x: 180, shape: "RECTANGLE", width: 160, height: 80, rotation: 90 }), pose("c", { x: 260, shape: "CIRCLE" })];
    expect(validateTableArrangement(mixed)).toBeNull(); expect(getJoinedTableGroups(mixed)).toHaveLength(1);
    const circles = [pose("a", { shape: "CIRCLE", width: 100, height: 100 }), pose("b", { shape: "CIRCLE", width: 100, height: 100, x: 175, y: 175 })];
    expect(validateTableArrangement(circles)).toBeNull(); expect(getJoinedTableGroups(circles)).toHaveLength(2);
    circles[1].x = circles[1].y = 100 + Math.sqrt(5000);
    expect(validateTableArrangement(circles)).toBeNull(); expect(getJoinedTableGroups(circles)).toHaveLength(1);
  });

  it("does not join overlapping pieces or bridge a visible gap", () => {
    expect(getJoinedTableGroups([pose("a"), pose("b", { x: 120 })])).toHaveLength(2);
    expect(getJoinedTableGroups([pose("a"), pose("b", { x: 180.1 })])).toHaveLength(2);
  });
});

describe("temporal physical table occupancy", () => {
  it("uses half-open intervals so a table is free exactly at the effective end", () => {
    const held = lease("first", "18:00", "22:00");
    expect(leaseOverlaps(held, at("21:59"), at("23:00"))).toBe(true);
    expect(leaseOverlaps(held, at("22:00"), at("23:00"))).toBe(false);
    expect(leaseOverlaps(held, at("17:00"), at("18:00"))).toBe(false);
  });

  it("frees a completed allocation early while preserving its historical pose", () => {
    const held = lease("first", "18:00", "22:00", { releasedAt: "2026-12-01T20:30:00Z", poses: [pose("a", { x: 500 })] });
    expect(effectiveLeaseEnd(held)).toBe(at("20:30"));
    expect(composeRoomPoses(room(), [held], at("20:29")).find((item) => item.tableId === "a")?.x).toBe(500);
    expect(composeRoomPoses(room(), [held], at("20:30"))).toEqual([]);
    expect(held.poses[0].x).toBe(500);
  });

  it("treats an allocation released before preparation starts as an empty interval", () => {
    const cancelled = lease("cancelled", "18:00", "22:00", { releasedAt: "2026-12-01T17:00:00Z" });
    expect(leaseOverlaps(cancelled, at("16:00"), at("20:00"))).toBe(false);
  });

  it("does not let an early release extend a planned occupancy interval", () => {
    const held = lease("first", "18:00", "22:00", { releasedAt: "2026-12-01T23:00:00Z" });
    expect(effectiveLeaseEnd(held)).toBe(at("22:00"));
  });

  it("rejects table reuse only in the same room and overlapping interval", () => {
    const first = lease("first", "18:00", "22:00");
    expect(validateFloorPlacement(room(), lease("second", "20:00", "23:00"), [first])).toContain("ya está asignada");
    expect(validateFloorPlacement(room(), lease("second", "22:00", "23:00"), [first])).toBeNull();
    expect(validateFloorPlacement(room(), lease("second", "20:00", "23:00"), [{ ...first, roomId: "other-room" }])).toBeNull();
  });

  it("checks geometry over every subinterval, including a later displaced table", () => {
    const proposal = lease("proposal", "18:00", "22:00", { poses: [pose("a", { x: 500 })] });
    const later = lease("later", "20:00", "23:00", { poses: [pose("b", { x: 500 })] });
    expect(validateFloorPlacement(room(), proposal, [later])).toContain("superponen");
    later.blockedFrom = "2026-12-01T22:00:00Z";
    expect(validateFloorPlacement(room(), proposal, [later])).toBeNull();
  });

  it("does not mix poses from other rooms and retains snapshots of inactive tables", () => {
    const current = room(); current.tables[0].active = false;
    const held = lease("held", "18:00", "22:00", { poses: [pose("a", { label: "Historical", x: 500 })] });
    const other = lease("other", "18:00", "22:00", { roomId: "other-room", poses: [pose("b", { x: 700 })] });
    const poses = composeRoomPoses(current, [held, other], at("20:00"));
    expect(poses.find((item) => item.tableId === "a")).toMatchObject({ label: "Historical", x: 500 });
    expect(poses.find((item) => item.tableId === "b")).toBeUndefined();
  });

  it("allows several groups in a sector while enforcing its limits", () => {
    const current = room(); current.locations[0] = { ...current.locations[0], x: 200, y: 200, width: 400, height: 400 };
    const first = lease("first", "18:00", "22:00");
    const second = lease("second", "18:00", "22:00", { poses: [pose("b", { x: 300, y: 300 })] });
    expect(validateFloorPlacement(current, second, [first])).toBeNull();
    second.poses[0].x = 390;
    expect(validateFloorPlacement(current, second, [first])).toContain("sector Ventana");
    expect(validateFloorPlacement(current, null, [second])).toContain("sector Ventana");
  });

  it("prevents archiving or shrinking a sector with future assemblies", () => {
    const current = room(); const future = lease("first", "18:00", "22:00");
    current.locations[0].active = false;
    expect(validateFloorPlacement(current, null, [future])).toContain("sector asignado");
    current.locations[0].active = true; current.locations[0].width = 100;
    expect(validateFloorPlacement(current, null, [future])).toContain("sector Ventana");
  });

  it("checks a usable fit rather than merely summing inventory", () => {
    const current = room(); current.locations[0] = { ...current.locations[0], width: 160, height: 80 };
    const interval = { ...lease("first", "18:00", "22:00"), serviceStartAt: "2026-12-01T20:00:00Z", serviceEndAt: "2026-12-01T22:00:00Z", timeZone: "UTC" };
    const option = buildFloorOptions(current).find((candidate) => candidate.id === "combination:ab")!;
    const placement = findFloorPlacement(current, option, interval, []);
    expect(placement).toMatchObject({ locationId: "window" });
    expect(validateAssembly(placement!.poses)).toBeNull();
    current.locations[0].width = 159;
    expect(findFloorPlacement(current, option, interval, [])).toBeNull();
    current.locations = [];
    expect(findFloorPlacement(current, option, interval, [])).toBeNull();
  });
});
