import type { FloorRotation } from "../contracts";

export type FloorSectorResizeAnchor = "top-left" | "top-center" | "top-right" | "middle-left" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right";
export type FloorSectorResizeGeometry = { x: number; y: number; width: number; height: number; rotation: FloorRotation };
export type FloorSectorResizePoint = { x: number; y: number };

const anchors = new Set<FloorSectorResizeAnchor>(["top-left", "top-center", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-center", "bottom-right"]);
const epsilon = 0.0000001;
const maxDimension = 20_000;
const minimumDimension = 20;
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

/** Resize from a fixed drag-start rectangle and a pointer expressed in room coordinates. */
export function resizeFloorSector(
  start: FloorSectorResizeGeometry,
  anchor: FloorSectorResizeAnchor,
  pointer: FloorSectorResizePoint,
  room: { width: number; height: number },
): FloorSectorResizeGeometry | null {
  if (!anchors.has(anchor) || ![0, 90, 180, 270].includes(start.rotation)
    || ![start.x, start.y, start.width, start.height, pointer.x, pointer.y, room.width, room.height].every(Number.isFinite)
    || start.width <= 0 || start.height <= 0 || room.width <= 0 || room.height <= 0
    || Math.max(start.width, start.height, room.width, room.height) > maxDimension) return null;

  // Exact orthogonal axes avoid introducing drift at 90-degree rotations.
  const axes = start.rotation === 0 ? { ux: 1, uy: 0, vx: 0, vy: 1 }
    : start.rotation === 90 ? { ux: 0, uy: 1, vx: -1, vy: 0 }
      : start.rotation === 180 ? { ux: -1, uy: 0, vx: 0, vy: -1 }
        : { ux: 0, uy: -1, vx: 1, vy: 0 };
  const local = ({ x, y }: FloorSectorResizePoint) => ({
    x: (x - start.x) * axes.ux + (y - start.y) * axes.uy,
    y: (x - start.x) * axes.vx + (y - start.y) * axes.vy,
  });
  const corners = [{ x: 0, y: 0 }, { x: room.width, y: 0 }, { x: 0, y: room.height }, { x: room.width, y: room.height }].map(local);
  const limits = { left: Math.min(...corners.map((point) => point.x)), right: Math.max(...corners.map((point) => point.x)),
    top: Math.min(...corners.map((point) => point.y)), bottom: Math.max(...corners.map((point) => point.y)) };
  let left = -start.width / 2; let right = start.width / 2;
  let top = -start.height / 2; let bottom = start.height / 2;
  if (left < limits.left - epsilon || right > limits.right + epsilon || top < limits.top - epsilon || bottom > limits.bottom + epsilon) return null;

  const target = local(pointer);
  // Each moved edge is bounded by its stationary opposite edge, preventing flips.
  if (anchor.endsWith("left")) left = clamp(target.x, limits.left, right - Math.min(minimumDimension, right - limits.left));
  if (anchor.endsWith("right")) right = clamp(target.x, left + Math.min(minimumDimension, limits.right - left), limits.right);
  if (anchor.startsWith("top")) top = clamp(target.y, limits.top, bottom - Math.min(minimumDimension, bottom - limits.top));
  if (anchor.startsWith("bottom")) bottom = clamp(target.y, top + Math.min(minimumDimension, limits.bottom - top), limits.bottom);

  const x = (left + right) / 2; const y = (top + bottom) / 2;
  return { x: start.x + x * axes.ux + y * axes.vx, y: start.y + x * axes.uy + y * axes.vy,
    width: right - left, height: bottom - top, rotation: start.rotation };
}
