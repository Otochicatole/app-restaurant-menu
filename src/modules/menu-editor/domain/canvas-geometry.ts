import type { CanvasNode } from "../contracts";

export type CanvasRect = { x: number; y: number; width: number; height: number };
export type CanvasSize = { width: number; height: number };
export type CanvasPoint = { x: number; y: number };

export function cameraForViewport(viewport: CanvasRect, bounds: CanvasRect, size: CanvasSize, minScale = 0.1, maxScale = 8) {
  const fitScale = Math.max(minScale, Math.min(maxScale, Math.min(size.width / bounds.width, size.height / bounds.height)));
  const requestedScale = Math.max(minScale, Math.min(maxScale, Math.min(size.width / viewport.width, size.height / viewport.height)));
  const scale = Math.min(maxScale, Math.max(fitScale, requestedScale));
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

export function zoomViewportAt(viewport: CanvasRect, bounds: CanvasRect, size: CanvasSize, factor: number, point: CanvasPoint, minScale = 0.1, maxScale = 8): CanvasRect {
  const current = cameraForViewport(viewport, bounds, size, minScale, maxScale);
  const nextScale = Math.max(current.fitScale, Math.min(maxScale, current.scale * factor));
  const worldX = current.camera.x + point.x / current.scale;
  const worldY = current.camera.y + point.y / current.scale;
  const next = {
    x: worldX - point.x / nextScale,
    y: worldY - point.y / nextScale,
    width: size.width / nextScale,
    height: size.height / nextScale,
  };
  return cameraForViewport(next, bounds, size, minScale, maxScale).camera;
}

export function screenRectToWorld(rect: CanvasRect, camera: CanvasRect, scale: number): CanvasRect {
  return { x: camera.x + rect.x / scale, y: camera.y + rect.y / scale, width: rect.width / scale, height: rect.height / scale };
}

export function clampGroupDelta(nodes: CanvasNode[], ids: string[], bounds: CanvasRect, delta: CanvasPoint): CanvasPoint {
  const moving = nodes.filter((node) => ids.includes(node.id) && !node.locked);
  if (!moving.length) return delta;
  const minX = Math.min(...moving.map((node) => node.x));
  const minY = Math.min(...moving.map((node) => node.y));
  const maxX = Math.max(...moving.map((node) => node.x + node.width));
  const maxY = Math.max(...moving.map((node) => node.y + node.height));
  return {
    x: clampDelta(delta.x, bounds.x - minX, bounds.x + bounds.width - maxX),
    y: clampDelta(delta.y, bounds.y - minY, bounds.y + bounds.height - maxY),
  };
}

function clamp(value: number, min: number, max: number): number {
  return min > max ? value : Math.max(min, Math.min(max, value));
}

function clampDelta(value: number, min: number, max: number): number {
  return min > max ? value : clamp(value, min, max);
}
