import type { CanvasDocumentV1, CanvasGroup, CanvasNode } from "../contracts";
import type { CanvasRect } from "./canvas-geometry";

export type CanvasLayerRef = { kind: "node" | "group"; id: string };
export type CanvasLayerState = {
  effectiveVisible: boolean;
  effectiveLocked: boolean;
  inheritedHidden: boolean;
  inheritedLocked: boolean;
};
export type CanvasLayerRow = CanvasLayerState & {
  ref: CanvasLayerRef;
  parentGroupId: string | null;
  depth: number;
};
export type CanvasLayerMoveDestination =
  | { type: "inside"; groupId: string }
  | { type: "before" | "after"; target: CanvasLayerRef }
  | { type: "root-front" }
  | { type: "outdent" };

export type CanvasLayerIndex = {
  nodesById: ReadonlyMap<string, CanvasNode>;
  groupsById: ReadonlyMap<string, CanvasGroup>;
  nodeStates: ReadonlyMap<string, CanvasLayerState>;
  groupStates: ReadonlyMap<string, CanvasLayerState>;
  outermostGroupIds: ReadonlyMap<string, string>;
  descendantNodeIds(groupId: string): readonly string[];
  directItemsByParentId: ReadonlyMap<string | null, readonly CanvasLayerRef[]>;
};

/** Builds the read model used while rendering. Call once per document revision. */
export function createCanvasLayerIndex(document: CanvasDocumentV1): CanvasLayerIndex {
  const nodesById = new Map(document.nodes.map((node) => [node.id, node]));
  const groupsById = new Map(document.groups.map((group) => [group.id, group]));
  const groupStates = new Map<string, CanvasLayerState>();
  const outermostGroupByGroupId = new Map<string, string>();
  const branchGroupIdsByGroupId = new Map<string, ReadonlySet<string>>();

  document.groups.forEach((group) => {
    const ancestors = indexedAncestorGroups(group.parentGroupId, groupsById);
    const inheritedHidden = ancestors.some((ancestor) => !ancestor.visible);
    const inheritedLocked = ancestors.some((ancestor) => ancestor.locked);
    groupStates.set(group.id, {
      effectiveVisible: group.visible && !inheritedHidden,
      effectiveLocked: group.locked || inheritedLocked,
      inheritedHidden,
      inheritedLocked,
    });
    outermostGroupByGroupId.set(group.id, ancestors.at(-1)?.id ?? group.id);
    branchGroupIdsByGroupId.set(group.id, new Set([group.id, ...ancestors.map((ancestor) => ancestor.id)]));
  });

  const nodeStates = new Map<string, CanvasLayerState>();
  const outermostGroupIds = new Map<string, string>();
  document.nodes.forEach((node) => {
    const parentState = node.groupId ? groupStates.get(node.groupId) : undefined;
    const inheritedHidden = parentState ? !parentState.effectiveVisible : false;
    const inheritedLocked = parentState?.effectiveLocked ?? false;
    nodeStates.set(node.id, {
      effectiveVisible: node.visible && !inheritedHidden,
      effectiveLocked: node.locked || inheritedLocked,
      inheritedHidden,
      inheritedLocked,
    });
    if (node.groupId) {
      outermostGroupIds.set(node.id, outermostGroupByGroupId.get(node.groupId) ?? node.groupId);
    }
  });

  const descendantCache = new Map<string, readonly string[]>();
  const indexedDescendantNodeIds = (groupId: string): readonly string[] => {
    const cached = descendantCache.get(groupId);
    if (cached) return cached;
    const result = document.nodes.filter((node) => node.groupId && branchGroupIdsByGroupId.get(node.groupId)?.has(groupId)).map((node) => node.id);
    descendantCache.set(groupId, result);
    return result;
  };

  const directItemsWithOrder = new Map<string | null, Array<CanvasLayerRef & { order: number; stable: number }>>();
  const addDirectItem = (parentId: string | null, item: CanvasLayerRef & { order: number; stable: number }) => {
    const siblings = directItemsWithOrder.get(parentId) ?? [];
    siblings.push(item);
    directItemsWithOrder.set(parentId, siblings);
  };
  document.nodes.forEach((node, stable) => addDirectItem(node.groupId, { kind: "node", id: node.id, order: node.layerOrder, stable }));
  document.groups.forEach((group, stable) => addDirectItem(group.parentGroupId, { kind: "group", id: group.id, order: group.layerOrder, stable: document.nodes.length + stable }));
  const directItemsByParentId = new Map<string | null, readonly CanvasLayerRef[]>();
  directItemsWithOrder.forEach((items, parentId) => directItemsByParentId.set(parentId, items.sort((first, second) => first.order - second.order || first.stable - second.stable).map(({ kind, id }) => ({ kind, id }))));

  return { nodesById, groupsById, nodeStates, groupStates, outermostGroupIds, descendantNodeIds: indexedDescendantNodeIds, directItemsByParentId };
}

