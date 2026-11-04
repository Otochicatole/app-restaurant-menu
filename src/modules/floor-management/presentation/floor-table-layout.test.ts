import { describe, expect, it } from "vitest";
import { getJoinedTableGroups, validateAssembly, validateTableArrangement, type FloorLocation, type FloorPose } from "../contracts";
import { defaultLayoutCapacity, joinLayoutTables, separateLayoutTables } from "./floor-table-layout";

const area: FloorLocation = { id: "window", name: "Ventana", x: 500, y: 350, width: 1000, height: 700, rotation: 0, active: true };
function pose(tableId: string, overrides: Partial<FloorPose> = {}): FloorPose {
  return { tableId, label: tableId, shape: "SQUARE", capacity: 4, x: 100, y: 100, width: 80, height: 80, rotation: 0, ...overrides };
}
function positions(result: FloorPose[] | string): FloorPose[] {
  expect(typeof result).not.toBe("string");
  if (typeof result === "string") throw new Error(result);
  return result;
}
function width(pose: FloorPose) { return pose.rotation % 180 ? pose.height : pose.width; }
function height(pose: FloorPose) { return pose.rotation % 180 ? pose.width : pose.height; }
function horizontalGap(first: FloorPose, second: FloorPose) {
  return Math.max(first.x - width(first) / 2, second.x - width(second) / 2) - Math.min(first.x + width(first) / 2, second.x + width(second) / 2);
}
function verticalGap(first: FloorPose, second: FloorPose) {
  return Math.max(first.y - height(first) / 2, second.y - height(second) / 2) - Math.min(first.y + height(first) / 2, second.y + height(second) / 2);
}

describe("explicit table joins", () => {
  it("joins only selected mixed-size tables without rounding fractional coordinates or changing their rotation", () => {
    const input = [pose("square", { x: 130.25, y: 200, width: 80.5, height: 80.5 }),
      pose("rectangle", { shape: "RECTANGLE", x: 400.75, y: 100, width: 120.75, height: 60.25, rotation: 90 }),
      pose("other", { shape: "CIRCLE", x: 700, y: 500, width: 50.5, height: 50.5 })];
    const before = structuredClone(input);
    const result = positions(joinLayoutTables(input, ["square", "rectangle"], area));
    expect(validateAssembly(result.slice(0, 2))).toBeNull();
    expect(result[0].x).toBeCloseTo(230.3125); expect(result[1].x).toBeCloseTo(300.6875);
    expect(result[0].y).toBeCloseTo(139.9375); expect(result[1].y).toBeCloseTo(139.9375);
    expect(result.map((table) => table.rotation)).toEqual([0, 90, 0]);
    expect(result[2]).toBe(input[2]); expect(input).toEqual(before);
  });

  it("tries a vertical join when horizontal packing cannot fit the sector", () => {
    const narrow: FloorLocation = { ...area, x: 60, y: 130, width: 120, height: 260 };
    const input = [pose("a", { x: 60, y: 60 }), pose("b", { x: 60, y: 200 })];
    const result = positions(joinLayoutTables(input, ["a", "b"], narrow));
    expect(result[0].x).toBe(60); expect(result[1].x).toBe(60);
    expect(result[1].y - result[0].y).toBe(80); expect(validateAssembly(result)).toBeNull();
  });

  it("keeps joins within a rotated sector's actual bounds", () => {
    const rotated: FloorLocation = { ...area, x: 100, y: 120, width: 240, height: 100, rotation: 90 };
    const input = [pose("a", { x: 100, y: 40 }), pose("b", { x: 100, y: 200 })];
    const result = positions(joinLayoutTables(input, ["a", "b"], rotated));
    expect(result.map((table) => table.x)).toEqual([100, 100]);
    expect(validateAssembly(result)).toBeNull();
    expect(Math.min(...result.map((table) => table.y - height(table) / 2))).toBeGreaterThanOrEqual(0);
    expect(Math.max(...result.map((table) => table.y + height(table) / 2))).toBeLessThanOrEqual(240);
  });

  it("rejects an insufficient selection and reports a no-space join without mutating the draft", () => {
    const input = [pose("a"), pose("b", { x: 300 })];
    const before = structuredClone(input);
    expect(joinLayoutTables(input, ["a", "a", "missing"], area)).toMatch(/al menos dos/);
    expect(joinLayoutTables(input, ["a", "b"], { ...area, x: 50, y: 60, width: 100, height: 120 })).toMatch(/No hay espacio para unir/);
    expect(input).toEqual(before);
  });
});

