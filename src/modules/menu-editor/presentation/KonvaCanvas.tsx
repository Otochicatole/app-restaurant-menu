"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Arrow, Ellipse, Image as KonvaImage, Layer, Line, Rect, RegularPolygon, Shape, Star, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { CanvasDocumentV1, CanvasNode } from "../contracts";
import { cameraForViewport, screenRectToWorld, snapFrameToCanvasGrid, snapValueToCanvasGrid, visibleCanvasGridLines, zoomViewportAt } from "../domain/canvas-geometry";
import { canvasGroupBounds, type CanvasLayerIndex } from "../domain/layer-tree";
import { RectangleVisual } from "../ui/RectangleVisual";
import { LucideKonvaIcon } from "../ui/LucideKonvaIcon";
import { useSharedImage } from "../ui/use-shared-image";
import type { CanvasDropItem } from "./EditorToolsPanel";

type Viewport = CanvasDocumentV1["initialViewport"];
type EditorCanvasAsset = { url: string; kind: "IMAGE" | "VIDEO" | "FONT"; fontFamily: string | null };
const EMPTY_IDS: readonly string[] = [];
type DragSession = {
  activeId: string;
  ids: string[];
  starts: Record<string, { x: number; y: number }>;
  targets: Map<string, Konva.Node>;
  delta: { x: number; y: number };
  includeLocked: boolean;
};