export function directLayerItems(document: CanvasDocumentV1, parentGroupId: string | null): CanvasLayerRef[] {
  const items: Array<CanvasLayerRef & { order: number; stable: number }> = [];
  document.nodes.forEach((node, index) => {
    if (node.groupId === parentGroupId) items.push({ kind: "node", id: node.id, order: node.layerOrder, stable: index });
  });
  document.groups.forEach((group, index) => {
    if (group.parentGroupId === parentGroupId) items.push({ kind: "group", id: group.id, order: group.layerOrder, stable: document.nodes.length + index });
  });
  return items.sort((first, second) => first.order - second.order || first.stable - second.stable).map(({ kind, id }) => ({ kind, id }));
}

export function layerTreeRows(document: CanvasDocumentV1, collapsedGroupIds: ReadonlySet<string>, index = createCanvasLayerIndex(document)): CanvasLayerRow[] {
  const rows: CanvasLayerRow[] = [];
  const visited = new Set<string>();
  const visit = (parentGroupId: string | null, depth: number) => {
    [...(index.directItemsByParentId.get(parentGroupId) ?? [])].reverse().forEach((ref) => {
      if (ref.kind === "node") {
        const node = index.nodesById.get(ref.id);
        const state = index.nodeStates.get(ref.id);
        if (node && state) rows.push({ ref, parentGroupId, depth, ...state });
        return;
      }
      if (visited.has(ref.id)) return;
      visited.add(ref.id);
      const group = index.groupsById.get(ref.id);
      const state = index.groupStates.get(ref.id);
      if (!group || !state) return;
      rows.push({ ref, parentGroupId, depth, ...state });
      if (!collapsedGroupIds.has(group.id)) visit(group.id, depth + 1);
    });
  };
  visit(null, 0);
  return rows;
}

export function descendantGroupIds(document: CanvasDocumentV1, groupId: string, includeSelf = false): string[] {
  const result: string[] = [];
  const queue = includeSelf ? [groupId] : document.groups.filter((group) => group.parentGroupId === groupId).map((group) => group.id);
  const visited = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    document.groups.forEach((group) => { if (group.parentGroupId === current) queue.push(group.id); });
  }
  return result;
}

export function descendantNodeIds(document: CanvasDocumentV1, groupId: string): string[] {
  const groupIds = new Set(descendantGroupIds(document, groupId, true));
  return document.nodes.filter((node) => node.groupId && groupIds.has(node.groupId)).map((node) => node.id);
}

export function outermostGroupId(document: CanvasDocumentV1, nodeId: string): string | null {
  let current = document.nodes.find((node) => node.id === nodeId)?.groupId ?? null;
  let outermost = current;
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    visited.add(current);
    outermost = current;
    current = document.groups.find((group) => group.id === current)?.parentGroupId ?? null;
  }
  return outermost;
}

