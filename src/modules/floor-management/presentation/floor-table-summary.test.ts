import { describe, expect, it } from "vitest";
import type { FloorLease, FloorPose, FloorRoom, FloorTable } from "../contracts";
import { summarizeFloorTables } from "./floor-table-summary";

const at = "2099-12-01T23:00:00.000Z";
const squareType = { key: "SQUARE:80:80", label: "Cuadrada 80 × 80" };

function table(id: string, active = true): FloorTable {
  return { id, label: id, shape: "SQUARE", capacity: 4, x: 100, y: 100, width: 80, height: 80, rotation: 0, active };
}

function room(tables = [table("one"), table("two"), table("three")]): FloorRoom {
  return { id: "main", restaurantId: "restaurant", name: "Salón principal", width: 1000, height: 700, active: true, revision: 4, fixtures: [], locations: [], tables, combinations: [] };
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
      .toEqual({ total: 2, free: 2, occupied: 0, inactive: 1, freeByType: [{ ...squareType, free: 2 }] });
    expect(summarizeFloorTables(room([]), [], at)).toEqual({ total: 0, free: 0, occupied: 0, inactive: 0, freeByType: [] });
  });

  it("counts both physical tables of a joined arrangement once, regardless of repeated snapshots", () => {
    const allocations = [lease(["one", "two", "two"]), lease(["two"], { id: "older", reservationId: "older-reservation" })];
    expect(summarizeFloorTables(room(), allocations, at))
      .toEqual({ total: 3, free: 1, occupied: 2, inactive: 0, freeByType: [{ ...squareType, free: 1 }] });
  });

  it("excludes other rooms, inactive stock and unknown historical table IDs from occupied inventory", () => {
    const current = room([table("one"), table("two"), table("archived", false)]);
    const allocations = [lease(["one", "archived", "removed"]), lease(["two"], { roomId: "terrace" })];
    expect(summarizeFloorTables(current, allocations, at))
      .toEqual({ total: 2, free: 1, occupied: 1, inactive: 1, freeByType: [{ ...squareType, free: 1 }] });
  });

  it("uses active inventory types even when no tables of that type are free", () => {
    const large = { ...table("large"), width: 100, height: 100 };
    const current = room([
      { ...table("rectangular"), shape: "RECTANGLE", width: 120 },
      large,
      { ...table("archived", false), shape: "CIRCLE" },
      table("one"),
      large,
    ]);
    const allocations = [lease(["one", "rectangular"], { releasedAt: at })];
    const rectangularType = { key: "RECTANGLE:120:80", label: "Rectangular 120 × 80" };
    const largeSquare = { key: "SQUARE:100:100", label: "Cuadrada 100 × 100", free: 1 };

    expect(summarizeFloorTables(current, allocations, "2099-12-01T22:59:59.999Z").freeByType).toEqual([
      { ...squareType, free: 0 }, largeSquare, { ...rectangularType, free: 0 },
    ]);
    expect(summarizeFloorTables(current, allocations, at)).toEqual({
      total: 3, free: 3, occupied: 0, inactive: 1,
      freeByType: [{ ...squareType, free: 1 }, largeSquare, { ...rectangularType, free: 1 }],
    });
  });

  it.each([
    ["2099-12-01T20:59:59.999Z", 0],
    ["2099-12-01T21:00:00.000Z", 1],
    ["2099-12-01T22:00:00.000Z", 1],
    ["2099-12-02T00:59:59.999Z", 1],
    ["2099-12-02T01:00:00.000Z", 0],
  ])("uses the preparation interval and half-open end at %s", (instant, occupied) => {
    expect(summarizeFloorTables(room(), [lease(["one"])], instant))
      .toEqual({ total: 3, free: 3 - occupied, occupied, inactive: 0, freeByType: [{ ...squareType, free: 3 - occupied }] });
  });

  it("makes a table free exactly at its early release, preserving its earlier occupancy", () => {
    const released = lease(["one"], { releasedAt: "2099-12-01T22:00:00.000Z" });
    expect(summarizeFloorTables(room(), [released], "2099-12-01T21:59:59.999Z").occupied).toBe(1);
    expect(summarizeFloorTables(room(), [released], "2099-12-01T22:00:00.000Z"))
      .toEqual({ total: 3, free: 3, occupied: 0, inactive: 0, freeByType: [{ ...squareType, free: 3 }] });
  });

  it("never extends the planned end with a later release or occupies a lease released before preparation", () => {
    const allocations = [
      lease(["one"], { releasedAt: "2099-12-02T02:00:00.000Z" }),
      lease(["two"], { id: "cancelled", releasedAt: "2099-12-01T20:00:00.000Z" }),
    ];
    expect(summarizeFloorTables(room(), allocations, at).occupied).toBe(1);
    expect(summarizeFloorTables(room(), allocations, "2099-12-02T01:00:00.000Z").occupied).toBe(0);
  });

  it("hands the same physical table to a contiguous allocation without double counting", () => {
    const allocations = [lease(["one"], { blockedUntil: at }), lease(["one"], { id: "next", reservationId: "next-reservation", blockedFrom: at, blockedUntil: "2099-12-02T03:00:00.000Z" })];
    expect(summarizeFloorTables(room(), allocations, at))
      .toEqual({ total: 3, free: 2, occupied: 1, inactive: 0, freeByType: [{ ...squareType, free: 2 }] });
  });
});
