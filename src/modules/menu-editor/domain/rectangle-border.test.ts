import { describe, expect, it } from "vitest";
import { STROKE_SIDES } from "../contracts";
import { hasAllStrokeSides, rectangleBorderSegments, toggleStrokeSide } from "./rectangle-border";

describe("rectangle border sides", () => {
  it("keeps side toggles in canonical order and supports arbitrary combinations", () => {
    expect(toggleStrokeSide(["left"], "top")).toEqual(["top", "left"]);
    expect(toggleStrokeSide(["top", "left"], "left")).toEqual(["top"]);
    expect(hasAllStrokeSides([...STROKE_SIDES])).toBe(true);
  });

  it("returns one straight segment per active side without a radius", () => {
    expect(rectangleBorderSegments(100, 60, 0, ["top", "bottom"])).toEqual([
      [0, 0, 100, 0],
      [100, 60, 0, 60],
    ]);
  });

  it("adds rounded corner points only where neighboring sides meet", () => {
    const segments = rectangleBorderSegments(100, 60, 10, ["top", "right"]);
    expect(segments).toHaveLength(1);
    expect(segments[0].slice(0, 2)).toEqual([10, 0]);
    expect(segments[0].slice(-2)[0]).toBe(100);
    expect(segments[0].slice(-2)[1]).toBe(50);
  });

  it("keeps connected partial borders in one continuous run", () => {
    expect(rectangleBorderSegments(100, 60, 10, ["right", "bottom", "left"])).toHaveLength(1);
  });
});