export function nodeLayerState(document: CanvasDocumentV1, nodeOrId: CanvasNode | string): CanvasLayerState {
  const node = typeof nodeOrId === "string" ? document.nodes.find((candidate) => candidate.id === nodeOrId) : nodeOrId;
  if (!node) return { effectiveVisible: false, effectiveLocked: true, inheritedHidden: false, inheritedLocked: false };
  const ancestors = ancestorGroups(document, node.groupId);
  const inheritedHidden = ancestors.some((group) => !group.visible);
  const inheritedLocked = ancestors.some((group) => group.locked);
  return {
    effectiveVisible: node.visible && !inheritedHidden,
    effectiveLocked: node.locked || inheritedLocked,
    inheritedHidden,
    inheritedLocked,
  };
}

export function groupLayerState(document: CanvasDocumentV1, groupOrId: CanvasGroup | string): CanvasLayerState {
  const group = typeof groupOrId === "string" ? document.groups.find((candidate) => candidate.id === groupOrId) : groupOrId;
  if (!group) return { effectiveVisible: false, effectiveLocked: true, inheritedHidden: false, inheritedLocked: false };
  const ancestors = ancestorGroups(document, group.parentGroupId);
  const inheritedHidden = ancestors.some((ancestor) => !ancestor.visible);
  const inheritedLocked = ancestors.some((ancestor) => ancestor.locked);
  return {
    effectiveVisible: group.visible && !inheritedHidden,
    effectiveLocked: group.locked || inheritedLocked,
    inheritedHidden,
    inheritedLocked,
  };
}

export function createCanvasGroup(document: CanvasDocumentV1, id: string, name: string, parentGroupId: string | null): CanvasDocumentV1 {
  const parent = parentGroupId && document.groups.some((group) => group.id === parentGroupId) ? parentGroupId : null;
  const layerOrder = directLayerItems(document, parent).length;
  return {
    ...document,
    groups: [...document.groups, { id, name, nodeIds: [], parentGroupId: parent, layerOrder, visible: true, locked: false }],
  };
}

export function groupCanvasSelection(document: CanvasDocumentV1, selected: CanvasLayerRef[], id: string, name: string): CanvasDocumentV1 {
  const refs = removeNestedSelections(document, selected.filter((ref) => layerExists(document, ref)));
  if (!refs.length) return document;
  const parentGroupId = lowestCommonParent(document, refs.map((ref) => layerParentId(document, ref)));
  const parentItems = directLayerItems(document, parentGroupId);
  const branchKeys = new Set(refs.map((ref) => layerKey(branchBelowParent(document, ref, parentGroupId))));
  const selectedParentIndexes = parentItems.map((ref, index) => branchKeys.has(layerKey(ref)) ? index : -1).filter((index) => index >= 0);
  const insertionOrder = selectedParentIndexes.length ? Math.max(...selectedParentIndexes) : parentItems.length;
  const globalNodeIndex = new Map(document.nodes.map((node, index) => [node.id, index]));
  const orderedRefs = [...refs].sort((first, second) => layerVisualRank(document, first, globalNodeIndex) - layerVisualRank(document, second, globalNodeIndex));

  let nodes = document.nodes.map((node) => refs.some((ref) => ref.kind === "node" && ref.id === node.id) ? { ...node, groupId: id } : node);
  let groups = document.groups.map((group) => refs.some((ref) => ref.kind === "group" && ref.id === group.id) ? { ...group, parentGroupId: id } : group);
  const newGroup: CanvasGroup = { id, name, nodeIds: [], parentGroupId, layerOrder: insertionOrder, visible: true, locked: false };
  groups = [...groups, newGroup];
  orderedRefs.forEach((ref, order) => {
    if (ref.kind === "node") nodes = nodes.map((node) => node.id === ref.id ? { ...node, layerOrder: order } : node);
    else groups = groups.map((group) => group.id === ref.id ? { ...group, layerOrder: order } : group);
  });
  return normalizeLayerMetadata({ ...document, nodes, groups });
}

