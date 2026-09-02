import { CORNER_RADII, STROKE_SIDES, type CanvasShapeNode, type CornerRadiusKey, type StrokeSide } from "../contracts";

export type CornerRadii = Record<CornerRadiusKey, number>;

export type RectanglePathCommand =
  | { type: "moveTo"; x: number; y: number }
  | { type: "lineTo"; x: number; y: number }
  | { type: "arc"; centerX: number; centerY: number; radius: number; startAngle: number; endAngle: number }
  | { type: "closePath" };

export type RectangleBorderGeometry = {
  width: number;
  height: number;
  radii: CornerRadii;
  fillPath: RectanglePathCommand[];
  borderPaths: RectanglePathCommand[][];
};

type Point = { x: number; y: number };
type PathPiece = { active: boolean; start: Point; commands: RectanglePathCommand[] };

export function hasAllStrokeSides(sides: readonly StrokeSide[]): boolean {
  return STROKE_SIDES.every((side) => sides.includes(side));
}

export function toggleStrokeSide(sides: readonly StrokeSide[], side: StrokeSide): StrokeSide[] {
  const next = sides.includes(side) ? sides.filter((item) => item !== side) : [...sides, side];
  return STROKE_SIDES.filter((item) => next.includes(item));
}

export function allCornerRadii(radius = 0): CornerRadii {
  return Object.fromEntries(CORNER_RADII.map((corner) => [corner, Math.max(0, radius)])) as CornerRadii;
}

/** Applies CSS's proportional border-radius overlap rule for drawing. */
export function normalizeRectangleRadii(width: number, height: number, input: CornerRadii): CornerRadii {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const radii = allCornerRadii();
  for (const corner of CORNER_RADII) radii[corner] = Math.max(0, Number.isFinite(input[corner]) ? input[corner] : 0);

  const factors = [
    [safeWidth, radii.topLeft + radii.topRight],
    [safeWidth, radii.bottomLeft + radii.bottomRight],
    [safeHeight, radii.topLeft + radii.bottomLeft],
    [safeHeight, radii.topRight + radii.bottomRight],
  ].map(([size, sum]) => sum > 0 ? size / sum : 1);
  const factor = Math.max(0, Math.min(1, ...factors));
  for (const corner of CORNER_RADII) radii[corner] *= factor;
  return radii;
}

export function rectangleBorderGeometry(width: number, height: number, inputRadii: CornerRadii, sides: readonly StrokeSide[]): RectangleBorderGeometry {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const radii = normalizeRectangleRadii(safeWidth, safeHeight, inputRadii);
  const fillPath = roundedRectanglePath(safeWidth, safeHeight, radii);
  const active = new Set(sides);
  const pieces: PathPiece[] = [
    linePiece(active.has("top"), { x: radii.topLeft, y: 0 }, { x: safeWidth - radii.topRight, y: 0 }),
    arcPiece(active.has("top") || active.has("right"), safeWidth - radii.topRight, radii.topRight, radii.topRight, -Math.PI / 2, 0),
    linePiece(active.has("right"), { x: safeWidth, y: radii.topRight }, { x: safeWidth, y: safeHeight - radii.bottomRight }),
    arcPiece(active.has("right") || active.has("bottom"), safeWidth - radii.bottomRight, safeHeight - radii.bottomRight, radii.bottomRight, 0, Math.PI / 2),
    linePiece(active.has("bottom"), { x: safeWidth - radii.bottomRight, y: safeHeight }, { x: radii.bottomLeft, y: safeHeight }),
    arcPiece(active.has("bottom") || active.has("left"), radii.bottomLeft, safeHeight - radii.bottomLeft, radii.bottomLeft, Math.PI / 2, Math.PI),
    linePiece(active.has("left"), { x: 0, y: safeHeight - radii.bottomLeft }, { x: 0, y: radii.topLeft }),
    arcPiece(active.has("left") || active.has("top"), radii.topLeft, radii.topLeft, radii.topLeft, Math.PI, Math.PI * 1.5),
  ];

  return { width: safeWidth, height: safeHeight, radii, fillPath, borderPaths: combineActivePieces(pieces) };
}

