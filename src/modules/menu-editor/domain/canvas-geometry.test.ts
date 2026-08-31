import { describe, expect, it } from "vitest";
import { cameraForViewport, clampGroupDelta, screenRectToWorld, zoomViewportAt } from "./canvas-geometry";
import type { CanvasNode } from "../contracts";

const bounds = { x: 0, y: 0, width: 1000, height: 800 };
const size = { width: 1000, height: 800 };
const text = (id: string, x: number, y: number): CanvasNode => ({ id, type: "text", x, y, width: 100, height: 40, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, text: id, fontAssetId: null, fontSize: 20, fontWeight: "400", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "top", lineHeight: 1.2, letterSpacing: 0, fill: "#171717", semanticRole: "paragraph" });

describe("canvas geometry", () => {
  it("centers the sheet at the fitted camera", () => {
    expect(cameraForViewport(bounds, bounds, size).camera).toEqual(bounds);
  });

  it("clamps a zoomed camera to each sheet edge", () => {
    const zoomed = zoomViewportAt(bounds, bounds, size, 2, { x: 500, y: 400 });
    expect(cameraForViewport({ ...zoomed, x: -500, y: -500 }, bounds, size).camera).toMatchObject({ x: 0, y: 0 });
    expect(cameraForViewport({ ...zoomed, x: 5000, y: 5000 }, bounds, size).camera).toMatchObject({ x: 500, y: 400 });
  });

  it("converts the selection rectangle without rounding", () => {
    expect(screenRectToWorld({ x: 13, y: 17, width: 101, height: 79 }, { x: 100, y: 200, width: 500, height: 400 }, 2)).toEqual({ x: 106.5, y: 208.5, width: 50.5, height: 39.5 });
  });

  it("keeps a group inside the sheet", () => {
    expect(clampGroupDelta([text("a", 50, 60), text("b", 300, 200)], ["a", "b"], bounds, { x: 800, y: -100 })).toEqual({ x: 600, y: -60 });
  });

  it("does not turn an oversized group into a fixed jump", () => {
    expect(clampGroupDelta([{ ...text("large", -200, -100), width: 1400, height: 1000 }], ["large"], bounds, { x: 37.25, y: 11.5 })).toEqual({ x: 37.25, y: 11.5 });
  });
});