describe("explicit table separation", () => {
  it("separates every selected group member by a visible 24-unit gap while preserving other tables", () => {
    const input = [pose("a", { x: 160 }), pose("b", { x: 240 }), pose("c", { x: 320 }), pose("other", { x: 750, y: 500 })];
    const before = structuredClone(input);
    const result = positions(separateLayoutTables(input, ["a", "b", "c"], area));
    expect(horizontalGap(result[0], result[1])).toBe(24); expect(horizontalGap(result[1], result[2])).toBe(24);
    expect(getJoinedTableGroups(result)).toHaveLength(4); expect(validateTableArrangement(result)).toBeNull();
    expect(result[3]).toBe(input[3]); expect(input).toEqual(before);
  });

  it("removes only the selected table from a joined group, keeping its companions and unrelated tables unchanged", () => {
    const input = [pose("a", { x: 160, y: 160 }), pose("b", { x: 240, y: 160 }), pose("c", { x: 320, y: 160 }), pose("other", { x: 750, y: 500 })];
    const result = positions(separateLayoutTables(input, ["b"], area));
    expect(result[0]).toBe(input[0]); expect(result[2]).toBe(input[2]); expect(result[3]).toBe(input[3]);
    expect(verticalGap(result[1], result[0])).toBe(24);
    expect(getJoinedTableGroups(result).find((group) => group.some((table) => table.tableId === "b"))?.map((table) => table.tableId)).toEqual(["b"]);
    expect(validateTableArrangement(result)).toBeNull();
  });

  it("uses another direction when sector bounds prevent a horizontal split", () => {
    const bounded: FloorLocation = { ...area, x: 120, y: 100, width: 240, height: 200 };
    const input = [pose("a", { x: 40, y: 40 }), pose("b", { x: 120, y: 40 })];
    const result = positions(separateLayoutTables(input, ["a"], bounded));
    expect(result[0]).toMatchObject({ x: 40, y: 144 }); expect(result[1]).toBe(input[1]);
    expect(verticalGap(result[0], result[1])).toBe(24); expect(getJoinedTableGroups(result)).toHaveLength(2);
  });

  it("tries vertical packing to separate a whole group in a narrow sector", () => {
    const narrow: FloorLocation = { ...area, x: 50, y: 125, width: 100, height: 250 };
    const input = [pose("a", { x: 50, y: 80 }), pose("b", { x: 50, y: 160 })];
    const result = positions(separateLayoutTables(input, ["a", "b"], narrow));
    expect(result.map((table) => table.x)).toEqual([50, 50]); expect(verticalGap(result[0], result[1])).toBe(24);
    expect(getJoinedTableGroups(result)).toHaveLength(2);
  });

  it("does not overlap an unrelated table when selecting a separation direction", () => {
    const input = [pose("a"), pose("b", { x: 180 }), pose("blocker", { x: 20, width: 40, height: 40 })];
    const result = positions(separateLayoutTables(input, ["a"], area));
    expect(result[0]).toMatchObject({ x: 100, y: 204 });
    expect(result[1]).toBe(input[1]); expect(result[2]).toBe(input[2]); expect(validateTableArrangement(result)).toBeNull();
  });

  it("reports no space for either a whole group or a single member and leaves the original poses intact", () => {
    const full: FloorLocation = { ...area, x: 80, y: 40, width: 160, height: 80 };
    const input = [pose("a", { x: 40, y: 40 }), pose("b", { x: 120, y: 40 })];
    const before = structuredClone(input);
    expect(separateLayoutTables(input, ["a", "b"], full)).toMatch(/No hay espacio para separar esas mesas/);
    expect(separateLayoutTables(input, ["a"], full)).toMatch(/No hay espacio para separar esa mesa/);
    expect(input).toEqual(before);
  });

  it("leaves unselected groups and already separate tables unchanged", () => {
    const input = [pose("a"), pose("b", { x: 180 }), pose("single", { x: 700 })];
    expect(separateLayoutTables(input, ["single", "missing"], area)).toBe(input);
    expect(separateLayoutTables(input, [], area)).toBe(input);
  });
});

describe("capacity across visual groups", () => {
  it("offers six useful places for joined 4 + 4 and eight after separation", () => {
    const joined = [pose("a"), pose("b", { x: 180 })];
    expect(defaultLayoutCapacity(joined)).toBe(6);
    const separate = positions(separateLayoutTables(joined, ["a", "b"], area));
    expect(defaultLayoutCapacity(separate)).toBe(8);
    expect(defaultLayoutCapacity(positions(joinLayoutTables(separate, ["a", "b"], area)))).toBe(6);
  });

  it("deducts join losses within each connected component independently", () => {
    const multiple = [pose("a"), pose("b", { x: 180 }), pose("single", { x: 400, capacity: 3 }), pose("d", { x: 600 }), pose("e", { x: 680 })];
    expect(getJoinedTableGroups(multiple).map((group) => group.length)).toEqual([2, 1, 2]);
    expect(defaultLayoutCapacity(multiple)).toBe(15);
    expect(defaultLayoutCapacity([multiple[2]])).toBe(3);
  });
});
