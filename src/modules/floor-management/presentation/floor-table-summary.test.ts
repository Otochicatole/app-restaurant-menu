import { describe, expect, it } from "vitest";
import type { FloorLease, FloorLocation, FloorPose, FloorRoom, FloorTable } from "../contracts";
import { summarizeFloorTables } from "./floor-table-summary";

const at = "2099-12-01T23:00:00.000Z";

function sector(id = "sector-1", maxCapacity?: number): FloorLocation {
  return { id, name: "Salón Norte", x: 500, y: 350, width: 800, height: 600, rotation: 0, active: true, ...(maxCapacity !== undefined ? { maxCapacity } : {}) };
}

function table(id: string, active = true, locationId?: string): FloorTable {
  return { id, label: id, shape: "SQUARE", capacity: 4, x: 200, y: 200, width: 80, height: 80, rotation: 0, active, ...(locationId ? { locationId } : {}) };
}

function room(tables = [table("one"), table("two"), table("three")], locations: FloorLocation[] = []): FloorRoom {
  return { id: "main", restaurantId: "restaurant", name: "Salón principal", width: 1000, height: 700, active: true, revision: 4, fixtures: [], locations, tables, combinations: [] };
}

function pose(id: string): FloorPose {
  const { id: tableId, active: _active, ...value } = table(id);
  void _active;
  return { ...value, tableId };
}

function lease(ids: string[], overrides: Partial<FloorLease> = {}): FloorLease {
  return { id: "allocation", reservationId: "reservation", roomId: "main", blockedFrom: "2099-12-01T21:00:00.000Z", blockedUntil: "2099-12-02T01:00:00.000Z", releasedAt: null, poses: ids.map(pose), ...overrides };
}

describe("physical table summary at the board instant", () => {
  it("counts active physical inventory, including idle tables absent from the plan", () => {
    expect(summarizeFloorTables(room([table("one"), table("two"), table("archived", false)]), [], at))
      .toEqual({ total: 2, free: 2, reserved: 0, occupied: 0, inactive: 1, sectors: [] });
    expect(summarizeFloorTables(room([]), [], at)).toEqual({ total: 0, free: 0, reserved: 0, occupied: 0, inactive: 0, sectors: [] });
  });

  it("counts both physical tables of a joined arrangement once, regardless of repeated snapshots", () => {
    const allocations = [lease(["one", "two", "two"]), lease(["two"], { id: "older", reservationId: "older-reservation" })];
    expect(summarizeFloorTables(room(), allocations, at))
      .toEqual({ total: 3, free: 1, reserved: 2, occupied: 0, inactive: 0, sectors: [] });
  });

  it("excludes other rooms, inactive stock and unknown historical table IDs from reserved/occupied counts", () => {
    const current = room([table("one"), table("two"), table("archived", false)]);
    const allocations = [lease(["one", "archived", "removed"]), lease(["two"], { roomId: "terrace" })];
    expect(summarizeFloorTables(current, allocations, at))
      .toEqual({ total: 2, free: 1, reserved: 1, occupied: 0, inactive: 1, sectors: [] });
  });

  it("tracks occupied tables with open service accounts separately from reserved tables", () => {
    const allocations = [lease(["one"]), lease(["two"], { id: "alloc-2", reservationId: "res-2" })];
    expect(summarizeFloorTables(room(), allocations, at, ["one"]))
      .toEqual({ total: 3, free: 1, reserved: 1, occupied: 1, inactive: 0, sectors: [] });
  });

  it("computes sector quota warnings and exceeded status without blocking counts", () => {
    const current = room(
      [table("one", true, "sector-1"), table("two", true, "sector-1")],
      [sector("sector-1", 10)],
    );
    const near = summarizeFloorTables(current, [lease(["one"], { locationId: "sector-1", poses: [{ ...pose("one"), capacity: 8 }] })], at);
    expect(near.sectors[0]).toMatchObject({ locationId: "sector-1", occupiedPartySize: 8, status: "warning" });

    const over = summarizeFloorTables(current, [lease(["one"], { locationId: "sector-1", poses: [{ ...pose("one"), capacity: 12 }] })], at);
    expect(over.sectors[0]).toMatchObject({ locationId: "sector-1", occupiedPartySize: 12, status: "exceeded" });
  });

  it.each([
    ["2099-12-01T20:59:59.999Z", 0],
    ["2099-12-01T21:00:00.000Z", 1],
    ["2099-12-01T22:00:00.000Z", 1],
    ["2099-12-02T00:59:59.999Z", 1],
    ["2099-12-02T01:00:00.000Z", 0],
  ])("uses the preparation interval and half-open end at %s", (instant, reserved) => {
    expect(summarizeFloorTables(room(), [lease(["one"])], instant))
      .toEqual({ total: 3, free: 3 - reserved, reserved, occupied: 0, inactive: 0, sectors: [] });
  });

  it("makes a table free exactly at its early release, preserving its earlier occupancy", () => {
    const released = lease(["one"], { releasedAt: "2099-12-01T22:00:00.000Z" });
    expect(summarizeFloorTables(room(), [released], "2099-12-01T21:59:59.999Z").reserved).toBe(1);
    expect(summarizeFloorTables(room(), [released], "2099-12-01T22:00:00.000Z"))
      .toEqual({ total: 3, free: 3, reserved: 0, occupied: 0, inactive: 0, sectors: [] });
  });

  it("never extends the planned end with a later release or occupies a lease released before preparation", () => {
    const allocations = [
      lease(["one"], { releasedAt: "2099-12-02T02:00:00.000Z" }),
      lease(["two"], { id: "cancelled", releasedAt: "2099-12-01T20:00:00.000Z" }),
    ];
    expect(summarizeFloorTables(room(), allocations, at).reserved).toBe(1);
    expect(summarizeFloorTables(room(), allocations, "2099-12-02T01:00:00.000Z").reserved).toBe(0);
  });

  it("hands the same physical table to a contiguous allocation without double counting", () => {
    const allocations = [lease(["one"], { blockedUntil: at }), lease(["one"], { id: "next", reservationId: "next-reservation", blockedFrom: at, blockedUntil: "2099-12-02T03:00:00.000Z" })];
    expect(summarizeFloorTables(room(), allocations, at))
      .toEqual({ total: 3, free: 2, reserved: 1, occupied: 0, inactive: 0, sectors: [] });
  });
});
