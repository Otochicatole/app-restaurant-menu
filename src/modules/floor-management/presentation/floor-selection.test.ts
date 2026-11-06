import { describe, expect, it } from "vitest";
import type { FloorAllocationView, FloorInterval, FloorPose, FloorRoom, FloorTable } from "../contracts";
import { buildSelectionLayout, canSeparateFloorSelection, contextFloorSelection, resolveFloorSelection, separateFloorSelection, type FloorSelectionLayout, type FloorSelectionState } from "./floor-selection";

const interval: FloorInterval = { timeZone: "UTC", serviceStartAt: "2099-12-01T12:00:00.000Z", serviceEndAt: "2099-12-01T14:00:00.000Z", blockedFrom: "2099-12-01T11:45:00.000Z", blockedUntil: "2099-12-01T14:15:00.000Z" };
const table = (id: string, overrides: Partial<FloorTable> = {}): FloorTable => ({ id, label: `Mesa ${id}`, capacity: 4, shape: "SQUARE", width: 80, height: 80, x: 900, y: 600, rotation: 0, active: true, ...overrides });
const pose = (tableId: string, x: number, y: number): FloorPose => ({ tableId, label: `Snapshot ${tableId}`, capacity: 4, shape: "SQUARE", width: 80, height: 80, x, y, rotation: 0 });
const allocation = (id: string, poses: FloorPose[], overrides: Partial<FloorAllocationView> = {}): FloorAllocationView => ({ ...interval, id, reservationId: `reservation-${id}`, reservationRevision: 3, version: 5, roomId: "room", locationId: "sector", combinationId: null, capacity: poses.length === 2 ? 6 : 4, customerName: id, partySize: 4, date: "2099-12-01", time: "12:00", notes: "Private grouping", code: id, source: "ADMIN", releasedAt: null, poses, ...overrides });
function state(): FloorSelectionState {
  const room: FloorRoom = { id: "room", restaurantId: "restaurant", name: "Sala", revision: 8, width: 1000, height: 700, active: true, fixtures: [], combinations: [],
    locations: [{ id: "sector", name: "Ventana", x: 500, y: 350, width: 1000, height: 700, rotation: 0, active: true }],
    tables: ["a", "b", "c", "d", "e", "f", "g"].map((id) => table(id)).concat(table("inactive", { active: false })),
  };
  return { room, allocations: [allocation("one", [pose("a", 160, 100), pose("b", 240, 100)]), allocation("two", [pose("d", 460, 300), pose("e", 540, 300)]), allocation("other", [pose("c", 800, 500)])],
    draft: { poses: [pose("f", 600, 500), pose("g", 680, 500)], interval, locationId: "sector", capacity: 6 },
  };
}
function success(result: FloorSelectionLayout | string): FloorSelectionLayout {
  expect(typeof result).not.toBe("string");
  if (typeof result === "string") throw new Error(result);
  return result;
}
const tables = (value: FloorSelectionState, ids: string[]) => resolveFloorSelection(value, ids).map((item) => item.table);
const at = (result: FloorSelectionLayout, reservation: string, tableId: string) => result.updates.find((update) => update.reservationId === reservation)!.assignment.customTables!.find((item) => item.tableId === tableId)!;

describe("floor resource selection", () => {
  it("deduplicates resources, uses current inventory metadata and keeps draft identities distinct", () => {
    const value = state();
    value.draft!.poses = [pose("a", 400, 500)];
    value.draft!.capacity = 4;
    value.room.tables[0] = table("a", { label: "Actual", shape: "RECTANGLE", width: 120, height: 60, capacity: 6 });
    const result = resolveFloorSelection(value, ["a", "draft:a", "a", "missing", "inactive", "f"]);
    expect(result.map((item) => item.resourceId)).toEqual(["a", "draft:a"]);
    expect(result[0]).toMatchObject({ allocation: { id: "one" }, table: { id: "a", label: "Actual", shape: "RECTANGLE", width: 120, height: 60, capacity: 6, x: 160, y: 100 } });
    expect(result[1]).toMatchObject({ allocation: null, table: { id: "draft:a", label: "Actual", x: 400, y: 500 } });
    value.allocations.push(allocation("foreign", [pose("f", 100, 100)], { roomId: "elsewhere" }));
    expect(resolveFloorSelection(value, ["f"])).toEqual([]);
  });

  it("preserves any valid selection on context actions and only selects the hit when empty", () => {
    expect(contextFloorSelection(["a", "d", "stale", "a"], ["a", "b"], ["a", "b", "d"])).toEqual(["a", "d"]);
    expect(contextFloorSelection(["a", "d"], ["b", "b", "stale"], ["a", "b", "d"])).toEqual(["a", "d"]);
    expect(contextFloorSelection(["stale", "a"], ["stale"], ["a"])).toEqual(["a"]);
    expect(contextFloorSelection(["a"], [], ["a"])).toEqual(["a"]);
    expect(contextFloorSelection(["stale"], ["b", "b", "stale"], ["a", "b"])).toEqual(["b"]);
  });
});