export function KonvaCanvas({ document, layerIndex, assets, selectedIds, selectedGroupId, deepSelectedId, showGrid, onSelect, onSelectMany, onDropItem, onChange, onChangeMany, viewport, onViewportChange }: {
  document: CanvasDocumentV1;
  layerIndex: CanvasLayerIndex;
  assets: Record<string, EditorCanvasAsset>;
  selectedIds: string[];
  selectedGroupId: string | null;
  deepSelectedId: string | null;
  showGrid: boolean;
  onSelect: (id: string | null, additive: boolean, deep?: boolean) => void;
  onSelectMany: (ids: string[]) => void;
  onDropItem: (item: CanvasDropItem, point: { x: number; y: number }) => void;
  onChange: (id: string, patch: Partial<CanvasNode>) => void;
  onChangeMany: (ids: string[], delta: { x: number; y: number }, includeLocked?: boolean) => void;
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const groupOutlineRef = useRef<Konva.Rect>(null);
  const [size, setSize] = useState({ width: 900, height: 640 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; viewport: Viewport } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const externalViewportKey = viewportIdentity(viewport);
  const [localViewport, setLocalViewport] = useState(() => ({ externalKey: externalViewportKey, value: viewport }));
  const activeViewport = localViewport.externalKey === externalViewportKey ? localViewport.value : viewport;
  const viewportRef = useRef(activeViewport);
  const viewportCommitTimerRef = useRef<number | null>(null);
  const viewportFrameRef = useRef<number | null>(null);
  const pendingViewportRef = useRef<{ externalKey: string; value: Viewport } | null>(null);
  const dragSession = useRef<DragSession | null>(null);
  const bounds = document.canvasBounds;
  const selectedGroup = selectedGroupId ? layerIndex.groupsById.get(selectedGroupId) ?? null : null;
  const selectedGroupIds = selectedGroup ? layerIndex.descendantNodeIds(selectedGroup.id) : EMPTY_IDS;
  const selectedGroupState = selectedGroup ? layerIndex.groupStates.get(selectedGroup.id) ?? null : null;
  const selectedBounds = useMemo(() => selectedGroup ? canvasGroupBounds(document, selectedGroup.id) : null, [document, selectedGroup]);
  const scenePadding = 40;
  const sceneSize = { width: Math.max(1, size.width - scenePadding * 2), height: Math.max(1, size.height - scenePadding * 2) };
  const { camera, scale } = cameraForViewport(activeViewport, bounds, sceneSize);
  const updateViewport = (next: Viewport) => {
    viewportRef.current = next;
    pendingViewportRef.current = { externalKey: externalViewportKey, value: next };
    if (viewportFrameRef.current !== null) return;
    viewportFrameRef.current = window.requestAnimationFrame(() => {
      viewportFrameRef.current = null;
      const pending = pendingViewportRef.current;
      pendingViewportRef.current = null;
      if (pending) setLocalViewport(pending);
    });
  };
  const scheduleViewportCommit = () => {
    if (viewportCommitTimerRef.current !== null) window.clearTimeout(viewportCommitTimerRef.current);
    viewportCommitTimerRef.current = window.setTimeout(() => {
      viewportCommitTimerRef.current = null;
      onViewportChange(viewportRef.current);
    }, 120);
  };

  useLayoutEffect(() => {
    viewportRef.current = activeViewport;
  }, [activeViewport]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize({ width: element.clientWidth || 900, height: element.clientHeight || 640 }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const next = cameraForViewport(viewportRef.current, bounds, sceneSize).camera;
    viewportRef.current = next;
    onViewportChange(next);
    // The camera is derived from the current viewport; only resync when the stage dimensions change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height]);

  useEffect(() => () => {
    if (viewportCommitTimerRef.current !== null) window.clearTimeout(viewportCommitTimerRef.current);
    if (viewportFrameRef.current !== null) window.cancelAnimationFrame(viewportFrameRef.current);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;
    const nodes = selectedGroupId ? [] : selectedIds.filter((id) => !layerIndex.nodeStates.get(id)?.effectiveLocked).map((id) => stage.findOne(`#node-${id}`)).filter((node): node is Konva.Node => Boolean(node));
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, selectedGroupId, document, layerIndex]);

  useEffect(() => {
    const isFormTarget = (event: KeyboardEvent) => Boolean((event.target as HTMLElement | null)?.closest("input, textarea, select"));
    const down = (event: KeyboardEvent) => { if (isFormTarget(event)) return; if (event.code === "Space") { event.preventDefault(); setSpacePressed(true); } };
    const up = (event: KeyboardEvent) => { if (isFormTarget(event)) return; if (event.code === "Space") { event.preventDefault(); setSpacePressed(false); setPanStart(null); onViewportChange(viewportRef.current); } };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [onViewportChange]);

  const zoomAt = (factor: number, pointer: { x: number; y: number }) => {
    updateViewport(zoomViewportAt(viewportRef.current, bounds, sceneSize, factor, { x: pointer.x - scenePadding, y: pointer.y - scenePadding }));
    scheduleViewportCommit();
  };
  const pointer = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => event.target.getStage()?.getPointerPosition();
  const beginPan = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const button = "button" in event.evt ? event.evt.button : 0;
    if (!spacePressed && button !== 1) return;
    const position = pointer(event);
    if (!position) return;
    event.evt.preventDefault();
    event.cancelBubble = true;
    setPanStart({ x: position.x, y: position.y, viewport: camera });
  };
  const movePan = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!panStart) return;
    const position = pointer(event);
    if (!position) return;
    updateViewport(cameraForViewport({ ...panStart.viewport, x: panStart.viewport.x - (position.x - panStart.x) / scale, y: panStart.viewport.y - (position.y - panStart.y) / scale }, bounds, sceneSize).camera);
  };
  const beginSelection = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (spacePressed || event.evt.button !== 0 || event.target !== event.target.getStage()) return;
    const position = pointer(event);
    if (!position) return;
    setSelectionStart(position);
    setSelectionBox({ x: position.x, y: position.y, width: 0, height: 0 });
  };
  const moveSelection = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (!selectionStart) return;
    const position = pointer(event);
    if (!position) return;
    setSelectionBox({ x: Math.min(selectionStart.x, position.x), y: Math.min(selectionStart.y, position.y), width: Math.abs(position.x - selectionStart.x), height: Math.abs(position.y - selectionStart.y) });
  };
  const finishSelection = () => {
    if (!selectionStart || !selectionBox) return;
    if (selectionBox.width > 4 || selectionBox.height > 4) {
      const selection = screenRectToWorld({ ...selectionBox, x: selectionBox.x - scenePadding, y: selectionBox.y - scenePadding }, camera, scale);
      const right = selection.x + selection.width;
      const bottom = selection.y + selection.height;
      onSelectMany(document.nodes.filter((node) => {
        const state = layerIndex.nodeStates.get(node.id);
        if (!state) return false;
        return state.effectiveVisible && !state.effectiveLocked && node.x < right && node.x + node.width > selection.x && node.y < bottom && node.y + node.height > selection.y;
      }).map((node) => node.id));
    }
    setSelectionStart(null);
    setSelectionBox(null);
  };
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/x-menu-editor-item");
    if (!raw) return;
    try {
      const item = JSON.parse(raw) as CanvasDropItem;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      onDropItem(item, { x: camera.x + (event.clientX - rect.left - scenePadding) / scale, y: camera.y + (event.clientY - rect.top - scenePadding) / scale });
    } catch { /* Ignore unsupported drag payloads. */ }
  };

  const beginNodeDrag = useCallback((id: string, event: Konva.KonvaEventObject<DragEvent>) => {
    event.cancelBubble = true;
    const active = layerIndex.nodesById.get(id);
    if (!active) return;
    const movingGroupId = selectedGroupId && selectedGroupIds.includes(id) ? selectedGroupId : deepSelectedId === id ? null : layerIndex.outermostGroupIds.get(id) ?? null;
    const movingGroupState = movingGroupId ? layerIndex.groupStates.get(movingGroupId) : null;
    if (movingGroupState?.effectiveLocked || (!movingGroupId && layerIndex.nodeStates.get(id)?.effectiveLocked)) return;
    const includeLocked = Boolean(movingGroupId);
    const ids = movingGroupId
      ? [...layerIndex.descendantNodeIds(movingGroupId)]
      : (selectedIds.includes(id) ? selectedIds : [id]).filter((selectedId) => !layerIndex.nodeStates.get(selectedId)?.effectiveLocked);
    const starts = Object.fromEntries(ids.map((selectedId) => {
      const node = layerIndex.nodesById.get(selectedId)!;
      return [selectedId, { x: node.x, y: node.y }];
    }));
    const stage = stageRef.current;
    const targets = new Map(ids.flatMap((selectedId) => {
      const target = stage?.findOne(`#node-${selectedId}`);
      return target ? [[selectedId, target] as const] : [];
    }));
    dragSession.current = { activeId: id, ids, starts, targets, delta: { x: 0, y: 0 }, includeLocked };
    event.target.position(starts[id]);
  }, [deepSelectedId, layerIndex, selectedGroupId, selectedGroupIds, selectedIds]);

  const moveNodeDrag = useCallback((id: string, event: Konva.KonvaEventObject<DragEvent>) => {
    event.cancelBubble = true;
    const session = dragSession.current;
    if (!session || session.activeId !== id) return;
    const start = session.starts[id];
    if (!start) return;
    const rawDelta = { x: event.target.x() - start.x, y: event.target.y() - start.y };
    const delta = showGrid ? {
      x: snapValueToCanvasGrid(start.x + rawDelta.x, bounds.x) - start.x,
      y: snapValueToCanvasGrid(start.y + rawDelta.y, bounds.y) - start.y,
    } : rawDelta;
    session.delta = delta;
    session.ids.forEach((selectedId) => {
      const node = session.targets.get(selectedId);
      const origin = session.starts[selectedId];
      if (node && origin) {
        node.position({ x: origin.x + delta.x, y: origin.y + delta.y });
      }
    });
    if (session.includeLocked && selectedBounds) groupOutlineRef.current?.position({ x: selectedBounds.x + delta.x, y: selectedBounds.y + delta.y });
    if (!session.includeLocked) transformerRef.current?.forceUpdate();
    stageRef.current?.batchDraw();
  }, [bounds.x, bounds.y, selectedBounds, showGrid]);

  const finishNodeDrag = useCallback((id: string, event: Konva.KonvaEventObject<DragEvent>) => {
    event.cancelBubble = true;
    const session = dragSession.current;
    if (!session || session.activeId !== id) return;
    const { ids, delta, starts, includeLocked } = session;
    if (ids.length > 1 || includeLocked) onChangeMany(ids, delta, includeLocked);
    else {
      const start = starts[id];
      if (start) onChange(id, { x: start.x + delta.x, y: start.y + delta.y });
    }
    if (!includeLocked) transformerRef.current?.forceUpdate();
    dragSession.current = null;
  }, [onChange, onChangeMany]);

  return <div ref={containerRef} className={`relative h-full w-full overflow-hidden ${spacePressed ? panStart ? "cursor-grabbing" : "cursor-grab" : "cursor-default"}`} style={{ backgroundColor: document.background, cursor: spacePressed ? panStart ? "grabbing" : "grab" : "default" }} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} onContextMenu={(event) => event.preventDefault()}>
    <Stage
      ref={stageRef}
      width={size.width}
      height={size.height}
      draggable={false}
      onMouseDown={(event) => {
        if (spacePressed) {
          beginPan(event);
          return;
        }
        if (event.target === event.target.getStage()) {
          onSelect(null, false, false);
          beginSelection(event);
        }
      }}
      onMouseMove={(event) => { movePan(event); moveSelection(event); }}
      onMouseUp={() => { if (panStart) onViewportChange(viewportRef.current); setPanStart(null); finishSelection(); }}
      onMouseLeave={() => { if (panStart) onViewportChange(viewportRef.current); setPanStart(null); }}
      onTouchStart={(event) => { if (event.target === event.target.getStage()) beginPan(event); }}
      onTouchMove={movePan}
      onTouchEnd={() => { if (panStart) onViewportChange(viewportRef.current); setPanStart(null); }}
      onWheel={(event) => {
        event.evt.preventDefault();
        if (event.evt.ctrlKey || event.evt.deltaY !== 0) zoomAt(event.evt.deltaY > 0 ? 0.92 : 1.08, { x: event.evt.offsetX, y: event.evt.offsetY });
      }}
    >
      <Layer x={scenePadding - camera.x * scale} y={scenePadding - camera.y * scale} scaleX={scale} scaleY={scale} clipX={bounds.x} clipY={bounds.y} clipWidth={bounds.width} clipHeight={bounds.height}>
        <Rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill={document.background} listening={false} />
        <Rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} stroke="#10b981" strokeWidth={2 / scale} dash={[10 / scale, 8 / scale]} listening={false} />
        {showGrid && <GridOverlay bounds={bounds} viewport={camera} scale={scale} />}
        <CanvasNodes document={document} assets={assets} layerIndex={layerIndex} selectedIds={selectedIds} selectedGroupId={selectedGroupId} deepSelectedId={deepSelectedId} showGrid={showGrid} bounds={bounds} spacePressed={spacePressed} onSelect={onSelect} onChange={onChange} onDragStart={beginNodeDrag} onDragMove={moveNodeDrag} onDragEnd={finishNodeDrag} />
        {selectedBounds && selectedGroupState?.effectiveVisible && <Rect ref={groupOutlineRef} id="selected-group-outline" x={selectedBounds.x} y={selectedBounds.y} width={selectedBounds.width} height={selectedBounds.height} stroke="#059669" strokeWidth={2 / scale} dash={[8 / scale, 5 / scale]} listening={false} />}
        <Transformer id="selection-transformer" ref={transformerRef} rotateEnabled={!selectedGroupId} flipEnabled={false} boundBoxFunc={(oldBox, nextBox) => nextBox.width < 4 || nextBox.height < 4 ? oldBox : nextBox} />
      </Layer>
      {selectionBox && <Layer listening={false}><Rect x={selectionBox.x} y={selectionBox.y} width={selectionBox.width} height={selectionBox.height} fill="rgba(16,185,129,0.16)" stroke="#10b981" dash={[6, 4]} strokeWidth={1} /></Layer>}
    </Stage>
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-2 py-1 text-xs text-zinc-600 shadow">{Math.round(scale * 100)}%</div>
  </div>;
}

