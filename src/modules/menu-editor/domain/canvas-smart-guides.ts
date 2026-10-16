export type RectBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SmartGuideType =
  | "canvas-center-x"
  | "canvas-center-y"
  | "canvas-edge-left"
  | "canvas-edge-right"
  | "canvas-edge-top"
  | "canvas-edge-bottom"
  | "object-edge-left"
  | "object-edge-right"
  | "object-edge-top"
  | "object-edge-bottom"
  | "object-center-x"
  | "object-center-y";

export type SmartGuide = {
  orientation: "vertical" | "horizontal";
  coordinate: number; // X for vertical, Y for horizontal
  start: number;      // Y start for vertical, X start for horizontal
  end: number;        // Y end for vertical, X end for horizontal
  type: SmartGuideType;
};

export type SmartGuideOptions = {
  movingBounds: RectBounds;
  rawDelta: { x: number; y: number };
  otherNodes: RectBounds[];
  canvasBounds: RectBounds;
  scale?: number;
  snapThreshold?: number;
};

export type SmartGuideResult = {
  snappedDelta: { x: number; y: number };
  guides: SmartGuide[];
};

type TargetPoint = {
  value: number;
  type: SmartGuideType;
  isCanvas: boolean;
  nodeBounds?: RectBounds;
};

/**
 * Computes snapping offsets and alignment smart guidelines for objects being dragged on the canvas.
 * Compares against canvas edges, canvas center, and all other visible objects' edges and centers.
 */
