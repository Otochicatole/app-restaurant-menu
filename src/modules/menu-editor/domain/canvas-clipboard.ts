import type { CanvasDocumentV1, CanvasNode } from "../contracts";
import { clampGroupDelta } from "./canvas-geometry";
import { descendantGroupIds, descendantNodeIds } from "./layer-tree";

export const CANVAS_PASTE_OFFSET = 24;

export type CanvasClipboardSnapshot = {
  nodes: CanvasNode[];
  groups: CanvasDocumentV1["groups"];
};

export type PastedCanvasSelection = CanvasClipboardSnapshot & { rootGroupIds: string[] };

/** Creates a detached snapshot while preserving the document's layer order. */
export function copyCanvasSelection(document: CanvasDocumentV1, selectedIds: string[], selectedGroupId: string | null = null): CanvasClipboardSnapshot | null {
  const selected = new Set(selectedIds);
  const copiedGroupIds = new Set<string>();

  if (selectedGroupId && document.groups.some((group) => group.id === selectedGroupId)) {
    descendantGroupIds(document, selectedGroupId, true).forEach((id) => copiedGroupIds.add(id));
    descendantNodeIds(document, selectedGroupId).forEach((id) => selected.add(id));
  } else {
    document.groups.forEach((group) => {
      const descendants = descendantNodeIds(document, group.id);
      if (descendants.length && descendants.every((id) => selected.has(id))) copiedGroupIds.add(group.id);
    });
    [...copiedGroupIds].forEach((groupId) => descendantGroupIds(document, groupId).forEach((id) => copiedGroupIds.add(id)));
  }

  const groups = document.groups
    .filter((group) => copiedGroupIds.has(group.id))
    .map((group) => ({ ...group, nodeIds: [...group.nodeIds] }));
  const nodes = document.nodes
    .filter((node) => selected.has(node.id))
    .map((node) => {
      const copy = cloneCanvasNode(node);
      if (copy.groupId && !copiedGroupIds.has(copy.groupId)) copy.groupId = null;
      return copy;
    });

  return nodes.length || groups.length ? { nodes, groups } : null;
}

/**
 * Materializes a clipboard snapshot with fresh IDs. Paste sequence 1 is offset
 * by 24 px, sequence 2 by 48 px, and so on. The selection moves as one unit.
 */
export function pasteCanvasSelection(
  snapshot: CanvasClipboardSnapshot,
  targetDocument: CanvasDocumentV1,
  createId: () => string,
  pasteSequence = 1,
): PastedCanvasSelection {
  if (!snapshot.nodes.length && !snapshot.groups.length) return { nodes: [], groups: [], rootGroupIds: [] };

  const nodeIdMap = new Map(snapshot.nodes.map((node) => [node.id, createId()]));
  const groupIdMap = new Map(snapshot.groups.map((group) => [group.id, createId()]));
  const distance = CANVAS_PASTE_OFFSET * Math.max(1, Math.trunc(pasteSequence));
  const geometryNodes = snapshot.nodes.map((node) => ({ ...node, locked: false }) as CanvasNode);
  const nodeIds = geometryNodes.map((node) => node.id);
  const forward = clampGroupDelta(geometryNodes, nodeIds, targetDocument.canvasBounds, { x: distance, y: distance });
  const delta = hasMovement(forward)
    ? forward
    : clampGroupDelta(geometryNodes, nodeIds, targetDocument.canvasBounds, { x: -distance, y: -distance });

  const existingGroupIds = new Set(targetDocument.groups.map((group) => group.id));
  const snapshotGroupIds = new Set(snapshot.groups.map((group) => group.id));
  const rootGroups = snapshot.groups.filter((group) => !group.parentGroupId || !snapshotGroupIds.has(group.parentGroupId));
  const rootGroupIds = rootGroups.map((group) => groupIdMap.get(group.id)!);
  const nextOrders = new Map<string, number>();
  const nextOrder = (parentGroupId: string | null) => {
    const key = parentGroupId ?? "__root__";
    const current = nextOrders.get(key);
    if (current !== undefined) { nextOrders.set(key, current + 1); return current; }
    const orders = [
      ...targetDocument.nodes.filter((node) => node.groupId === parentGroupId).map((node) => node.layerOrder),
      ...targetDocument.groups.filter((group) => group.parentGroupId === parentGroupId).map((group) => group.layerOrder),
    ];
    const first = (orders.length ? Math.max(...orders) : -1) + 1;
    nextOrders.set(key, first + 1);
    return first;
  };

  const nodes = snapshot.nodes.map((node) => {
    const copy = cloneCanvasNode(node);
    copy.id = nodeIdMap.get(node.id)!;
    copy.x += delta.x;
    copy.y += delta.y;
    copy.groupId = copy.groupId ? groupIdMap.get(copy.groupId) ?? null : null;
    if (!copy.groupId) copy.layerOrder = nextOrder(null);
    return copy;
  });
  const groups = snapshot.groups.map((group) => ({
    ...group,
    id: groupIdMap.get(group.id)!,
    parentGroupId: group.parentGroupId
      ? groupIdMap.get(group.parentGroupId) ?? (existingGroupIds.has(group.parentGroupId) ? group.parentGroupId : null)
      : null,
    nodeIds: group.nodeIds.flatMap((nodeId) => {
      const mappedId = nodeIdMap.get(nodeId);
      return mappedId ? [mappedId] : [];
    }),
  }));
  rootGroups.forEach((source) => {
    const pasted = groups.find((group) => group.id === groupIdMap.get(source.id));
    if (pasted) pasted.layerOrder = nextOrder(pasted.parentGroupId);
  });

  return { nodes, groups, rootGroupIds };
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