describe("selection layout proposals", () => {
  it("updates two reservations while preserving their unselected members, data and expected versions", () => {
    const value = state(); const before = structuredClone(value);
    const ids = ["a", "d", "a"];
    const next = tables(value, ids).map((item) => ({ ...item, x: item.x - 24, rotation: 90 as const, label: "Ignored", width: 1, capacity: 500, active: false }));
    const result = success(buildSelectionLayout(value, ids, next));
    expect(result.updates).toHaveLength(2);
    expect(result.updates.map(({ reservationId, expectedRevision, expectedAllocationVersion }) => ({ reservationId, expectedRevision, expectedAllocationVersion })))
      .toEqual([{ reservationId: "reservation-one", expectedRevision: 3, expectedAllocationVersion: 5 }, { reservationId: "reservation-two", expectedRevision: 3, expectedAllocationVersion: 5 }]);
    expect(at(result, "reservation-one", "a")).toEqual({ tableId: "a", x: 136, y: 100, rotation: 90 });
    expect(at(result, "reservation-one", "b")).toEqual({ tableId: "b", x: 240, y: 100, rotation: 0 });
    expect(at(result, "reservation-two", "d")).toEqual({ tableId: "d", x: 436, y: 300, rotation: 90 });
    expect(at(result, "reservation-two", "e")).toEqual({ tableId: "e", x: 540, y: 300, rotation: 0 });
    expect(result.updates.every((update) => update.assignment.expectedRoomRevision === 8 && update.assignment.capacity === 8)).toBe(true);
    expect(result.draft).toBeUndefined(); expect(value).toEqual(before);
  });

  it("builds committed and draft changes together, preserving all unselected draft members", () => {
    const value = state(); const ids = ["a", "draft:f"];
    const result = success(buildSelectionLayout(value, ids, tables(value, ids).map((item) => ({ ...item, x: item.x - 24 }))));
    expect(result.updates).toHaveLength(1);
    expect(result.updates[0].assignment.capacity).toBe(8);
    expect(result.draft).toMatchObject({ capacity: 8, poses: [{ tableId: "f", x: 576, y: 500 }, { tableId: "g", x: 680, y: 500 }] });
  });

  it("allows final proposals to exchange old positions in one result", () => {
    const value = state(); const ids = ["a", "b", "d", "e"];
    const targets: Record<string, { x: number; y: number }> = { a: { x: 460, y: 300 }, b: { x: 540, y: 300 }, d: { x: 160, y: 100 }, e: { x: 240, y: 100 } };
    const result = success(buildSelectionLayout(value, ids, tables(value, ids).map((item) => ({ ...item, ...targets[item.id] }))));
    expect(at(result, "reservation-one", "a")).toMatchObject({ x: 460, y: 300 });
    expect(at(result, "reservation-two", "d")).toMatchObject({ x: 160, y: 100 });
    expect(result.updates.map((update) => update.assignment.capacity)).toEqual([6, 6]);
  });

  it("preserves manually chosen capacity and recomputes only the former default capacity", () => {
    const value = state(); value.allocations[0].capacity = 5; value.draft!.capacity = 5;
    const ids = ["a", "draft:f"];
    const result = success(buildSelectionLayout(value, ids, tables(value, ids).map((item) => ({ ...item, x: item.x - 24 }))));
    expect(result.updates[0].assignment.capacity).toBe(5); expect(result.draft!.capacity).toBe(5);
    value.allocations[0].poses[1].x = 300; value.allocations[0].capacity = 8; value.allocations[0].partySize = 7;
    expect(buildSelectionLayout(value, ["a"], tables(value, ["a"]).map((item) => ({ ...item, x: 220 })))).toMatch(/capacidad útil no alcanza/);
  });

  it("fails the whole result for overlaps with another proposal, an unselected lease or the draft", () => {
    const value = state(); const before = structuredClone(value);
    const both = tables(value, ["a", "d"]).map((item) => ({ ...item, x: 400, y: 200 }));
    expect(typeof buildSelectionLayout(value, ["a", "d"], both)).toBe("string");
    expect(typeof buildSelectionLayout(value, ["a"], tables(value, ["a"]).map((item) => ({ ...item, x: 800, y: 500 })))).toBe("string");
    expect(typeof buildSelectionLayout(value, ["a"], tables(value, ["a"]).map((item) => ({ ...item, x: 600, y: 500 })))).toBe("string");
    expect(typeof buildSelectionLayout(value, ["a", "d"], tables(value, ["a", "d"]).map((item) => ({ ...item, x: item.id === "d" ? 2000 : 100 })))).toBe("string");
    expect(value).toEqual(before);
  });

  it("uses blocked interval boundaries when validating draft and committed resource collisions", () => {
    const value = state();
    value.draft = { poses: [pose("a", 160, 100)], interval: { ...interval, blockedFrom: interval.blockedUntil, serviceStartAt: interval.blockedUntil, serviceEndAt: "2099-12-01T16:00:00.000Z", blockedUntil: "2099-12-01T16:15:00.000Z" }, capacity: 4, locationId: "sector" };
    const ids = ["a", "draft:a"];
    const result = success(buildSelectionLayout(value, ids, tables(value, ids)));
    expect(result.updates).toHaveLength(1); expect(result.draft!.poses[0].tableId).toBe("a");
    value.draft.interval.blockedFrom = "2099-12-01T14:14:59.999Z";
    expect(buildSelectionLayout(value, ids, tables(value, ids))).toMatch(/asignada/);
  });

  it("requires exact selected membership, all retained inventory members and optimistic versions", () => {
    const value = state(); const next = tables(value, ["a"]);
    expect(typeof buildSelectionLayout(value, ["a", "missing"], next)).toBe("string");
    expect(typeof buildSelectionLayout(value, ["a"], [])).toBe("string");
    expect(typeof buildSelectionLayout(value, ["a"], [...next, ...next])).toBe("string");
    expect(typeof buildSelectionLayout(value, ["a"], [...next, table("other")])).toBe("string");
    value.allocations[0].reservationRevision = undefined;
    expect(buildSelectionLayout(value, ["a"], next)).toMatch(/asignación cambió/);
    value.allocations[0].reservationRevision = 3; value.room.tables.find((item) => item.id === "b")!.active = false;
    expect(buildSelectionLayout(value, ["a"], next)).toMatch(/inventario cambió/);
  });
});

