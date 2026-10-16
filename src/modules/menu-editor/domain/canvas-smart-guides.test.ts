import { describe, expect, it } from "vitest";
import { computeSmartGuides, type RectBounds } from "./canvas-smart-guides";

const canvasBounds: RectBounds = { x: 0, y: 0, width: 1000, height: 1000 };

describe("canvas-smart-guides", () => {
  it("snaps to canvas center X when dragging near center", () => {
    // Object: width 100, height 50. Canvas center X is 500.
    // Moving object center at x=450 is 450 + 50 = 500.
    // Let's drag to x = 448 (diff = +2, within default threshold of 6)
    const movingBounds: RectBounds = { x: 0, y: 133, width: 100, height: 50 };
    const rawDelta = { x: 448, y: 0 };

    const result = computeSmartGuides({
      movingBounds,
      rawDelta,
      otherNodes: [],
      canvasBounds,
      scale: 1,
    });

    expect(result.snappedDelta.x).toBe(450); // Snapped from 448 to 450
    expect(result.guides.length).toBe(1);
    expect(result.guides[0].orientation).toBe("vertical");
    expect(result.guides[0].coordinate).toBe(500);
    expect(result.guides[0].start).toBe(0);
    expect(result.guides[0].end).toBe(1000);
    expect(result.guides[0].type).toBe("canvas-center-x");
  });

  it("snaps to canvas center Y when dragging near vertical center", () => {
    // Canvas center Y is 500.
    // Moving object height 100. Center is at y + 50.
    // When y = 450, center is 500. Dragging to y = 453 (diff = -3)
    const movingBounds: RectBounds = { x: 133, y: 0, width: 100, height: 100 };
    const rawDelta = { x: 0, y: 453 };

    const result = computeSmartGuides({
      movingBounds,
      rawDelta,
      otherNodes: [],
      canvasBounds,
      scale: 1,
    });

    expect(result.snappedDelta.y).toBe(450);
    expect(result.guides.length).toBe(1);
    expect(result.guides[0].orientation).toBe("horizontal");
    expect(result.guides[0].coordinate).toBe(500);
    expect(result.guides[0].start).toBe(0);
    expect(result.guides[0].end).toBe(1000);
    expect(result.guides[0].type).toBe("canvas-center-y");
  });

  it("snaps to another object's edge and creates spanned guideline", () => {
    const targetNode: RectBounds = { x: 300, y: 200, width: 150, height: 100 };
    const movingBounds: RectBounds = { x: 50, y: 533, width: 100, height: 80 };
    // Drag moving node near target's left edge (x=300).
    // Drag to x=298 (diff = +2)
    const rawDelta = { x: 248, y: 0 }; // 50 + 248 = 298

    const result = computeSmartGuides({
      movingBounds,
      rawDelta,
      otherNodes: [targetNode],
      canvasBounds,
      scale: 1,
    });

    expect(result.snappedDelta.x).toBe(250); // 50 + 250 = 300
    expect(result.guides.length).toBe(1);
    const guide = result.guides[0];
    expect(guide.orientation).toBe("vertical");
    expect(guide.coordinate).toBe(300);
    // Span covers target (y: 200..300) and moving (y: 533..613)
    expect(guide.start).toBeLessThanOrEqual(200);
    expect(guide.end).toBeGreaterThanOrEqual(613);
    expect(guide.type).toBe("object-edge-left");
  });

  it("snaps to another object's center X", () => {
    // Target: x=200, w=100 -> center X = 250
    // Moving: w=60. Moving center X = x + 30.
    // For moving center to be 250, moving x must be 220.
    // Drag to x=219 (diff = +1)
    const targetNode: RectBounds = { x: 200, y: 100, width: 100, height: 100 };
    const movingBounds: RectBounds = { x: 0, y: 433, width: 60, height: 60 };
    const rawDelta = { x: 219, y: 0 };

    const result = computeSmartGuides({
      movingBounds,
      rawDelta,
      otherNodes: [targetNode],
      canvasBounds,
      scale: 1,
    });

    expect(result.snappedDelta.x).toBe(220);
    expect(result.guides[0].coordinate).toBe(250);
    expect(result.guides[0].type).toBe("object-center-x");
  });

  it("snaps simultaneously on both axes (crosshair alignment)", () => {
    // Target top-left at (400, 300)
    const targetNode: RectBounds = { x: 400, y: 300, width: 120, height: 80 };
    const movingBounds: RectBounds = { x: 0, y: 0, width: 90, height: 90 };
    // Drag near target left (400) and target top (300) -> drag to (398, 302)
    const rawDelta = { x: 398, y: 302 };

    const result = computeSmartGuides({
      movingBounds,
      rawDelta,
      otherNodes: [targetNode],
      canvasBounds,
      scale: 1,
    });

    expect(result.snappedDelta).toEqual({ x: 400, y: 300 });
    expect(result.guides.length).toBe(2);

    const verticalGuide = result.guides.find((g) => g.orientation === "vertical");
    const horizontalGuide = result.guides.find((g) => g.orientation === "horizontal");

    expect(verticalGuide?.coordinate).toBe(400);
    expect(horizontalGuide?.coordinate).toBe(300);
  });

  it("does not snap when distance exceeds threshold", () => {
    const targetNode: RectBounds = { x: 300, y: 300, width: 100, height: 100 };
    const movingBounds: RectBounds = { x: 0, y: 0, width: 100, height: 100 };
    // Drag to (233, 233) which doesn't match any target point within threshold
    const rawDelta = { x: 233, y: 233 };

    const result = computeSmartGuides({
      movingBounds,
      rawDelta,
      otherNodes: [targetNode],
      canvasBounds,
      scale: 1,
    });

    expect(result.snappedDelta).toEqual(rawDelta);
    expect(result.guides).toEqual([]);
  });
});
