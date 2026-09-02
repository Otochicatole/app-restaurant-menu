import { STROKE_SIDES, type StrokeSide } from "../contracts";

type Point = { x: number; y: number };

export function hasAllStrokeSides(sides: readonly StrokeSide[]): boolean {
  return STROKE_SIDES.every((side) => sides.includes(side));
}

export function toggleStrokeSide(sides: readonly StrokeSide[], side: StrokeSide): StrokeSide[] {
  const next = sides.includes(side) ? sides.filter((item) => item !== side) : [...sides, side];
  return STROKE_SIDES.filter((item) => next.includes(item));
}

/**
 * Returns continuous perimeter runs for selected border-* sides. Every active
 * side includes its adjacent rounded corner halves, even when the neighboring
 * side is inactive; shared corners are still emitted only once.
 */
export function rectangleBorderSegments(width: number, height: number, radius: number, sides: readonly StrokeSide[]): number[][] {
  const active = new Set(sides);
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const safeRadius = Math.min(Math.max(0, radius), safeWidth / 2, safeHeight / 2);
  const hasRadius = safeRadius > 0;
  const pieces: { active: boolean; points: Point[] }[] = [
    { active: active.has("top"), points: [{ x: safeRadius, y: 0 }, { x: safeWidth - safeRadius, y: 0 }] },
    { active: hasRadius && (active.has("top") || active.has("right")), points: arcPoints(safeWidth - safeRadius, safeRadius, safeRadius, -Math.PI / 2, 0) },
    { active: active.has("right"), points: [{ x: safeWidth, y: safeRadius }, { x: safeWidth, y: safeHeight - safeRadius }] },
    { active: hasRadius && (active.has("right") || active.has("bottom")), points: arcPoints(safeWidth - safeRadius, safeHeight - safeRadius, safeRadius, 0, Math.PI / 2) },
    { active: active.has("bottom"), points: [{ x: safeWidth - safeRadius, y: safeHeight }, { x: safeRadius, y: safeHeight }] },
    { active: hasRadius && (active.has("bottom") || active.has("left")), points: arcPoints(safeRadius, safeHeight - safeRadius, safeRadius, Math.PI / 2, Math.PI) },
    { active: active.has("left"), points: [{ x: 0, y: safeHeight - safeRadius }, { x: 0, y: safeRadius }] },
    { active: hasRadius && (active.has("left") || active.has("top")), points: arcPoints(safeRadius, safeRadius, safeRadius, Math.PI, Math.PI * 1.5) },
  ];
  if (!pieces.some((piece) => piece.active)) return [];
  if (pieces.every((piece) => piece.active)) return [flatten(pieces.flatMap((piece) => piece.points))];

  const segments: number[][] = [];
  const starts = pieces.map((piece, index) => piece.active && !pieces[(index + pieces.length - 1) % pieces.length].active ? index : -1).filter((index) => index >= 0);
  for (const start of starts) {
    const points = [...pieces[start].points];
    let index = (start + 1) % pieces.length;
    while (index !== start && pieces[index].active) {
      points.push(...pieces[index].points.slice(1));
      index = (index + 1) % pieces.length;
    }
    segments.push(flatten(points));
  }
  return segments;
}

function arcPoints(centerX: number, centerY: number, radius: number, start: number, end: number): Point[] {
  if (radius === 0) return [{ x: centerX, y: centerY }];
  const steps = Math.max(24, Math.min(128, Math.ceil(radius / 4)));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = start + ((end - start) * index) / steps;
    return { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
  });
}

function flatten(points: Point[]): number[] {
  return points.flatMap((point) => [point.x, point.y]);
}
