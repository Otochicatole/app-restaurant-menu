import { describe, expect, it } from "vitest";
import { placeNodeInCanvas } from "./node-placement";

describe("placeNodeInCanvas", () => {
  it("centers a new node inside the visible canvas", () => {
    expect(placeNodeInCanvas({ x: -120, y: -80, width: 1240, height: 900 }, { x: -120, y: -80, width: 1240, height: 900 }, 360, 80)).toEqual({ x: 320, y: 330, width: 360, height: 80 });
  });

  it("uses the currently visible region after zooming and panning", () => {
    expect(placeNodeInCanvas({ x: 0, y: 0, width: 1200, height: 900 }, { x: 400, y: 250, width: 500, height: 400 }, 260, 160)).toEqual({ x: 520, y: 370, width: 260, height: 160 });
  });

  it("keeps the complete node inside a canvas edge", () => {
    expect(placeNodeInCanvas({ x: 0, y: 0, width: 1000, height: 800 }, { x: 900, y: 700, width: 400, height: 300 }, 280, 180)).toEqual({ x: 720, y: 620, width: 280, height: 180 });
  });

  it("shrinks a default node when the canvas is smaller than it", () => {
    expect(placeNodeInCanvas({ x: 10, y: 20, width: 100, height: 60 }, { x: 10, y: 20, width: 100, height: 60 }, 360, 80)).toEqual({ x: 10, y: 20, width: 100, height: 60 });
  });
});
