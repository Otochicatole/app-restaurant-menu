import type { FloorCanvasFixture, FloorCanvasTable } from "./FloorCanvas";

export type TableChair = {
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation: number;
};

type ChairPoseTable = Pick<FloorCanvasTable, "id" | "shape" | "capacity" | "x" | "y" | "width" | "height" | "rotation" | "active">;
type ChairObstacleFixture = Pick<FloorCanvasFixture, "type" | "x" | "y" | "width" | "height" | "rotation">;

const CHAIR_GAP = 2;
const OBSTRUCTION_MARGIN = 2;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function localToWorld(origin: { x: number; y: number; rotation: number }, local: { x: number; y: number }) {
  if (origin.rotation === 0) return { x: origin.x + local.x, y: origin.y + local.y };
  const rad = toRadians(origin.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: origin.x + local.x * cos - local.y * sin,
    y: origin.y + local.x * sin + local.y * cos,
  };
}

function pointInsideBox(
  point: { x: number; y: number },
  box: { x: number; y: number; width: number; height: number; rotation: number },
  margin: number,
) {
  const dx = point.x - box.x;
  const dy = point.y - box.y;
  if (box.rotation === 0) {
    return Math.abs(dx) <= box.width / 2 + margin && Math.abs(dy) <= box.height / 2 + margin;
  }
  const rad = -toRadians(box.rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  return Math.abs(lx) <= box.width / 2 + margin && Math.abs(ly) <= box.height / 2 + margin;
}

function isChairBlocked(
  worldPoint: { x: number; y: number },
  tableId: string,
  otherTables: readonly ChairPoseTable[],
  solidFixtures: readonly ChairObstacleFixture[],
) {
  for (const other of otherTables) {
    if (!other.active || other.id === tableId) continue;
    if (other.shape === "CIRCLE") {
      if (Math.hypot(worldPoint.x - other.x, worldPoint.y - other.y) <= other.width / 2 + OBSTRUCTION_MARGIN) {
        return true;
      }
      continue;
    }
    if (pointInsideBox(worldPoint, other, OBSTRUCTION_MARGIN)) return true;
  }

  for (const fixture of solidFixtures) {
    if (fixture.type === "LABEL") continue;
    if (pointInsideBox(worldPoint, fixture, OBSTRUCTION_MARGIN)) return true;
  }

  return false;
}

/** Distributes chairs along the 4 edges [top, right, bottom, left]. */
function rectangleSideCounts(count: number, width: number, height: number): [number, number, number, number] {
  if (count <= 0) return [0, 0, 0, 0];

  const squareLike = Math.abs(width - height) < 8;
  if (squareLike) {
    if (count === 1) return [1, 0, 0, 0];
    if (count === 2) return [1, 0, 1, 0];
    if (count === 3) return [1, 1, 1, 0];

    const counts: [number, number, number, number] = [1, 1, 1, 1];
    const order = [0, 2, 1, 3] as const;
    for (let i = 4; i < count; i++) {
      counts[order[(i - 4) % 4]] += 1;
    }
    return counts;
  }

  const horizontalLong = width >= height;
  if (count === 1) return horizontalLong ? [1, 0, 0, 0] : [0, 1, 0, 0];
  if (count === 2) return horizontalLong ? [1, 0, 1, 0] : [0, 1, 0, 1];
  if (count === 3) return horizontalLong ? [1, 1, 1, 0] : [1, 1, 0, 1];

  const longTotal = count - 2;
  const longA = Math.ceil(longTotal / 2);
  const longB = Math.floor(longTotal / 2);
  return horizontalLong ? [longA, 1, longB, 1] : [1, longA, 1, longB];
}

function buildLocalChairs(table: ChairPoseTable): TableChair[] {
  const count = Math.max(0, Math.floor(table.capacity));
  if (count === 0) return [];

  const minSide = Math.max(12, Math.min(table.width, table.height));
  const baseWidth = Math.max(12, Math.min(26, Math.round(minSide * 0.28)));
  const depth = Math.max(6, Math.min(9, Math.round(minSide * 0.11)));

  if (table.shape === "CIRCLE") {
    const orbit = table.width / 2 + CHAIR_GAP + depth / 2;
    const circumference = 2 * Math.PI * orbit;
    const maxFit = Math.max(1, Math.floor(circumference / 12));
    const rendered = Math.min(count, maxFit);
    const chairWidth = Math.min(baseWidth, Math.max(8, Math.floor((circumference / rendered) * 0.68)));
    const chairs: TableChair[] = [];
    for (let i = 0; i < rendered; i++) {
      const theta = (i * 2 * Math.PI) / rendered - Math.PI / 2;
      chairs.push({
        x: Math.cos(theta) * orbit,
        y: Math.sin(theta) * orbit,
        width: chairWidth,
        depth,
        rotation: (theta * 180) / Math.PI - 90,
      });
    }
    return chairs;
  }

  const counts = rectangleSideCounts(count, table.width, table.height);
  const edges: Array<{
    count: number;
    length: number;
    perpOffset: number;
    dirX: -1 | 0 | 1;
    dirY: -1 | 0 | 1;
    rotation: number;
  }> = [
    { count: counts[0], length: table.width, perpOffset: table.height / 2 + CHAIR_GAP + depth / 2, dirX: 0, dirY: -1, rotation: 180 },
    { count: counts[1], length: table.height, perpOffset: table.width / 2 + CHAIR_GAP + depth / 2, dirX: 1, dirY: 0, rotation: -90 },
    { count: counts[2], length: table.width, perpOffset: table.height / 2 + CHAIR_GAP + depth / 2, dirX: 0, dirY: 1, rotation: 0 },
    { count: counts[3], length: table.height, perpOffset: table.width / 2 + CHAIR_GAP + depth / 2, dirX: -1, dirY: 0, rotation: 90 },
  ];

  const chairs: TableChair[] = [];
  for (const edge of edges) {
    if (edge.count <= 0) continue;
    const maxFit = Math.max(1, Math.floor(edge.length / 11));
    const rendered = Math.min(edge.count, maxFit);
    const slot = edge.length / rendered;
    const chairWidth = Math.min(baseWidth, Math.max(7, Math.floor(slot * 0.68)));
    for (let i = 0; i < rendered; i++) {
      const along = -edge.length / 2 + slot * (i + 0.5);
      chairs.push({
        x: edge.dirX !== 0 ? edge.dirX * edge.perpOffset : along,
        y: edge.dirY !== 0 ? edge.dirY * edge.perpOffset : along,
        width: chairWidth,
        depth,
        rotation: edge.rotation,
      });
    }
  }
  return chairs;
}

/**
 * Computes top-down chair placements around a table in local table coordinates,
 * omitting chairs blocked by adjacent touching tables or solid fixtures.
 */
export function computeTableChairs(
  table: ChairPoseTable,
  otherTables: readonly ChairPoseTable[] = [],
  solidFixtures: readonly ChairObstacleFixture[] = [],
): TableChair[] {
  const localChairs = buildLocalChairs(table);
  if (localChairs.length === 0 || (otherTables.length === 0 && solidFixtures.length === 0)) {
    return localChairs;
  }

  return localChairs.filter((chair) => {
    const worldPoint = localToWorld(table, chair);
    return !isChairBlocked(worldPoint, table.id, otherTables, solidFixtures);
  });
}