export function ungroupCanvasGroup(document: CanvasDocumentV1, groupId: string): CanvasDocumentV1 {
  const group = document.groups.find((candidate) => candidate.id === groupId);
  if (!group) return document;
  const children = directLayerItems(document, groupId);
  const parentItems = directLayerItems(document, group.parentGroupId).filter((ref) => !(ref.kind === "group" && ref.id === groupId));
  const insertionIndex = Math.max(0, Math.min(parentItems.length, group.layerOrder));
  parentItems.splice(insertionIndex, 0, ...children);

  let nodes = document.nodes.map((node) => node.groupId === groupId ? { ...node, groupId: group.parentGroupId } : node);
  let groups = document.groups.filter((candidate) => candidate.id !== groupId).map((candidate) => candidate.parentGroupId === groupId ? { ...candidate, parentGroupId: group.parentGroupId } : candidate);
  ({ nodes, groups } = assignSiblingOrder(nodes, groups, group.parentGroupId, parentItems));
  return normalizeLayerMetadata({ ...document, nodes, groups });
}

export function moveCanvasLayer(document: CanvasDocumentV1, active: CanvasLayerRef, destination: CanvasLayerMoveDestination): CanvasDocumentV1 {
  if (!layerExists(document, active)) return document;
  const sourceParent = layerParentId(document, active);
  let destinationParent: string | null;
  let destinationIndex: number;

  if (destination.type === "inside") {
    if (!document.groups.some((group) => group.id === destination.groupId)) return document;
    destinationParent = destination.groupId;
    destinationIndex = directLayerItems(document, destinationParent).length;
  } else if (destination.type === "root-front") {
    destinationParent = null;
    destinationIndex = directLayerItems(document, null).length;
  } else if (destination.type === "outdent") {
    if (!sourceParent) return document;
    const sourceGroup = document.groups.find((group) => group.id === sourceParent);
    if (!sourceGroup) return document;
    destinationParent = sourceGroup.parentGroupId;
    const parentIndex = directLayerItems(document, destinationParent).findIndex((ref) => ref.kind === "group" && ref.id === sourceGroup.id);
    destinationIndex = parentIndex < 0 ? directLayerItems(document, destinationParent).length : parentIndex + 1;
  } else {
    if (!layerExists(document, destination.target) || layerKey(active) === layerKey(destination.target)) return document;
    destinationParent = layerParentId(document, destination.target);
    const destinationItems = directLayerItems(document, destinationParent).filter((ref) => layerKey(ref) !== layerKey(active));
    const targetIndex = destinationItems.findIndex((ref) => layerKey(ref) === layerKey(destination.target));
    if (targetIndex < 0) return document;
    destinationIndex = destination.type === "before" ? targetIndex + 1 : targetIndex;
  }

  if (active.kind === "group" && (destinationParent === active.id || descendantGroupIds(document, active.id).includes(destinationParent ?? ""))) return document;
  const sourceItems = directLayerItems(document, sourceParent).filter((ref) => layerKey(ref) !== layerKey(active));
  const destinationItems = sourceParent === destinationParent
    ? sourceItems
    : directLayerItems(document, destinationParent).filter((ref) => layerKey(ref) !== layerKey(active));
  destinationIndex = Math.max(0, Math.min(destinationItems.length, destinationIndex));
  destinationItems.splice(destinationIndex, 0, active);

  let nodes = document.nodes.map((node) => active.kind === "node" && node.id === active.id ? { ...node, groupId: destinationParent } : node);
  let groups = document.groups.map((group) => active.kind === "group" && group.id === active.id ? { ...group, parentGroupId: destinationParent } : group);
  ({ nodes, groups } = assignSiblingOrder(nodes, groups, sourceParent, sourceParent === destinationParent ? destinationItems : sourceItems));
  if (sourceParent !== destinationParent) ({ nodes, groups } = assignSiblingOrder(nodes, groups, destinationParent, destinationItems));
  const metadata = normalizeLayerMetadata({ ...document, nodes, groups });
  return { ...metadata, nodes: orderNodesByTree(metadata) };
}