describe("selection separation", () => {
  it("separates selected members of two parties and a draft, preserving companions and all reservations", () => {
    const value = state(); const before = structuredClone(value); const ids = ["a", "d", "draft:f"];
    expect(canSeparateFloorSelection(value, ids)).toBe(true);
    const result = success(separateFloorSelection(value, ids));
    expect(result.updates).toHaveLength(2);
    expect(at(result, "reservation-one", "a")).toMatchObject({ x: 136, y: 100 });
    expect(at(result, "reservation-one", "b")).toMatchObject({ x: 240, y: 100 });
    expect(at(result, "reservation-two", "d")).toMatchObject({ x: 436, y: 300 });
    expect(at(result, "reservation-two", "e")).toMatchObject({ x: 540, y: 300 });
    expect(result.updates.map((update) => update.assignment.capacity)).toEqual([8, 8]);
    expect(result.draft).toMatchObject({ capacity: 8, poses: [{ tableId: "f", x: 576, y: 500 }, { tableId: "g", x: 680, y: 500 }] });
    expect(value).toEqual(before);
  });

  it("does not mistake touching tables from different reservations for a separable party", () => {
    const value = state(); value.draft = null;
    value.allocations = [allocation("one", [pose("a", 160, 100)]), allocation("two", [pose("d", 240, 100)])];
    expect(canSeparateFloorSelection(value, ["a", "d"])).toBe(false);
    expect(canSeparateFloorSelection(value, ["missing"])).toBe(false);
    expect(separateFloorSelection(value, ["a", "d"])).toMatch(/grupo unido/);
  });

  it("returns a geometry error for the entire separation without changing its input", () => {
    const value = state(); value.draft = null;
    value.room.locations[0] = { ...value.room.locations[0], x: 200, y: 100, width: 160, height: 80 };
    value.allocations = [value.allocations[0]];
    const before = structuredClone(value);
    expect(separateFloorSelection(value, ["a", "b"])).toMatch(/No hay espacio/);
    expect(value).toEqual(before);
    value.room.locations[0].active = false;
    expect(separateFloorSelection(value, ["a"])).toMatch(/sector válido/);
  });
});
