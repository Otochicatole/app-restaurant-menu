export const FLOOR_GRID_SIZE = 40;

export function snapToGrid(value: number, gridSize = FLOOR_GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize || 0;
}

export function snapSpanCenterToGrid(
  center: number,
  span: number,
  gridSize = FLOOR_GRID_SIZE,
  maxBound?: number,
): number {
  const half = span / 2;
  const snappedCenter = snapToGrid(center - half, gridSize) + half;
  if (maxBound === undefined || span > maxBound) return snappedCenter;
  return Math.max(half, Math.min(maxBound - half, snappedCenter));
}