export function moveCanvasLayerByOffset(document: CanvasDocumentV1, active: CanvasLayerRef, delta: number): CanvasDocumentV1 {
  const parent = layerParentId(document, active);
  const siblings = directLayerItems(document, parent);
  const index = siblings.findIndex((ref) => layerKey(ref) === layerKey(active));
  const targetIndex = Math.max(0, Math.min(siblings.length - 1, index + delta));
  if (index < 0 || index === targetIndex) return document;
  return moveCanvasLayer(document, active, { type: delta > 0 ? "before" : "after", target: siblings[targetIndex] });
}

export function removeCanvasNodes(document: CanvasDocumentV1, ids: string[]): CanvasDocumentV1 {
  const removed = new Set(ids);
  return normalizeLayerMetadata({ ...document, nodes: document.nodes.filter((node) => !removed.has(node.id)) });
}

export function nextRootLayerOrder(document: CanvasDocumentV1): number {
  return directLayerItems(document, null).length;
}

export function canvasGroupBounds(document: CanvasDocumentV1, groupId: string): CanvasRect | null {
  const selected = new Set(descendantNodeIds(document, groupId));
  const bounds = document.nodes.filter((node) => selected.has(node.id)).map(rotatedNodeBounds);
  if (!bounds.length) return null;
  const minX = Math.min(...bounds.map((rect) => rect.x));
  const minY = Math.min(...bounds.map((rect) => rect.y));
  const maxX = Math.max(...bounds.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...bounds.map((rect) => rect.y + rect.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function nextCanvasGroupName(document: CanvasDocumentV1): string {
  const names = new Set(document.groups.map((group) => group.name.toLocaleLowerCase()));
  let index = 1;
  while (names.has(`grupo ${index}`)) index += 1;
  return `Grupo ${index}`;
}

function normalizeLayerMetadata(document: CanvasDocumentV1): CanvasDocumentV1 {
  let nodes = document.nodes.map((node) => ({ ...node }));
  let groups = document.groups.map((group) => ({ ...group, nodeIds: [] as string[] }));
  const parentIds = new Set<string | null>([null, ...groups.map((group) => group.id)]);
  parentIds.forEach((parentId) => {
    const ordered = directLayerItems({ ...document, nodes, groups }, parentId);
    ({ nodes, groups } = assignSiblingOrder(nodes, groups, parentId, ordered));
  });
  groups = groups.map((group) => ({ ...group, nodeIds: nodes.filter((node) => node.groupId === group.id).map((node) => node.id) }));
  return { ...document, nodes, groups };
}

function assignSiblingOrder(nodes: CanvasNode[], groups: CanvasGroup[], parentId: string | null, ordered: CanvasLayerRef[]) {
  const orders = new Map(ordered.map((ref, index) => [layerKey(ref), index]));
  return {
    nodes: nodes.map((node) => node.groupId === parentId ? { ...node, layerOrder: orders.get(layerKey({ kind: "node", id: node.id })) ?? node.layerOrder } : node),
    groups: groups.map((group) => group.parentGroupId === parentId ? { ...group, layerOrder: orders.get(layerKey({ kind: "group", id: group.id })) ?? group.layerOrder } : group),
  };
}

function orderNodesByTree(document: CanvasDocumentV1): CanvasNode[] {
  const byId = new Map(document.nodes.map((node) => [node.id, node]));
  const ids: string[] = [];
  const visitedGroups = new Set<string>();
  const visit = (parentId: string | null) => directLayerItems(document, parentId).forEach((ref) => {
    if (ref.kind === "node") ids.push(ref.id);
    else if (!visitedGroups.has(ref.id)) { visitedGroups.add(ref.id); visit(ref.id); }
  });
  visit(null);
  document.nodes.forEach((node) => { if (!ids.includes(node.id)) ids.push(node.id); });
  return ids.flatMap((id) => {
    const node = byId.get(id);
    return node ? [node] : [];
  });
}

function layerParentId(document: CanvasDocumentV1, ref: CanvasLayerRef): string | null {
  return ref.kind === "node"
    ? document.nodes.find((node) => node.id === ref.id)?.groupId ?? null
    : document.groups.find((group) => group.id === ref.id)?.parentGroupId ?? null;
}

function layerExists(document: CanvasDocumentV1, ref: CanvasLayerRef): boolean {
  return ref.kind === "node" ? document.nodes.some((node) => node.id === ref.id) : document.groups.some((group) => group.id === ref.id);
}

function layerKey(ref: CanvasLayerRef): string {
  return `${ref.kind}:${ref.id}`;
}

function ancestorGroups(document: CanvasDocumentV1, firstGroupId: string | null): CanvasGroup[] {
  const result: CanvasGroup[] = [];
  const visited = new Set<string>();
  let currentId = firstGroupId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const group = document.groups.find((candidate) => candidate.id === currentId);
    if (!group) break;
    result.push(group);
    currentId = group.parentGroupId;
  }
  return result;
}

function indexedAncestorGroups(firstGroupId: string | null, groupsById: ReadonlyMap<string, CanvasGroup>): CanvasGroup[] {
  const result: CanvasGroup[] = [];
  const visited = new Set<string>();
  let currentId = firstGroupId;
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const group = groupsById.get(currentId);
    if (!group) break;
    result.push(group);
    currentId = group.parentGroupId;
  }
  return result;
}

function removeNestedSelections(document: CanvasDocumentV1, refs: CanvasLayerRef[]): CanvasLayerRef[] {
  const selectedGroups = new Set(refs.filter((ref) => ref.kind === "group").map((ref) => ref.id));
  return refs.filter((ref, index) => {
    if (refs.findIndex((candidate) => layerKey(candidate) === layerKey(ref)) !== index) return false;
    let parentId = layerParentId(document, ref);
    while (parentId) {
      if (selectedGroups.has(parentId)) return false;
      parentId = document.groups.find((group) => group.id === parentId)?.parentGroupId ?? null;
    }
    return true;
  });
}

function lowestCommonParent(document: CanvasDocumentV1, parents: Array<string | null>): string | null {
  if (!parents.length) return null;
  const chains = parents.map((parent) => [...ancestorGroups(document, parent).map((group) => group.id), null]);
  return chains[0].find((candidate) => chains.every((chain) => chain.includes(candidate))) ?? null;
}

function branchBelowParent(document: CanvasDocumentV1, ref: CanvasLayerRef, parentId: string | null): CanvasLayerRef {
  let current = ref;
  let currentParent = layerParentId(document, current);
  while (currentParent !== parentId && currentParent) {
    current = { kind: "group", id: currentParent };
    currentParent = layerParentId(document, current);
  }
  return current;
}

function layerVisualRank(document: CanvasDocumentV1, ref: CanvasLayerRef, nodeIndex: Map<string, number>): number {
  if (ref.kind === "node") return nodeIndex.get(ref.id) ?? -1;
  const descendants = descendantNodeIds(document, ref.id).map((id) => nodeIndex.get(id) ?? -1);
  return descendants.length ? Math.max(...descendants) : document.nodes.length + (document.groups.findIndex((group) => group.id === ref.id) + 1);
}

function rotatedNodeBounds(node: CanvasNode): CanvasRect {
  if (!node.rotation) return { x: node.x, y: node.y, width: node.width, height: node.height };
  const angle = (node.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const points = [
    { x: 0, y: 0 },
    { x: node.width, y: 0 },
    { x: node.width, y: node.height },
    { x: 0, y: node.height },
  ].map((point) => ({ x: node.x + point.x * cos - point.y * sin, y: node.y + point.x * sin + point.y * cos }));
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
