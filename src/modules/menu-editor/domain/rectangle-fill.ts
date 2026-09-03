import type { FillGradient, RectangleBackgroundImage } from "../contracts";

export type GradientPoint = { x: number; y: number };
export type GradientEndpoints = { start: GradientPoint; end: GradientPoint };
export type ImagePlacement = { x: number; y: number; width: number; height: number };

/** Returns the same line endpoints used by CSS linear-gradient angles. */
export function gradientEndpoints(width: number, height: number, angle: number): GradientEndpoints {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const radians = (normalizeAngle(angle) * Math.PI) / 180;
  const direction = { x: Math.sin(radians), y: -Math.cos(radians) };
  const length = Math.abs(safeWidth * direction.x) + Math.abs(safeHeight * direction.y);
  const center = { x: safeWidth / 2, y: safeHeight / 2 };
  return {
    start: { x: cleanCoordinate(center.x - direction.x * length / 2), y: cleanCoordinate(center.y - direction.y * length / 2) },
    end: { x: cleanCoordinate(center.x + direction.x * length / 2), y: cleanCoordinate(center.y + direction.y * length / 2) },
  };
}

export function normalizeAngle(angle: number): number {
  const normalized = Number.isFinite(angle) ? angle % 360 : 0;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function gradientColorStops(gradient: FillGradient): Array<number | string> {
  return gradient.stops.flatMap((stop) => [stop.offset, stop.color]);
}

/** Calculates the CSS background-position result for a single image layer. */
export function backgroundImagePlacement(width: number, height: number, imageWidth: number, imageHeight: number, background: Pick<RectangleBackgroundImage, "fit" | "positionX" | "positionY">): ImagePlacement {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const safeImageWidth = Math.max(1, imageWidth);
  const safeImageHeight = Math.max(1, imageHeight);
  const positionX = clampUnit(background.positionX);
  const positionY = clampUnit(background.positionY);
  if (background.fit === "stretch") return { x: 0, y: 0, width: safeWidth, height: safeHeight };

  const scale = background.fit === "cover"
    ? Math.max(safeWidth / safeImageWidth, safeHeight / safeImageHeight)
    : Math.min(safeWidth / safeImageWidth, safeHeight / safeImageHeight);
  const renderedWidth = safeImageWidth * scale;
  const renderedHeight = safeImageHeight * scale;
  return {
    x: (safeWidth - renderedWidth) * positionX,
    y: (safeHeight - renderedHeight) * positionY,
    width: renderedWidth,
    height: renderedHeight,
  };
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5));
}

function cleanCoordinate(value: number): number {
  return Math.abs(value) < 1e-10 ? 0 : Number(value.toFixed(10));
}
