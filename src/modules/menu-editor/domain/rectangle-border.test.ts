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

  it("adds rounded corner points for every active side", () => {
    const segments = rectangleBorderSegments(100, 60, 10, ["top", "right"]);
    expect(segments).toHaveLength(1);
    expect(segments[0].slice(0, 2)[0]).toBeCloseTo(0);
    expect(segments[0].slice(0, 2)[1]).toBeCloseTo(10);
    expect(segments[0].slice(-2)[0]).toBeCloseTo(90);
    expect(segments[0].slice(-2)[1]).toBeCloseTo(60);
  });

  it("keeps the rounded halves for a side whose neighbors are inactive", () => {
    const segments = rectangleBorderSegments(100, 60, 10, ["right"]);
    expect(segments).toHaveLength(1);
    expect(segments[0].slice(0, 2)[0]).toBeCloseTo(90);
    expect(segments[0].slice(0, 2)[1]).toBeCloseTo(0);
    expect(segments[0].slice(-2)[0]).toBeCloseTo(90);
    expect(segments[0].slice(-2)[1]).toBeCloseTo(60);
  });

  it("keeps connected partial borders in one continuous run", () => {
    expect(rectangleBorderSegments(100, 60, 10, ["right", "bottom", "left"])).toHaveLength(1);
  });
});
