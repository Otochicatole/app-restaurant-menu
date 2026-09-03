import type { CanvasNode } from "../contracts";

export type CanvasRect = { x: number; y: number; width: number; height: number };
export type CanvasSize = { width: number; height: number };
export type CanvasPoint = { x: number; y: number };

export const CANVAS_GRID_SPACING = 20;

export function visibleCanvasGridLines(bounds: CanvasRect, viewport: CanvasRect): { vertical: number[]; horizontal: number[] } {
  return {
    vertical: gridAxisLines(bounds.x, bounds.width, viewport.x, viewport.width),
    horizontal: gridAxisLines(bounds.y, bounds.height, viewport.y, viewport.height),
  };
}

export function snapValueToCanvasGrid(value: number, origin: number): number {
  return origin + Math.round((value - origin) / CANVAS_GRID_SPACING) * CANVAS_GRID_SPACING;
}

export function snapFrameToCanvasGrid(frame: CanvasRect, bounds: CanvasRect): CanvasRect {
  const x = snapValueToCanvasGrid(frame.x, bounds.x);
  const y = snapValueToCanvasGrid(frame.y, bounds.y);
  const right = snapValueToCanvasGrid(frame.x + frame.width, bounds.x);
  const bottom = snapValueToCanvasGrid(frame.y + frame.height, bounds.y);
  return { x, y, width: Math.max(4, right - x), height: Math.max(4, bottom - y) };
}

export function cameraForViewport(viewport: CanvasRect, bounds: CanvasRect, size: CanvasSize, minScale = 0.1, maxScale = 8, fitMode: "contain" | "cover" | "width" = "contain") {
  const fitRatio = fitMode === "cover" ? Math.max(size.width / bounds.width, size.height / bounds.height) : fitMode === "width" ? size.width / bounds.width : Math.min(size.width / bounds.width, size.height / bounds.height);
  // Public menus fit their entire width, even below the editor's minimum zoom.
  const fitScale = fitMode === "width" ? fitRatio : Math.max(minScale, Math.min(maxScale, fitRatio));
  // Keep the horizontal framing when the screen resizes or mobile browser bars move.
  const requestedScale = fitMode === "width" ? size.width / viewport.width : Math.min(size.width / viewport.width, size.height / viewport.height);
  const scale = Math.max(fitScale, Math.min(maxScale, requestedScale));
  const width = size.width / scale;
  const height = size.height / scale;
  const maxX = bounds.x + bounds.width - width;
  const maxY = bounds.y + bounds.height - height;
  const camera = {
    x: width >= bounds.width ? bounds.x - (width - bounds.width) / 2 : clamp(viewport.x, bounds.x, maxX),
    y: height >= bounds.height ? bounds.y - (height - bounds.height) / 2 : clamp(viewport.y, bounds.y, maxY),
    width,
    height,
  };
  return { camera, scale, fitScale };
}

export function zoomViewportAt(viewport: CanvasRect, bounds: CanvasRect, size: CanvasSize, factor: number, point: CanvasPoint, minScale = 0.1, maxScale = 8, fitMode: "contain" | "cover" | "width" = "contain"): CanvasRect {
  const current = cameraForViewport(viewport, bounds, size, minScale, maxScale, fitMode);
  const nextScale = Math.max(current.fitScale, Math.min(maxScale, current.scale * factor));
  const worldX = current.camera.x + point.x / current.scale;
  const worldY = current.camera.y + point.y / current.scale;
  const next = {
    x: worldX - point.x / nextScale,
    y: worldY - point.y / nextScale,
    width: size.width / nextScale,
    height: size.height / nextScale,
  };
  return cameraForViewport(next, bounds, size, minScale, maxScale, fitMode).camera;
}

export function screenRectToWorld(rect: CanvasRect, camera: CanvasRect, scale: number): CanvasRect {
  return { x: camera.x + rect.x / scale, y: camera.y + rect.y / scale, width: rect.width / scale, height: rect.height / scale };
}

export function clampGroupDelta(nodes: CanvasNode[], ids: string[], bounds: CanvasRect, delta: CanvasPoint): CanvasPoint {
  const moving = nodes.filter((node) => ids.includes(node.id) && !node.locked);
  if (!moving.length) return delta;
  const rotated = moving.map(rotatedNodeBounds);
  const minX = Math.min(...rotated.map((rect) => rect.x));
  const minY = Math.min(...rotated.map((rect) => rect.y));
  const maxX = Math.max(...rotated.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...rotated.map((rect) => rect.y + rect.height));
  return {
    x: clampDelta(delta.x, bounds.x - minX, bounds.x + bounds.width - maxX),
    y: clampDelta(delta.y, bounds.y - minY, bounds.y + bounds.height - maxY),
  };
}

function rotatedNodeBounds(node: CanvasNode): CanvasRect {
  if (!node.rotation) return { x: node.x, y: node.y, width: node.width, height: node.height };
  const angle = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const points = [
    { x: 0, y: 0 },
    { x: node.width, y: 0 },
    { x: node.width, y: node.height },
    { x: 0, y: node.height },
  ].map((point) => ({ x: node.x + point.x * cos - point.y * sin, y: node.y + point.x * sin + point.y * cos }));
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function gridAxisLines(boundsStart: number, boundsLength: number, viewportStart: number, viewportLength: number): number[] {
  const visibleStart = Math.max(boundsStart, viewportStart);
  const visibleEnd = Math.min(boundsStart + boundsLength, viewportStart + viewportLength);
  if (visibleEnd < visibleStart) return [];
  const firstIndex = Math.ceil((visibleStart - boundsStart) / CANVAS_GRID_SPACING);
  const lastIndex = Math.floor((visibleEnd - boundsStart) / CANVAS_GRID_SPACING);
  return Array.from({ length: Math.max(0, lastIndex - firstIndex + 1) }, (_, index) => boundsStart + (firstIndex + index) * CANVAS_GRID_SPACING);
}

function clamp(value: number, min: number, max: number): number {
  return min > max ? value : Math.max(min, Math.min(max, value));
}

function clampDelta(value: number, min: number, max: number): number {
  return min > max ? value : clamp(value, min, max);
}