export function rectangleBorderGeometryForNode(node: Pick<CanvasShapeNode, "width" | "height" | "cornerRadii" | "strokeSides">): RectangleBorderGeometry {
  return rectangleBorderGeometry(node.width, node.height, node.cornerRadii, node.strokeSides);
}

export interface RectanglePathContext {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, counterClockwise?: boolean): void;
  closePath(): void;
}

export function drawRectanglePath(context: RectanglePathContext, commands: readonly RectanglePathCommand[]): void {
  context.beginPath();
  for (const command of commands) {
    if (command.type === "moveTo") context.moveTo(command.x, command.y);
    else if (command.type === "lineTo") context.lineTo(command.x, command.y);
    else if (command.type === "arc") context.arc(command.centerX, command.centerY, command.radius, command.startAngle, command.endAngle);
    else context.closePath();
  }
}

function roundedRectanglePath(width: number, height: number, radii: CornerRadii): RectanglePathCommand[] {
  return [
    { type: "moveTo", x: radii.topLeft, y: 0 },
    { type: "lineTo", x: width - radii.topRight, y: 0 },
    arcOrLine(width - radii.topRight, radii.topRight, radii.topRight, -Math.PI / 2, 0, { x: width, y: radii.topRight }),
    { type: "lineTo", x: width, y: height - radii.bottomRight },
    arcOrLine(width - radii.bottomRight, height - radii.bottomRight, radii.bottomRight, 0, Math.PI / 2, { x: width - radii.bottomRight, y: height }),
    { type: "lineTo", x: radii.bottomLeft, y: height },
    arcOrLine(radii.bottomLeft, height - radii.bottomLeft, radii.bottomLeft, Math.PI / 2, Math.PI, { x: 0, y: height - radii.bottomLeft }),
    { type: "lineTo", x: 0, y: radii.topLeft },
    arcOrLine(radii.topLeft, radii.topLeft, radii.topLeft, Math.PI, Math.PI * 1.5, { x: radii.topLeft, y: 0 }),
    { type: "closePath" },
  ];
}

function linePiece(active: boolean, start: Point, end: Point): PathPiece {
  return { active, start, commands: [{ type: "lineTo", x: end.x, y: end.y }] };
}

function arcPiece(active: boolean, centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number): PathPiece {
  const start = { x: centerX + Math.cos(startAngle) * radius, y: centerY + Math.sin(startAngle) * radius };
  return { active, start, commands: radius > 0 ? [arcCommand(centerX, centerY, radius, startAngle, endAngle)] : [] };
}

function arcCommand(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number): RectanglePathCommand {
  return { type: "arc", centerX, centerY, radius, startAngle, endAngle };
}

function arcOrLine(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number, end: Point): RectanglePathCommand {
  return radius > 0 ? arcCommand(centerX, centerY, radius, startAngle, endAngle) : { type: "lineTo", x: end.x, y: end.y };
}

function combineActivePieces(pieces: readonly PathPiece[]): RectanglePathCommand[][] {
  if (!pieces.some((piece) => piece.active)) return [];
  const paths: RectanglePathCommand[][] = [];
  const starts = pieces.every((piece) => piece.active)
    ? [0]
    : pieces.map((piece, index) => piece.active && !pieces[(index + pieces.length - 1) % pieces.length].active ? index : -1).filter((index) => index >= 0);
  for (const start of starts) {
    const commands: RectanglePathCommand[] = [{ type: "moveTo", ...pieces[start].start }, ...pieces[start].commands];
    let index = (start + 1) % pieces.length;
    while (index !== start && pieces[index].active) {
      commands.push(...pieces[index].commands);
      index = (index + 1) % pieces.length;
    }
    paths.push(commands);
  }
  return paths;
}
