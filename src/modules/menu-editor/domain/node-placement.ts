import type { CanvasRect } from "./canvas-geometry";

export function placeNodeInCanvas(bounds: CanvasRect, viewport: CanvasRect, preferredWidth: number, preferredHeight: number): CanvasRect {
  const width = Math.max(4, Math.min(preferredWidth, bounds.width));
  const height = Math.max(4, Math.min(preferredHeight, bounds.height));
  if (![bounds.x, bounds.y, bounds.width, bounds.height, viewport.x, viewport.y, viewport.width, viewport.height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { x: bounds.x + (bounds.width - width) / 2, y: bounds.y + (bounds.height - height) / 2, width, height };
  }
  const visibleLeft = Math.max(bounds.x, viewport.x);
  const visibleTop = Math.max(bounds.y, viewport.y);
  const visibleRight = Math.min(bounds.x + bounds.width, viewport.x + viewport.width);
  const visibleBottom = Math.min(bounds.y + bounds.height, viewport.y + viewport.height);
  const centerX = visibleRight > visibleLeft ? (visibleLeft + visibleRight) / 2 : bounds.x + bounds.width / 2;
  const centerY = visibleBottom > visibleTop ? (visibleTop + visibleBottom) / 2 : bounds.y + bounds.height / 2;

  return {
    x: Math.max(bounds.x, Math.min(bounds.x + bounds.width - width, centerX - width / 2)),
    y: Math.max(bounds.y, Math.min(bounds.y + bounds.height - height, centerY - height / 2)),
    width,
    height,
  };
}
