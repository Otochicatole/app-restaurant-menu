import type { CanvasDocumentV1, CanvasNode } from "../contracts";
import { clampGroupDelta } from "./canvas-geometry";

export const CANVAS_PASTE_OFFSET = 24;

export type CanvasClipboardSnapshot = {
  nodes: CanvasNode[];
  groups: CanvasDocumentV1["groups"];
};

export type PastedCanvasSelection = CanvasClipboardSnapshot;

/** Creates a detached snapshot while preserving the document's layer order. */
export function copyCanvasSelection(document: CanvasDocumentV1, selectedIds: string[]): CanvasClipboardSnapshot | null {
  const selected = new Set(selectedIds);
  const groups = document.groups
    .filter((group) => group.nodeIds.length > 0 && group.nodeIds.every((nodeId) => selected.has(nodeId)))
    .map((group) => ({ ...group, nodeIds: [...group.nodeIds] }));
  const copiedGroupIds = new Set(groups.map((group) => group.id));
  const nodes = document.nodes
    .filter((node) => selected.has(node.id))
    .map((node) => {
      const copy = cloneCanvasNode(node);
      if (copy.groupId && !copiedGroupIds.has(copy.groupId)) copy.groupId = null;
      return copy;
    });

  return nodes.length ? { nodes, groups } : null;
}

/**
 * Materializes a clipboard snapshot with fresh IDs. Paste sequence 1 is offset
 * by 24 px, sequence 2 by 48 px, and so on. The selection moves as one unit.
 */
export function pasteCanvasSelection(
  snapshot: CanvasClipboardSnapshot,
  bounds: CanvasDocumentV1["canvasBounds"],
  createId: () => string,
  pasteSequence = 1,
): PastedCanvasSelection {
  if (!snapshot.nodes.length) return { nodes: [], groups: [] };

  const nodeIdMap = new Map(snapshot.nodes.map((node) => [node.id, createId()]));
  const groupIdMap = new Map(snapshot.groups.map((group) => [group.id, createId()]));
  const distance = CANVAS_PASTE_OFFSET * Math.max(1, Math.trunc(pasteSequence));
  const geometryNodes = snapshot.nodes.map((node) => ({ ...node, locked: false }) as CanvasNode);
  const nodeIds = geometryNodes.map((node) => node.id);
  const forward = clampGroupDelta(geometryNodes, nodeIds, bounds, { x: distance, y: distance });
  const delta = hasMovement(forward)
    ? forward
    : clampGroupDelta(geometryNodes, nodeIds, bounds, { x: -distance, y: -distance });

  const nodes = snapshot.nodes.map((node) => {
    const copy = cloneCanvasNode(node);
    copy.id = nodeIdMap.get(node.id)!;
    copy.x += delta.x;
    copy.y += delta.y;
    copy.groupId = copy.groupId ? groupIdMap.get(copy.groupId) ?? null : null;
    return copy;
  });
  const groups = snapshot.groups.map((group) => ({
    ...group,
    id: groupIdMap.get(group.id)!,
    nodeIds: group.nodeIds.flatMap((nodeId) => {
      const mappedId = nodeIdMap.get(nodeId);
      return mappedId ? [mappedId] : [];
    }),
  }));

  return { nodes, groups };
}

function cloneCanvasNode(node: CanvasNode): CanvasNode {
  if (node.type !== "shape") return { ...node };
  return {
    ...node,
    strokeSides: [...node.strokeSides],
    cornerRadii: { ...node.cornerRadii },
    fillGradient: node.fillGradient ? {
      ...node.fillGradient,
      stops: [
        { ...node.fillGradient.stops[0] },
        { ...node.fillGradient.stops[1] },
      ],
    } : null,
    backgroundImage: node.backgroundImage ? { ...node.backgroundImage } : null,
  };
}

function hasMovement(delta: { x: number; y: number }): boolean {
  return Math.abs(delta.x) > Number.EPSILON || Math.abs(delta.y) > Number.EPSILON;
}
