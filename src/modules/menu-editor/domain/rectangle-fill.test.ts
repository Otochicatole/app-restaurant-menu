import { describe, expect, it } from "vitest";
import { backgroundImagePlacement, gradientEndpoints } from "./rectangle-fill";

describe("rectangle fill geometry", () => {
  it("uses CSS direction conventions for vertical and horizontal gradients", () => {
    expect(gradientEndpoints(100, 60, 0)).toEqual({ start: { x: 50, y: 60 }, end: { x: 50, y: 0 } });
    expect(gradientEndpoints(100, 60, 90)).toEqual({ start: { x: 0, y: 30 }, end: { x: 100, y: 30 } });
  });

  it("normalizes arbitrary and wrapped angles", () => {
    const wrapped = gradientEndpoints(100, 60, 450);
    const normal = gradientEndpoints(100, 60, 90);
    expect(wrapped).toEqual(normal);
  });

  it("calculates cover and contain placement with a configurable focus", () => {
    expect(backgroundImagePlacement(200, 100, 100, 100, { fit: "cover", positionX: 0.5, positionY: 0.5 })).toEqual({ x: 0, y: -50, width: 200, height: 200 });
    expect(backgroundImagePlacement(200, 100, 100, 100, { fit: "contain", positionX: 1, positionY: 0 })).toEqual({ x: 100, y: 0, width: 100, height: 100 });
  });

  it("stretches the source to the rectangle", () => {
    expect(backgroundImagePlacement(200, 100, 100, 50, { fit: "stretch", positionX: 0, positionY: 1 })).toEqual({ x: 0, y: 0, width: 200, height: 100 });
  });
});