const CanvasNodes = memo(function CanvasNodes({ document, assets, layerIndex, selectedIds, selectedGroupId, deepSelectedId, showGrid, bounds, spacePressed, onSelect, onChange, onDragStart, onDragMove, onDragEnd }: { document: CanvasDocumentV1; assets: Record<string, EditorCanvasAsset>; layerIndex: CanvasLayerIndex; selectedIds: string[]; selectedGroupId: string | null; deepSelectedId: string | null; showGrid: boolean; bounds: CanvasDocumentV1["canvasBounds"]; spacePressed: boolean; onSelect: (id: string | null, additive: boolean, deep?: boolean) => void; onChange: (id: string, patch: Partial<CanvasNode>) => void; onDragStart: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void; onDragMove: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void; onDragEnd: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void }) {
  return <>{document.nodes.flatMap((node) => {
    const state = layerIndex.nodeStates.get(node.id);
    if (!state?.effectiveVisible) return [];
    const outerGroupId = layerIndex.outermostGroupIds.get(node.id) ?? null;
    const outerGroupState = outerGroupId ? layerIndex.groupStates.get(outerGroupId) : null;
    const deepSelected = !selectedGroupId && deepSelectedId === node.id;
    const canUseOuterGroup = Boolean(outerGroupId && !outerGroupState?.effectiveLocked);
    const interactive = deepSelected ? !state.effectiveLocked : canUseOuterGroup || !state.effectiveLocked;
    return [<CanvasNodeView key={node.id} node={node} selectedIds={selectedIds} showGrid={showGrid} gridBounds={bounds} spacePressed={spacePressed} interactive={interactive} draggable={interactive && !spacePressed} selectOuterGroup={Boolean(outerGroupId && !selectedGroupId && deepSelectedId !== node.id)} imageAsset={node.type === "image" ? assets[node.assetId] : undefined} backgroundAsset={node.type === "shape" && node.shape === "rect" && node.backgroundImage ? assets[node.backgroundImage.assetId] : undefined} fontAsset={node.type === "text" && node.fontAssetId ? assets[node.fontAssetId] : undefined} onSelect={onSelect} onChange={onChange} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd} />];
  })}</>;
}, (previous, next) => previous.document === next.document
  && previous.assets === next.assets
  && previous.layerIndex === next.layerIndex
  && previous.selectedIds === next.selectedIds
  && previous.selectedGroupId === next.selectedGroupId
  && previous.deepSelectedId === next.deepSelectedId
  && previous.showGrid === next.showGrid
  && previous.bounds === next.bounds
  && previous.spacePressed === next.spacePressed);

