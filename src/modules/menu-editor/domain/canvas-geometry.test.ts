import { describe, expect, it } from "vitest";
import { cameraForViewport, clampGroupDelta, screenRectToWorld, zoomViewportAt } from "./canvas-geometry";
import type { CanvasNode } from "../contracts";

const bounds = { x: 0, y: 0, width: 1000, height: 800 };
const size = { width: 1000, height: 800 };
const text = (id: string, x: number, y: number): CanvasNode => ({ id, type: "text", x, y, width: 100, height: 40, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, layerOrder: 0, link: null, text: id, modalAssetId: null, fontAssetId: null, fontSize: 20, fontWeight: "400", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "top", lineHeight: 1.2, letterSpacing: 0, fill: "#171717", semanticRole: "paragraph" });

describe("canvas geometry", () => {
  it("centers the sheet at the fitted camera", () => {
    expect(cameraForViewport(bounds, bounds, size).camera).toEqual(bounds);
  });

  it("clamps a zoomed camera to each sheet edge", () => {
    const zoomed = zoomViewportAt(bounds, bounds, size, 2, { x: 500, y: 400 });
    expect(cameraForViewport({ ...zoomed, x: -500, y: -500 }, bounds, size).camera).toMatchObject({ x: 0, y: 0 });
    expect(cameraForViewport({ ...zoomed, x: 5000, y: 5000 }, bounds, size).camera).toMatchObject({ x: 500, y: 400 });
  });

  it.each([320, 390, 440, 1024])("fits the entire public canvas width on a %ipx screen, regardless of document resolution", (screenWidth) => {
    for (const width of [20, 1080, 10_000, 100_000]) {
      const sheet = { x: -120, y: -80, width, height: 100_000 };
      const screen = { width: screenWidth - 20, height: 900 };
      const { camera, scale, fitScale } = cameraForViewport(sheet, sheet, screen, 0.1, 8, "width");
      expect(scale).toBeCloseTo(screen.width / width);
      expect(scale).toBe(fitScale);
      expect(camera.width).toBeCloseTo(width);
      expect(camera.x).toBeCloseTo(sheet.x);
      expect(camera.y).toBeCloseTo(sheet.y - Math.max(0, camera.height - sheet.height) / 2);
    }
  });

  it("allows manual zoom and horizontal panning, then zooms back to the full width", () => {
    const sheet = { x: -120, y: -80, width: 10_000, height: 40_000 };
    const screen = { width: 420, height: 900 };
    const point = { x: 210, y: 450 };
    const zoomed = zoomViewportAt(sheet, sheet, screen, 2, point, 0.1, 8, "width");
    expect(zoomed.width).toBeCloseTo(sheet.width / 2);
    expect(zoomed.x).toBeCloseTo(sheet.x + sheet.width / 4);
    const panned = cameraForViewport({ ...zoomed, x: 4000, y: 5000 }, sheet, screen, 0.1, 8, "width").camera;
    expect(panned.x).toBe(4000);
    expect(panned.y).toBe(5000);
    const fitted = zoomViewportAt(panned, sheet, screen, 0.01, point, 0.1, 8, "width");
    expect(fitted.width).toBeCloseTo(sheet.width);
    expect(fitted.x).toBeCloseTo(sheet.x);
  });

  it("preserves the horizontal framing after panning when the screen size changes", () => {
    const sheet = { x: 0, y: 0, width: 1080, height: 5000 };
    const screen = { width: 420, height: 900 };
    for (const factor of [1, 2]) {
      const viewport = zoomViewportAt(sheet, sheet, screen, factor, { x: 210, y: 450 }, 0.1, 8, "width");
      const panned = { ...viewport, y: 1500 };
      for (const resized of [{ width: 780, height: 400 }, { width: 420, height: 700 }]) {
        const next = cameraForViewport(panned, sheet, resized, 0.1, 8, "width");
        expect(next.camera.width).toBeCloseTo(viewport.width);
        expect(next.camera.x).toBeCloseTo(viewport.x);
        expect(next.camera.y).toBe(panned.y);
        expect(next.scale / next.fitScale).toBeCloseTo(factor);
      }
    }
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
