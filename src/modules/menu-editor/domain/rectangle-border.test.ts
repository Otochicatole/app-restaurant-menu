import { describe, expect, it } from "vitest";
import { STROKE_SIDES } from "../contracts";
import { allCornerRadii, hasAllStrokeSides, normalizeRectangleRadii, rectangleBorderGeometry, toggleStrokeSide } from "./rectangle-border";

describe("rectangle border geometry", () => {
  it("keeps side toggles in canonical order and supports arbitrary combinations", () => {
    expect(toggleStrokeSide(["left"], "top")).toEqual(["top", "left"]);
    expect(toggleStrokeSide(["top", "left"], "left")).toEqual(["top"]);
    expect(hasAllStrokeSides([...STROKE_SIDES])).toBe(true);
  });

  it("returns no border path when no side is active", () => {
    const geometry = rectangleBorderGeometry(100, 60, allCornerRadii(10), []);
    expect(geometry.borderPaths).toEqual([]);
    expect(geometry.fillPath.some((command) => command.type === "arc")).toBe(true);
  });

  it("keeps the two rounded corners of a right-only border", () => {
    const geometry = rectangleBorderGeometry(100, 60, allCornerRadii(10), ["right"]);
    expect(geometry.borderPaths).toHaveLength(1);
    expect(geometry.borderPaths[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "arc", radius: 10, startAngle: -Math.PI / 2, endAngle: 0 }),
      expect.objectContaining({ type: "arc", radius: 10, startAngle: 0, endAngle: Math.PI / 2 }),
    ]));
    expect(geometry.borderPaths[0][0]).toEqual({ type: "moveTo", x: 90, y: 0 });
  });

  it("uses independent radii for each corner and keeps zero-radius corners square", () => {
    const geometry = rectangleBorderGeometry(100, 60, { topLeft: 12, topRight: 20, bottomRight: 30, bottomLeft: 0 }, ["top", "right", "bottom", "left"]);
    expect(geometry.radii).toEqual({ topLeft: 12, topRight: 20, bottomRight: 30, bottomLeft: 0 });
    expect(geometry.fillPath.filter((command) => command.type === "arc")).toHaveLength(3);
  });

  it("reduces radii proportionally using CSS overlap constraints", () => {
    expect(normalizeRectangleRadii(100, 60, allCornerRadii(80))).toEqual({ topLeft: 30, topRight: 30, bottomRight: 30, bottomLeft: 30 });
    expect(normalizeRectangleRadii(100, 60, { topLeft: 80, topRight: 0, bottomRight: 0, bottomLeft: 0 }).topLeft).toBe(60);
  });

  it("keeps connected partial borders in one continuous run", () => {
    expect(rectangleBorderGeometry(100, 60, allCornerRadii(10), ["right", "bottom", "left"]).borderPaths).toHaveLength(1);
  });
});