const CanvasNodeView = memo(function CanvasNodeView({ node, selectedIds, showGrid, gridBounds, spacePressed, interactive, draggable, selectOuterGroup, imageAsset, backgroundAsset, fontAsset, onSelect, onChange, onDragStart, onDragMove, onDragEnd }: { node: CanvasNode; selectedIds: string[]; showGrid: boolean; gridBounds: CanvasDocumentV1["canvasBounds"]; spacePressed: boolean; interactive: boolean; draggable: boolean; selectOuterGroup: boolean; imageAsset?: { url: string }; backgroundAsset?: { url: string; width?: number | null; height?: number | null }; fontAsset?: { fontFamily: string | null }; onSelect: (id: string | null, additive: boolean, deep?: boolean) => void; onChange: (id: string, patch: Partial<CanvasNode>) => void; onDragStart: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void; onDragMove: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void; onDragEnd: (id: string, event: Konva.KonvaEventObject<DragEvent>) => void }) {
  const nodeX = finiteOr(node.x, 0); const nodeY = finiteOr(node.y, 0); const nodeWidth = Math.max(4, finiteOr(node.width, 4)); const nodeHeight = Math.max(4, finiteOr(node.height, 4)); const nodeRotation = finiteOr(node.rotation, 0); const nodeOpacity = Math.max(0, Math.min(1, finiteOr(node.opacity, 1)));
  const common = { id: `node-${node.id}`, x: nodeX, y: nodeY, width: nodeWidth, height: nodeHeight, rotation: nodeRotation, opacity: nodeOpacity, listening: interactive, draggable, onMouseDown: (event: Konva.KonvaEventObject<MouseEvent>) => { if (spacePressed) return; event.cancelBubble = true; if (selectOuterGroup || event.evt.shiftKey || !selectedIds.includes(node.id)) onSelect(node.id, event.evt.shiftKey, false); }, onDblClick: (event: Konva.KonvaEventObject<MouseEvent>) => { if (spacePressed) return; event.cancelBubble = true; onSelect(node.id, false, true); }, onTouchStart: (event: Konva.KonvaEventObject<TouchEvent>) => { event.cancelBubble = true; if (selectOuterGroup || !selectedIds.includes(node.id)) onSelect(node.id, false, false); }, onDblTap: (event: Konva.KonvaEventObject<TouchEvent>) => { event.cancelBubble = true; onSelect(node.id, false, true); }, onDragStart: (event: Konva.KonvaEventObject<DragEvent>) => onDragStart(node.id, event), onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => onDragMove(node.id, event), onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => onDragEnd(node.id, event), onTransformEnd: (event: Konva.KonvaEventObject<Event>) => { event.cancelBubble = true; const target = event.target; const scaleX = finiteOr(target.scaleX(), 1); const scaleY = finiteOr(target.scaleY(), 1); target.scaleX(1); target.scaleY(1); const frame = { x: finiteOr(target.x(), nodeX), y: finiteOr(target.y(), nodeY), width: Math.max(4, finiteOr(target.width() * scaleX, nodeWidth)), height: Math.max(4, finiteOr(target.height() * scaleY, nodeHeight)) }; const snappedFrame = showGrid ? snapFrameToCanvasGrid(frame, gridBounds) : frame; const patch: Partial<CanvasNode> = { ...snappedFrame, rotation: finiteOr(target.rotation(), nodeRotation) }; if (node.type === "text") { const scalesBothAxes = Math.abs(scaleX - 1) > 0.01 && Math.abs(scaleY - 1) > 0.01; onChange(node.id, scalesBothAxes ? { ...patch, fontSize: Math.max(1, finiteOr(node.fontSize * scaleY, node.fontSize)), letterSpacing: node.letterSpacing * scaleX } as Partial<CanvasNode> : patch); } else onChange(node.id, patch); } };
  if (node.type === "text") return <Text {...common} text={node.text} wrap="word" fontSize={node.fontSize} fontStyle={node.fontStyle} fontVariant={`normal ${node.fontWeight}`} fontFamily={fontAsset?.fontFamily ?? (node.fontAssetId ? `editor-font-${node.fontAssetId}` : node.fontFamily ?? "Arial")} textDecoration={node.textDecoration} align={node.align} verticalAlign={node.verticalAlign} lineHeight={node.lineHeight} letterSpacing={node.letterSpacing} fill={node.fill} />;
  if (node.type === "image") return <LoadedImage {...common} url={imageAsset?.url} cornerRadius={node.cornerRadius} />;
  if (node.type === "shape") {
    if (node.shape === "ellipse") return <Ellipse {...common} radiusX={node.width / 2} radiusY={node.height / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
    if (node.shape === "line") return <Line {...common} points={[0, node.height / 2, node.width, node.height / 2]} stroke={node.stroke ?? node.fill ?? undefined} strokeWidth={Math.max(1, node.strokeWidth || 3)} />;
    if (node.shape === "arrow") return <Arrow {...common} points={[0, node.height / 2, node.width, node.height / 2]} stroke={node.stroke ?? node.fill ?? undefined} fill={node.fill ?? undefined} strokeWidth={Math.max(1, node.strokeWidth || 3)} pointerLength={12} pointerWidth={12} />;
    if (node.shape === "triangle") return <RegularPolygon {...common} sides={3} radius={Math.min(node.width, node.height) / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
    if (node.shape === "star") return <Star {...common} numPoints={5} innerRadius={Math.min(node.width, node.height) / 4} outerRadius={Math.min(node.width, node.height) / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
    return <RectangleVisual node={node} backgroundAsset={backgroundAsset} nodeProps={common} />;
  }
  return <LucideKonvaIcon iconKey={node.iconKey} color={node.fill} strokeWidth={node.strokeWidth} nodeProps={common} />;
});

function GridOverlay({ bounds, viewport, scale }: { bounds: CanvasDocumentV1["canvasBounds"]; viewport: Viewport; scale: number }) {
  const lines = visibleCanvasGridLines(bounds, viewport);
  const left = Math.max(bounds.x, viewport.x);
  const top = Math.max(bounds.y, viewport.y);
  const right = Math.min(bounds.x + bounds.width, viewport.x + viewport.width);
  const bottom = Math.min(bounds.y + bounds.height, viewport.y + viewport.height);
  return <Shape listening={false} perfectDrawEnabled={false} shadowForStrokeEnabled={false} stroke="#94a3b8" opacity={0.28} strokeWidth={1 / scale} sceneFunc={(context, shape) => {
    context.beginPath();
    lines.vertical.forEach((x) => { context.moveTo(x, top); context.lineTo(x, bottom); });
    lines.horizontal.forEach((y) => { context.moveTo(left, y); context.lineTo(right, y); });
    context.strokeShape(shape);
  }} />;
}

function LoadedImage(props: Record<string, unknown> & { url?: string; cornerRadius?: number }) {
  const image = useSharedImage(props.url);
  return <KonvaImage {...props} image={image} cornerRadius={props.cornerRadius} />;
}

function finiteOr(value: number, fallback: number): number { return Number.isFinite(value) ? value : fallback; }
function viewportIdentity(viewport: Viewport): string { return `${viewport.x}:${viewport.y}:${viewport.width}:${viewport.height}`; }