export function computeSmartGuides({
  movingBounds,
  rawDelta,
  otherNodes,
  canvasBounds,
  scale = 1,
  snapThreshold,
}: SmartGuideOptions): SmartGuideResult {
  const threshold = snapThreshold ?? Math.min(20, Math.max(4, 6 / (scale || 1)));

  const proposedX = movingBounds.x + rawDelta.x;
  const proposedY = movingBounds.y + rawDelta.y;
  const w = movingBounds.width;
  const h = movingBounds.height;

  // 1. Prepare vertical targets (X coordinates)
  const verticalTargets: TargetPoint[] = [
    { value: canvasBounds.x, type: "canvas-edge-left", isCanvas: true },
    { value: Math.round(canvasBounds.x + canvasBounds.width / 2), type: "canvas-center-x", isCanvas: true },
    { value: canvasBounds.x + canvasBounds.width, type: "canvas-edge-right", isCanvas: true },
  ];

  for (const node of otherNodes) {
    verticalTargets.push(
      { value: node.x, type: "object-edge-left", isCanvas: false, nodeBounds: node },
      { value: Math.round(node.x + node.width / 2), type: "object-center-x", isCanvas: false, nodeBounds: node },
      { value: node.x + node.width, type: "object-edge-right", isCanvas: false, nodeBounds: node }
    );
  }

  // 2. Prepare horizontal targets (Y coordinates)
  const horizontalTargets: TargetPoint[] = [
    { value: canvasBounds.y, type: "canvas-edge-top", isCanvas: true },
    { value: Math.round(canvasBounds.y + canvasBounds.height / 2), type: "canvas-center-y", isCanvas: true },
    { value: canvasBounds.y + canvasBounds.height, type: "canvas-edge-bottom", isCanvas: true },
  ];

  for (const node of otherNodes) {
    horizontalTargets.push(
      { value: node.y, type: "object-edge-top", isCanvas: false, nodeBounds: node },
      { value: Math.round(node.y + node.height / 2), type: "object-center-y", isCanvas: false, nodeBounds: node },
      { value: node.y + node.height, type: "object-edge-bottom", isCanvas: false, nodeBounds: node }
    );
  }

  // 3. Find closest snap on X
  const movingXPoints = [
    { value: proposedX, name: "left" },
    { value: proposedX + w / 2, name: "center" },
    { value: proposedX + w, name: "right" },
  ];

  let bestXDiff = Infinity;
  let snapOffsetX = 0;
  let winningXTargets: TargetPoint[] = [];

  for (const mx of movingXPoints) {
    for (const target of verticalTargets) {
      const diff = target.value - mx.value;
      const absDiff = Math.abs(diff);
      if (absDiff <= threshold) {
        if (absDiff < bestXDiff - 0.001) {
          bestXDiff = absDiff;
          snapOffsetX = diff;
          winningXTargets = [target];
        } else if (Math.abs(absDiff - bestXDiff) <= 0.001 && Math.abs(diff - snapOffsetX) <= 0.001) {
          winningXTargets.push(target);
        }
      }
    }
  }

  // 4. Find closest snap on Y
  const movingYPoints = [
    { value: proposedY, name: "top" },
    { value: proposedY + h / 2, name: "center" },
    { value: proposedY + h, name: "bottom" },
  ];

  let bestYDiff = Infinity;
  let snapOffsetY = 0;
  let winningYTargets: TargetPoint[] = [];

  for (const my of movingYPoints) {
    for (const target of horizontalTargets) {
      const diff = target.value - my.value;
      const absDiff = Math.abs(diff);
      if (absDiff <= threshold) {
        if (absDiff < bestYDiff - 0.001) {
          bestYDiff = absDiff;
          snapOffsetY = diff;
          winningYTargets = [target];
        } else if (Math.abs(absDiff - bestYDiff) <= 0.001 && Math.abs(diff - snapOffsetY) <= 0.001) {
          winningYTargets.push(target);
        }
      }
    }
  }

  const hasXSnap = bestXDiff <= threshold;
  const hasYSnap = bestYDiff <= threshold;

  const snappedDelta = {
    x: rawDelta.x + (hasXSnap ? snapOffsetX : 0),
    y: rawDelta.y + (hasYSnap ? snapOffsetY : 0),
  };

  const finalX = movingBounds.x + snappedDelta.x;
  const finalY = movingBounds.y + snappedDelta.y;

  const guides: SmartGuide[] = [];

  // 5. Generate vertical guide lines for winning X targets
  if (hasXSnap && winningXTargets.length > 0) {
    const byCoordinate = new Map<number, TargetPoint[]>();
    for (const target of winningXTargets) {
      const key = Math.round(target.value);
      const list = byCoordinate.get(key) ?? [];
      list.push(target);
      byCoordinate.set(key, list);
    }

    for (const [coord, targets] of byCoordinate) {
      const hasCanvas = targets.some((t) => t.isCanvas);
      let start: number;
      let end: number;

      if (hasCanvas) {
        // Full canvas height span
        start = canvasBounds.y;
        end = canvasBounds.y + canvasBounds.height;
      } else {
        // Span between moving object and matched nodes
        const yMinCandidates = [finalY];
        const yMaxCandidates = [finalY + h];

        for (const t of targets) {
          if (t.nodeBounds) {
            yMinCandidates.push(t.nodeBounds.y);
            yMaxCandidates.push(t.nodeBounds.y + t.nodeBounds.height);
          }
        }

        const margin = 12;
        start = Math.max(canvasBounds.y, Math.min(...yMinCandidates) - margin);
        end = Math.min(canvasBounds.y + canvasBounds.height, Math.max(...yMaxCandidates) + margin);
      }

      guides.push({
        orientation: "vertical",
        coordinate: coord,
        start,
        end,
        type: targets[0].type,
      });
    }
  }

  // 6. Generate horizontal guide lines for winning Y targets
  if (hasYSnap && winningYTargets.length > 0) {
    const byCoordinate = new Map<number, TargetPoint[]>();
    for (const target of winningYTargets) {
      const key = Math.round(target.value);
      const list = byCoordinate.get(key) ?? [];
      list.push(target);
      byCoordinate.set(key, list);
    }

    for (const [coord, targets] of byCoordinate) {
      const hasCanvas = targets.some((t) => t.isCanvas);
      let start: number;
      let end: number;

      if (hasCanvas) {
        // Full canvas width span
        start = canvasBounds.x;
        end = canvasBounds.x + canvasBounds.width;
      } else {
        // Span between moving object and matched nodes
        const xMinCandidates = [finalX];
        const xMaxCandidates = [finalX + w];

        for (const t of targets) {
          if (t.nodeBounds) {
            xMinCandidates.push(t.nodeBounds.x);
            xMaxCandidates.push(t.nodeBounds.x + t.nodeBounds.width);
          }
        }

        const margin = 12;
        start = Math.max(canvasBounds.x, Math.min(...xMinCandidates) - margin);
        end = Math.min(canvasBounds.x + canvasBounds.width, Math.max(...xMaxCandidates) + margin);
      }

      guides.push({
        orientation: "horizontal",
        coordinate: coord,
        start,
        end,
        type: targets[0].type,
      });
    }
  }

  return {
    snappedDelta,
    guides,
  };
}
