import { describe, expect, it } from "vitest";
import { resizeFloorSector, type FloorSectorResizeAnchor, type FloorSectorResizeGeometry } from "./floor-sector-resize";

const start: FloorSectorResizeGeometry = { x: 200, y: 180, width: 120, height: 80, rotation: 0 };
const room = { width: 500, height: 400 };
const opposite: Record<FloorSectorResizeAnchor, FloorSectorResizeAnchor> = {
  "top-left": "bottom-right", "top-center": "bottom-center", "top-right": "bottom-left", "middle-left": "middle-right",
  "middle-right": "middle-left", "bottom-left": "top-right", "bottom-center": "top-center", "bottom-right": "top-left",
};
function handle(rect: FloorSectorResizeGeometry, anchor: FloorSectorResizeAnchor) {
  const x = anchor.endsWith("left") ? -rect.width / 2 : anchor.endsWith("right") ? rect.width / 2 : 0;
  const y = anchor.startsWith("top") ? -rect.height / 2 : anchor.startsWith("bottom") ? rect.height / 2 : 0;
  const radians = rect.rotation * Math.PI / 180;
  return { x: rect.x + x * Math.cos(radians) - y * Math.sin(radians), y: rect.y + x * Math.sin(radians) + y * Math.cos(radians) };
}
function expectSamePoint(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 8); expect(actual.y).toBeCloseTo(expected.y, 8);
}

describe("sector resize geometry", () => {
  it.each([
    { anchor: "top-left", pointer: { x: 100, y: 100 }, expected: { x: 180, y: 160, width: 160, height: 120 } },
    { anchor: "top-center", pointer: { x: 999, y: 100 }, expected: { x: 200, y: 160, width: 120, height: 120 } },
    { anchor: "top-right", pointer: { x: 300, y: 100 }, expected: { x: 220, y: 160, width: 160, height: 120 } },
    { anchor: "middle-left", pointer: { x: 100, y: 999 }, expected: { x: 180, y: 180, width: 160, height: 80 } },
    { anchor: "middle-right", pointer: { x: 300, y: -999 }, expected: { x: 220, y: 180, width: 160, height: 80 } },
    { anchor: "bottom-left", pointer: { x: 100, y: 260 }, expected: { x: 180, y: 200, width: 160, height: 120 } },
    { anchor: "bottom-center", pointer: { x: -999, y: 260 }, expected: { x: 200, y: 200, width: 120, height: 120 } },
    { anchor: "bottom-right", pointer: { x: 300, y: 260 }, expected: { x: 220, y: 200, width: 160, height: 120 } },
  ] as const)("resizes $anchor while fixing its opposite handle", ({ anchor, pointer, expected }) => {
    const resized = resizeFloorSector(start, anchor, pointer, room)!;
    expect(resized).toEqual({ ...expected, rotation: 0 });
    expectSamePoint(handle(resized, opposite[anchor]), handle(start, opposite[anchor]));
  });

  it.each([
    { rotation: 90, pointer: { x: 280, y: 100 }, expected: { x: 220, y: 170, width: 140, height: 120 } },
    { rotation: 180, pointer: { x: 300, y: 260 }, expected: { x: 220, y: 200, width: 160, height: 120 } },
    { rotation: 270, pointer: { x: 100, y: 280 }, expected: { x: 170, y: 200, width: 160, height: 140 } },
  ] as const)("preserves the opposite world corner at $rotation degrees", ({ rotation, pointer, expected }) => {
    const initial = { ...start, rotation };
    const resized = resizeFloorSector(initial, "top-left", pointer, room)!;
    expect(resized).toEqual({ ...expected, rotation });
    expectSamePoint(handle(resized, "bottom-right"), handle(initial, "bottom-right"));
  });

  it("clamps every rotated handle inside the room without moving its opposite edge", () => {
    for (const rotation of [0, 90, 180, 270] as const) for (const anchor of Object.keys(opposite) as FloorSectorResizeAnchor[]) {
      const initial = { ...start, rotation };
      const resized = resizeFloorSector(initial, anchor, { x: -100_000, y: 100_000 }, room)!;
      expect(resized).not.toBeNull();
      expect(resized.width).toBeGreaterThanOrEqual(20); expect(resized.height).toBeGreaterThanOrEqual(20);
      expectSamePoint(handle(resized, opposite[anchor]), handle(initial, opposite[anchor]));
      for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"] as const) {
        const point = handle(resized, corner);
        expect(point.x).toBeGreaterThanOrEqual(-0.000001); expect(point.x).toBeLessThanOrEqual(room.width + 0.000001);
        expect(point.y).toBeGreaterThanOrEqual(-0.000001); expect(point.y).toBeLessThanOrEqual(room.height + 0.000001);
      }
    }
  });

  it("prevents flips when the dragged corner crosses the stationary corner", () => {
    expect(resizeFloorSector(start, "top-left", { x: 1000, y: 1000 }, room)).toEqual({ x: 250, y: 210, width: 20, height: 20, rotation: 0 });
  });

  it("fits small rooms and preserves a narrow untouched axis", () => {
    const small = { x: 5, y: 4, width: 10, height: 8, rotation: 0 as const };
    expect(resizeFloorSector(small, "bottom-right", { x: 100, y: 100 }, { width: 10, height: 8 })).toEqual(small);
    const narrow = { x: 5, y: 30, width: 10, height: 20, rotation: 0 as const };
    expect(resizeFloorSector(narrow, "middle-left", { x: 1000, y: 30 }, { width: 100, height: 100 })).toEqual(narrow);
    expect(resizeFloorSector({ x: 40, y: 40, width: 8, height: 10, rotation: 0 }, "bottom-center", { x: 999, y: 80 }, { width: 100, height: 100 }))
      .toEqual({ x: 40, y: 57.5, width: 8, height: 45, rotation: 0 });
  });

  it("takes world coordinates independently of the camera and leaves its inputs untouched", () => {
    const initial = Object.freeze({ ...start }); const target = Object.freeze({ x: 100, y: 100 }); const bounds = Object.freeze({ ...room });
    for (const camera of [{ scale: 0.5, x: 70, y: -20 }, { scale: 3, x: -400, y: 200 }]) {
      const screen = { x: target.x * camera.scale + camera.x, y: target.y * camera.scale + camera.y };
      const world = { x: (screen.x - camera.x) / camera.scale, y: (screen.y - camera.y) / camera.scale };
      expect(resizeFloorSector(initial, "top-left", world, bounds)).toEqual({ x: 180, y: 160, width: 160, height: 120, rotation: 0 });
    }
    expect(initial).toEqual(start); expect(target).toEqual({ x: 100, y: 100 }); expect(bounds).toEqual(room);
  });

  it("rejects invalid geometry, room bounds and nonfinite pointers", () => {
    for (const invalid of [{ ...start, x: NaN }, { ...start, width: 0 }, { ...start, height: -1 }, { ...start, rotation: 45 }, { ...start, x: -1 }, { ...start, y: 399 }]) {
      expect(resizeFloorSector(invalid as FloorSectorResizeGeometry, "top-left", { x: 100, y: 100 }, room)).toBeNull();
    }
    for (const pointer of [{ x: Infinity, y: 100 }, { x: 100, y: NaN }]) expect(resizeFloorSector(start, "top-left", pointer, room)).toBeNull();
    for (const invalidRoom of [{ width: 0, height: 400 }, { width: 500, height: Infinity }, { width: 20_001, height: 400 }]) {
      expect(resizeFloorSector(start, "top-left", { x: 100, y: 100 }, invalidRoom)).toBeNull();
    }
    expect(resizeFloorSector(start, "unknown" as FloorSectorResizeAnchor, { x: 100, y: 100 }, room)).toBeNull();
  });
});
