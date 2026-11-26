"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import { getJoinedTableGroups, type FloorRotation } from "../contracts";
import type { FloorCanvasElement, FloorCanvasJoinedGroup, FloorCanvasProps, FloorCanvasTable } from "./FloorCanvas";
import { FloorSectorResizeHandles, type FloorSectorResizePreview } from "./FloorSectorResizeHandles";
import type { FloorSectorResizeGeometry } from "./floor-sector-resize";
import { FLOOR_GRID_SIZE, snapSpanCenterToGrid, snapToGrid } from "./floor-grid";

const canvasPaint = {
  default: { board: "#fffdf7", edge: "#6b7067", grid: "#e7e5dc", sector: "#f1f3eb", sectorSelected: "#e8efe6", sectorEdge: "#8d9a85", sectorSelectedEdge: "#3d5934", sectorInk: "#46543e", wall: "#777c72", bar: "#bca98b", fixtureInk: "#383d34", table: "#e8dfc9", tableSelected: "#d6e8d4", tableUnavailable: "#e8e8e2", tableEdge: "#aaa28d", tableSelectedEdge: "#255f46", tableInk: "#313a2f", joinEdge: "#756b4f" },
  operational: { board: "#fbfdfe", edge: "#65818e", grid: "#dbe5e9", sector: "#f0f5f7", sectorSelected: "#e6f2f6", sectorEdge: "#79929e", sectorSelectedEdge: "#0e7490", sectorInk: "#4b6470", wall: "#6a7c84", bar: "#adc0c8", fixtureInk: "#173642", table: "#f9fcfd", tableSelected: "#d8ecf2", tableUnavailable: "#e5ecef", tableEdge: "#6b8e9f", tableSelectedEdge: "#155e75", tableInk: "#173642", joinEdge: "#4b6470" },
};
type CanvasPaint = (typeof canvasPaint)[keyof typeof canvasPaint];
type Point = { x: number; y: number };
const elementKey = (kind: FloorCanvasElement["kind"], id: string) => `${kind}:${id}`;
const selectionModifier = (event?: MouseEvent | TouchEvent) => Boolean(event?.shiftKey || event?.ctrlKey || event?.metaKey);

export default function FloorCanvasStage({ room, tables, appearance = "default", joinedGroups = [], selectJoinedTables = false, selectedIds = [], selectedElements = [], selectedFixtureId, selectedLocationId, draggableIds, interactionMode = "select", onSelect, onSelectMany, onServiceTable, onSelectElements, onClearSelection, onContextMenuSelection, onContextMenuTable, onContextMenuGroup, onMove, onSelectFixture, onMoveFixture, onSelectLocation, onContextMenuLocation, onPlace, onMoveLocation, onResizeLocation, grid, fullScreen, editorMode, zoom, onZoomChange }: FloorCanvasProps & { zoom: number; onZoomChange: (zoom: number) => void }) {
  const paint = canvasPaint[appearance];
  const container = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const layer = useRef<Konva.Layer>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [stagePanning, setStagePanning] = useState(false);
  const [resizePreview, setResizePreview] = useState<FloorSectorResizePreview>(null);
  const [spatialDragPreview, setSpatialDragPreview] = useState<Map<string, Point> | null>(null);
  const [tableDragPreview, setTableDragPreview] = useState<Map<string, { x: number; y: number }> | null>(null);
  const [marquee, setMarquee] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);
  const selecting = interactionMode === "select";
  const panning = interactionMode === "pan";
  const service = interactionMode === "service";
  const placing = Boolean(onPlace);
  const [prevSelecting, setPrevSelecting] = useState(selecting);
  if (selecting !== prevSelecting) {
    setPrevSelecting(selecting);
    if (!selecting) {
      setMarquee(null);
      setSpatialDragPreview(null);
      setTableDragPreview(null);
    }
  }
  const [prevPanning, setPrevPanning] = useState(panning);
  if (panning !== prevPanning) {
    setPrevPanning(panning);
    if (!panning) setStagePanning(false);
  }
  const activeMarquee = selecting && !placing ? marquee : null;
  const baseCursor = panning ? (stagePanning ? "grabbing" : "grab") : placing || activeMarquee ? "crosshair" : "default";
  const selectionGesture = useRef<{ start: { x: number; y: number }; end: { x: number; y: number }; additive: boolean; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const pinch = useRef<{ distance: number; zoom: number; world: { x: number; y: number } } | null>(null);
  const multiTouch = useRef(false);
  const drag = useRef<{ origin: { x: number; y: number }; size: { width: number; height: number }; ids: string[]; starts: Map<string, { x: number; y: number }> } | null>(null);
  const spatialDrag = useRef<{ key: string; origin: Point; size: { width: number; height: number }; starts: Map<string, Point>; node: Konva.Node } | null>(null);
  const cancelResize = useRef<(() => void) | null>(null);
  const setCursor = useCallback((cursor: string) => { const element = stage.current?.container?.(); if (element) element.style.cursor = cursor; }, []);
  const cancelTableDrag = useCallback(() => {
    const session = drag.current;
    if (!session) return false;
    drag.current = null;
    for (const [id, position] of session.starts) {
      const node = stage.current?.findOne(`#floor-table-${id}`);
      node?.position(position); node?.stopDrag?.();
    }
    setTableDragPreview(null);
    return true;
  }, []);
  const cancelSpatialDrag = useCallback(() => {
    const session = spatialDrag.current;
    if (!session) return false;
    spatialDrag.current = null;
    session.node.position(session.origin);
    session.node.stopDrag();
    setSpatialDragPreview(null);
    return true;
  }, []);
  const canCancelResize = useCallback(() => Boolean(cancelResize.current), []);
  const applyElementCursor = useCallback((cursor: string | null) => {
    if (panning || placing || activeMarquee) return;
    setCursor(cursor ?? baseCursor);
  }, [panning, placing, activeMarquee, baseCursor, setCursor]);
  const editorCompact = editorMode && size.width < 768;
  const gutters = fullScreen ? {
    top: Math.min(128, size.height * 0.32),
    bottom: Math.min(editorCompact ? 152 : 96, size.height * 0.24),
    left: Math.min(72, size.width * 0.225),
    right: Math.min(24, size.width * 0.075),
  } : { top: 48, bottom: 48, left: 48, right: 48 };
  const usable = { width: Math.max(1, size.width - gutters.left - gutters.right), height: Math.max(1, size.height - gutters.top - gutters.bottom) };
  const viewCenter = { x: gutters.left + usable.width / 2, y: gutters.top + usable.height / 2 };
  const fit = Math.min(usable.width / room.width, usable.height / room.height);
  const scale = fit * zoom;
  const offset = { x: viewCenter.x - room.width * scale / 2 + pan.x, y: viewCenter.y - room.height * scale / 2 + pan.y };
  const selectedKeys = new Set(selectedElements.map(({ kind, id }) => elementKey(kind, id)));
  const selectedSector = selecting && onResizeLocation && !onPlace ? room.locations?.find((location) => location.id === selectedLocationId && [0, 90, 180, 270].includes(location.rotation)) : undefined;
  const liveSector = (location: NonNullable<FloorCanvasProps["room"]["locations"]>[number]) => {
    const resized = selectedSector?.id === location.id && resizePreview?.id === location.id ? { ...location, ...resizePreview.geometry } : location;
    return { ...resized, ...spatialDragPreview?.get(elementKey("sector", location.id)) };
  };
  const sectorDeltaById = new Map<string, Point>();
  if (spatialDragPreview) {
    for (const location of room.locations ?? []) {
      const preview = spatialDragPreview.get(elementKey("sector", location.id));
      if (preview) sectorDeltaById.set(location.id, { x: preview.x - location.x, y: preview.y - location.y });
    }
  }
  const includeInactive = Boolean(editorMode || grid);
  const liveTables = tables.filter((table) => table.active || includeInactive).map((table) => {
    const position = tableDragPreview?.get(table.id);
    if (position) return { ...table, ...position };
    const sectorDelta = table.locationId ? sectorDeltaById.get(table.locationId) : undefined;
    return sectorDelta ? { ...table, x: table.x + sectorDelta.x, y: table.y + sectorDelta.y } : table;
  });
  const liveJoinedGroups = joinedGroups.flatMap((group) => {
    const members = liveTables.filter((table) => group.tableIds.includes(table.id));
    return getJoinedTableGroups(members.map((table) => ({ ...table, tableId: table.id, rotation: table.rotation as FloorRotation }))).filter((component) => component.length > 1).map((component) => {
      const tableIds = component.map((table) => table.tableId);
      const complete = component.length === new Set(group.tableIds).size;
      return {
        group: { id: complete ? group.id : `${group.id}:${tableIds.map(encodeURIComponent).sort().join("+")}`, tableIds, label: complete ? group.label : component.map((table) => table.label).join(" + ") },
        tables: members.filter((table) => tableIds.includes(table.id)),
      };
    });
  });
  const joinedIdsByTable = new Map<string, string[]>();
  if (selectJoinedTables && onSelectMany) {
    for (const { group } of liveJoinedGroups) {
      for (const id of group.tableIds) joinedIdsByTable.set(id, group.tableIds);
    }
  }
  const selectTable = (id: string, additive: boolean) => {
    if (!selecting || multiTouch.current) return;
    const groupIds = joinedIdsByTable.get(id);
    if (groupIds) onSelectMany?.(groupIds, additive);
    else onSelect?.(id, additive);
  };
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize({ width: element.clientWidth || 800, height: element.clientHeight || 500 }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.key !== "Escape" || event.defaultPrevented || target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))) return;
      if (selectionGesture.current) { selectionGesture.current = null; setMarquee(null); suppressClick.current = true; }
      else if (cancelTableDrag() || cancelSpatialDrag()) return;
      else onClearSelection?.();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [cancelSpatialDrag, cancelTableDrag, onClearSelection]);
  useEffect(() => {
    setCursor(baseCursor);
  }, [baseCursor, setCursor]);
  useEffect(() => {
    if (selecting) return;
    if (canCancelResize()) cancelResize.current?.();
    if (drag.current) {
      for (const [id, position] of drag.current.starts) {
        const node = stage.current?.findOne(`#floor-table-${id}`);
        node?.position(position); node?.stopDrag?.();
      }
      drag.current = null;
    }
    if (spatialDrag.current) {
      spatialDrag.current.node.position(spatialDrag.current.origin);
      spatialDrag.current.node.stopDrag();
      spatialDrag.current = null;
    }
    selectionGesture.current = null;
  }, [selecting, canCancelResize]);
  useEffect(() => {
    if (!stagePanning) return;
    const stop = () => setStagePanning(false);
    window.addEventListener("mouseup", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("blur", stop);
    };
  }, [stagePanning]);

  const touchGeometry = (event: Konva.KonvaEventObject<TouchEvent>) => {
    const [a, b] = Array.from(event.evt.touches);
    const rect = container.current?.getBoundingClientRect();
    return a && b && rect ? { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), center: { x: (a.clientX + b.clientX) / 2 - rect.left, y: (a.clientY + b.clientY) / 2 - rect.top } } : null;
  };
  const zoomAt = (point: { x: number; y: number }, next: number, world = { x: (point.x - offset.x) / scale, y: (point.y - offset.y) / scale }) => {
    const value = Math.min(4, Math.max(1, next));
    const nextScale = fit * value;
    setPan(value === 1 ? { x: 0, y: 0 } : { x: point.x - world.x * nextScale - (viewCenter.x - room.width * nextScale / 2), y: point.y - world.y * nextScale - (viewCenter.y - room.height * nextScale / 2) });
    onZoomChange(value);
  };
  const snapCenter = (point: Point, dimensions: { width: number; height: number }): Point =>
    grid
      ? {
          x: snapSpanCenterToGrid(point.x, dimensions.width, FLOOR_GRID_SIZE, room.width),
          y: snapSpanCenterToGrid(point.y, dimensions.height, FLOOR_GRID_SIZE, room.height),
        }
      : point;
  const place = (locationId?: string) => {
    if (!selecting || !onPlace || multiTouch.current || suppressClick.current) return;
    // Invert the live layer transform, including any in-progress stage translation.
    const point = layer.current?.getRelativePointerPosition();
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)
      || point.x < 0 || point.y < 0 || point.x > room.width || point.y > room.height) return;
    const nextPoint = grid
      ? {
          x: Math.max(0, Math.min(room.width, snapToGrid(point.x, FLOOR_GRID_SIZE))),
          y: Math.max(0, Math.min(room.height, snapToGrid(point.y, FLOOR_GRID_SIZE))),
        }
      : { x: point.x, y: point.y };
    onPlace(nextPoint, locationId);
  };
  const startSelection = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!selecting || onPlace || !(onSelectMany || onSelectElements) || multiTouch.current || "button" in event.evt && event.evt.button !== 0) return false;
    const point = layer.current?.getRelativePointerPosition();
    if (!point) return false;
    selectionGesture.current = { start: point, end: point, additive: selectionModifier(event.evt), moved: false };
    suppressClick.current = false;
    return true;
  };
  const startSelectionOverElement = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (!onSelectElements || !selectionModifier(event.evt)) return;
    multiTouch.current = false;
    // Konva prepares its object drag on mouse down. Disarm it for this gesture.
    if (startSelection(event)) event.currentTarget?.stopDrag();
  };
  const moveSelection = () => {
    const session = selectionGesture.current;
    const point = layer.current?.getRelativePointerPosition();
    if (!session || !point || !selecting) return;
    session.end = point;
    session.moved ||= Math.hypot(point.x - session.start.x, point.y - session.start.y) * scale >= 4;
    if (session.moved) setMarquee({ start: session.start, end: point });
  };
  const finishSelection = () => {
    const session = selectionGesture.current;
    selectionGesture.current = null;
    setMarquee(null);
    if (!session?.moved || !selecting || onPlace || multiTouch.current) return;
    suppressClick.current = true;
    const bounds = { left: Math.min(session.start.x, session.end.x), right: Math.max(session.start.x, session.end.x), top: Math.min(session.start.y, session.end.y), bottom: Math.max(session.start.y, session.end.y) };
    const epsilon = 0.001;
    const intersects = (physical: typeof bounds) => physical.right >= bounds.left - epsilon && physical.left <= bounds.right + epsilon
      && physical.bottom >= bounds.top - epsilon && physical.top <= bounds.bottom + epsilon;
    if (onSelectMany) onSelectMany(liveTables.filter((table) => table.active && intersects(elementBounds(table))).map((table) => table.id), session.additive);
    if (onSelectElements) {
      const elements: FloorCanvasElement[] = [];
      for (const location of room.locations ?? []) {
        if (location.active && intersects(elementBounds(location))) elements.push({ kind: "sector", id: location.id });
      }
      for (const fixture of room.fixtures) if (intersects(elementBounds(fixture))) elements.push({ kind: "fixture", id: fixture.id });
      onSelectElements(elements, session.additive);
    }
  };
  const clickBackground = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const native = event.evt ?? {};
    if (!selecting || multiTouch.current || suppressClick.current || event.target !== stage.current || "button" in native && native.button !== 0) return;
    if (onPlace) place();
    else if (!("shiftKey" in native && (native.shiftKey || native.ctrlKey || native.metaKey))) onClearSelection?.();
  };
  const clearOnSector = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const native = event.evt ?? {};
    if (!onPlace && !onSelectLocation && !("shiftKey" in native && (native.shiftKey || native.ctrlKey || native.metaKey))) onClearSelection?.();
  };
  const selectElement = (kind: FloorCanvasElement["kind"], id: string, additive = false) => {
    const callback = kind === "sector" ? onSelectLocation : onSelectFixture;
    if (additive) callback?.(id, true);
    else callback?.(id);
  };
  const startSpatialDrag = (kind: FloorCanvasElement["kind"], item: Point & { id: string; width: number; height: number; rotation: number }, node: Konva.Node) => {
    if (!selecting || !(kind === "sector" ? onMoveLocation : onMoveFixture)) return;
    cancelResize.current?.();
    const key = elementKey(kind, item.id);
    const origin = { x: item.x, y: item.y };
    const bounds = elementBounds(item);
    const elementSize = { width: bounds.right - bounds.left, height: bounds.bottom - bounds.top };
    const starts = new Map<string, Point>([[key, origin]]);
    if (selectedKeys.has(key)) {
      for (const location of room.locations ?? []) if (selectedKeys.has(elementKey("sector", location.id))) starts.set(elementKey("sector", location.id), { x: location.x, y: location.y });
      for (const fixture of room.fixtures) if (selectedKeys.has(elementKey("fixture", fixture.id))) starts.set(elementKey("fixture", fixture.id), { x: fixture.x, y: fixture.y });
    } else if (kind === "sector" || onSelectElements) selectElement(kind, item.id);
    spatialDrag.current = { key, origin, size: elementSize, starts, node };
    setSpatialDragPreview(starts);
  };
  const moveSpatialDrag = (node: Konva.Node) => {
    const session = spatialDrag.current;
    if (!selecting || session?.node !== node) return;
    const point = snapCenter({ x: node.x(), y: node.y() }, session.size);
    if (grid) node.position?.(point);
    const dx = point.x - session.origin.x;
    const dy = point.y - session.origin.y;
    setSpatialDragPreview(new Map(Array.from(session.starts, ([key, start]) => [key, { x: start.x + dx, y: start.y + dy }])));
  };
  const finishSpatialDrag = (kind: FloorCanvasElement["kind"], id: string, node: Konva.Node) => {
    const session = spatialDrag.current;
    if (!session || session.key !== elementKey(kind, id)) return;
    const point = snapCenter({ x: node.x(), y: node.y() }, session.size);
    spatialDrag.current = null;
    setSpatialDragPreview(null);
    if (!selecting) return;
    const callback = kind === "sector" ? onMoveLocation : onMoveFixture;
    callback?.(id, point);
  };
  return <div ref={container} className="h-full w-full touch-none">
    <Stage ref={stage} width={size.width} height={size.height} draggable={panning} style={{ cursor: baseCursor }}
      onDragStart={(event) => {
        if (event.target === stage.current && panning) {
          setStagePanning(true);
          setCursor("grabbing");
        }
      }}
      onDragEnd={(event) => {
        if (event.target !== stage.current) return;
        setStagePanning(false);
        setCursor(panning ? "grab" : baseCursor);
        // Capture the movement before resetting the node; React may apply the updater later.
        const delta = { x: event.target.x(), y: event.target.y() };
        setPan((value) => ({ x: value.x + delta.x, y: value.y + delta.y }));
        event.target.position({ x: 0, y: 0 });
      }}
      onMouseDown={(event) => {
        multiTouch.current = false;
        suppressClick.current = false;
        if (panning && (!("button" in event.evt) || event.evt.button === 0)) {
          setStagePanning(true);
          setCursor("grabbing");
        }
        if (event.target === stage.current) startSelection(event);
      }}
      onMouseMove={moveSelection}
      onMouseUp={() => {
        if (stagePanning) {
          setStagePanning(false);
          setCursor(panning ? "grab" : baseCursor);
        }
        finishSelection();
      }}
      onMouseLeave={() => {
        selectionGesture.current = null;
        setMarquee(null);
        if (stagePanning) setStagePanning(false);
        if (!drag.current && !spatialDrag.current) setCursor(panning ? "grab" : baseCursor);
      }}
      onClick={clickBackground}
      onTap={clickBackground}
      onContextMenu={onContextMenuSelection ? (event) => { event.evt.preventDefault(); onContextMenuSelection({ x: event.evt.clientX, y: event.evt.clientY }); } : undefined}
      onWheel={(event) => { event.evt.preventDefault(); zoomAt(stage.current?.getPointerPosition() ?? viewCenter, zoom * (event.evt.deltaY > 0 ? 0.9 : 1.1)); }}
      onTouchStart={(event) => { multiTouch.current = event.evt.touches.length > 1; suppressClick.current = false; if (multiTouch.current) { cancelResize.current?.(); cancelTableDrag(); cancelSpatialDrag(); selectionGesture.current = null; setMarquee(null); } else if (event.target === stage.current) startSelection(event); const touch = touchGeometry(event); if (touch && touch.distance > 0) { event.evt.preventDefault(); stage.current?.stopDrag(); pinch.current = { distance: touch.distance, zoom, world: { x: (touch.center.x - offset.x) / scale, y: (touch.center.y - offset.y) / scale } }; } }}
      onTouchMove={(event) => { const touch = touchGeometry(event); if (touch && pinch.current) { event.evt.preventDefault(); zoomAt(touch.center, pinch.current.zoom * touch.distance / pinch.current.distance, pinch.current.world); } else moveSelection(); }}
      onTouchEnd={() => { pinch.current = null; finishSelection(); }} onTouchCancel={() => { pinch.current = null; cancelSpatialDrag(); selectionGesture.current = null; setMarquee(null); }}>
      <Layer ref={layer} x={offset.x} y={offset.y} scaleX={scale} scaleY={scale}>
        <Rect x={0} y={0} width={room.width} height={room.height} fill={paint.board} stroke={paint.edge} strokeWidth={5} cornerRadius={3} listening={false} />
        {grid && Array.from({ length: Math.floor(room.width / FLOOR_GRID_SIZE) }, (_, index) => <Line key={`x-${index}`} points={[(index + 1) * FLOOR_GRID_SIZE, 0, (index + 1) * FLOOR_GRID_SIZE, room.height]} stroke={paint.grid} strokeWidth={0.7} listening={false} />)}
        {grid && Array.from({ length: Math.floor(room.height / FLOOR_GRID_SIZE) }, (_, index) => <Line key={`y-${index}`} points={[0, (index + 1) * FLOOR_GRID_SIZE, room.width, (index + 1) * FLOOR_GRID_SIZE]} stroke={paint.grid} strokeWidth={0.7} listening={false} />)}
        {(room.locations ?? []).filter((location) => location.active || includeInactive).map((source) => {
          const location = liveSector(source);
          const selected = selectedLocationId === location.id || selectedKeys.has(elementKey("sector", location.id));
          const draggableSector = selecting && !placing && Boolean(onMoveLocation) && resizePreview?.id !== location.id;
          const sectorCursor = draggableSector ? "move" : selecting && !placing && (onSelectLocation || onSelectElements) ? "pointer" : null;
          return <Group key={location.id} x={location.x} y={location.y} rotation={location.rotation} draggable={draggableSector} opacity={location.active ? 1 : 0.4}
            onMouseEnter={() => { if (!drag.current && !spatialDrag.current && resizePreview?.id !== location.id) applyElementCursor(sectorCursor); }}
            onMouseMove={() => { if (!drag.current && !spatialDrag.current && resizePreview?.id !== location.id) applyElementCursor(sectorCursor); }}
            onMouseLeave={() => { if (!drag.current && !spatialDrag.current && resizePreview?.id !== location.id) applyElementCursor(null); }}
            onMouseDown={(event) => { if (!onMoveLocation) startSelection(event); else startSelectionOverElement(event); }} onTouchStart={(event) => { if (!onMoveLocation && event.evt.touches.length === 1) startSelection(event); }}
            onClick={(event) => { if (!selecting) return; event.cancelBubble = true; if (suppressClick.current || event.evt?.button === 2) return; if (onPlace && location.active) place(location.id); else if (onSelectLocation) selectElement("sector", location.id, Boolean(onSelectElements) && selectionModifier(event.evt)); else clearOnSector(event); }}
            onTap={(event) => { if (!selecting) return; event.cancelBubble = true; if (suppressClick.current) return; if (onPlace && location.active) place(location.id); else if (onSelectLocation) selectElement("sector", location.id); else clearOnSector(event); }}
            onContextMenu={onContextMenuLocation ? (event) => { event.evt.preventDefault(); event.cancelBubble = true; onContextMenuLocation(location.id, { x: event.evt.clientX, y: event.evt.clientY }); } : undefined}
            onDragStart={(event) => { event.cancelBubble = true; applyElementCursor("move"); startSpatialDrag("sector", source, event.target); }}
            onDragMove={(event) => { event.cancelBubble = true; moveSpatialDrag(event.target); }}
            onDragEnd={(event) => { event.cancelBubble = true; applyElementCursor(sectorCursor); finishSpatialDrag("sector", location.id, event.target); }}>
            <Rect
              x={-location.width / 2}
              y={-location.height / 2}
              width={location.width}
              height={location.height}
              fill={location.quotaStatus === "exceeded" ? "#fef08a" : location.quotaStatus === "warning" ? "#fef9c3" : selected ? paint.sectorSelected : paint.sector}
              opacity={appearance === "operational" ? 0.85 : 0.65}
              stroke={location.quotaStatus === "exceeded" ? "#b45309" : location.quotaStatus === "warning" ? "#d97706" : selected ? paint.sectorSelectedEdge : paint.sectorEdge}
              strokeWidth={location.quotaStatus === "exceeded" ? 2.5 : location.quotaStatus === "warning" ? 2 : selected ? 3 : 1.5}
              dash={[10, 7]}
              cornerRadius={5}
            />
            <Text
              x={-location.width / 2 + 10}
              y={-location.height / 2 + 10}
              width={Math.max(1, location.width - 20)}
              height={Math.max(1, location.height - 20)}
              wrap="none"
              ellipsis
              text={location.quotaLabel ? `${location.name} · ${location.quotaLabel}` : location.name}
              fontSize={14}
              fill={location.quotaStatus === "exceeded" ? "#78350f" : location.quotaStatus === "warning" ? "#92400e" : paint.sectorInk}
              fontStyle="bold"
              listening={false}
            />
          </Group>;
        })}
        {room.fixtures.map((fixture) => {
          const key = elementKey("fixture", fixture.id);
          const selected = selectedFixtureId === fixture.id || selectedKeys.has(key);
          const position = spatialDragPreview?.get(key) ?? fixture;
          const draggableFixture = selecting && !placing && Boolean(onMoveFixture);
          const fixtureCursor = draggableFixture ? "move" : selecting && !placing && (onSelectFixture || onSelectElements) ? "pointer" : null;
          return <Group key={fixture.id} x={position.x} y={position.y} rotation={fixture.rotation} draggable={draggableFixture} onMouseDown={startSelectionOverElement}
            onMouseEnter={(event) => { event.cancelBubble = true; if (!drag.current && !spatialDrag.current) applyElementCursor(fixtureCursor); }}
            onMouseMove={(event) => { event.cancelBubble = true; if (!drag.current && !spatialDrag.current) applyElementCursor(fixtureCursor); }}
            onMouseLeave={(event) => { event.cancelBubble = true; if (!drag.current && !spatialDrag.current) applyElementCursor(null); }}
            onClick={(event) => { if (!selecting) return; event.cancelBubble = true; if (suppressClick.current || event.evt?.button === 2) return; if (onPlace) place(); else selectElement("fixture", fixture.id, Boolean(onSelectElements) && selectionModifier(event.evt)); }}
            onTap={(event) => { if (!selecting) return; event.cancelBubble = true; if (suppressClick.current) return; if (onPlace) place(); else selectElement("fixture", fixture.id); }}
            onDragStart={(event) => { event.cancelBubble = true; applyElementCursor("move"); startSpatialDrag("fixture", fixture, event.target); }}
            onDragMove={(event) => { event.cancelBubble = true; moveSpatialDrag(event.target); }}
            onDragEnd={(event) => { event.cancelBubble = true; applyElementCursor(fixtureCursor); finishSpatialDrag("fixture", fixture.id, event.target); }}>
            {fixture.type !== "LABEL" && <Rect x={-fixture.width / 2} y={-fixture.height / 2} width={fixture.width} height={fixture.height} fill={fixture.type === "WALL" ? paint.wall : paint.bar} stroke={selected ? paint.tableSelectedEdge : undefined} strokeWidth={3} cornerRadius={fixture.type === "BAR" ? 5 : 0} />}
            {fixture.type === "LABEL" && selected && <Rect id={`floor-label-selection-${fixture.id}`} x={-fixture.width / 2} y={-fixture.height / 2} width={fixture.width} height={fixture.height} stroke={paint.tableSelectedEdge} strokeWidth={2 / scale} cornerRadius={3} listening={false} />}
            {fixture.label && <Text text={fixture.label} x={-fixture.width / 2} y={-8} width={fixture.width} align="center" fontSize={fixture.type === "LABEL" ? 18 : 13} fill={fixture.type === "WALL" ? "#ffffff" : paint.fixtureInk} fontStyle="bold" />}
          </Group>;
        })}
        {liveJoinedGroups.map(({ group, tables }) => {
          const occupiedTable = service && tables.find((table) => table.state === "reserved");
          const selectGroup = occupiedTable && onServiceTable ? () => onServiceTable(occupiedTable.id) : selecting && !placing && onSelectMany ? (additive: boolean) => onSelectMany(group.tableIds, additive) : undefined;
          return <JoinedTables key={group.id} group={group} tables={tables} selectedIds={selectedIds} paint={paint} onSelect={selectGroup} onContextMenu={!service && onContextMenuGroup ? (point) => onContextMenuGroup(group.tableIds, point) : undefined} onCursor={selectGroup ? (cursor) => applyElementCursor(cursor) : undefined} />;
        })}
        {liveTables.map((table) => {
          const draggableTable = selecting && !placing && Boolean(onMove) && (!draggableIds || draggableIds.includes(table.id));
          const tableClickable = service ? table.active && Boolean(onServiceTable) : selecting && !placing && Boolean(onSelect || onSelectMany);
          const tableCursor = draggableTable && table.active ? "move" : tableClickable ? "pointer" : null;
          return <Table key={table.id} table={table} paint={paint} selected={selectedIds.includes(table.id)} selecting={selecting} draggable={draggableTable}
            hoverCursor={tableCursor}
            onCursor={(cursor) => { if (!drag.current && !spatialDrag.current) applyElementCursor(cursor); }}
            onSelect={(additive) => selectTable(table.id, additive)}
            onSelectIndividual={joinedIdsByTable.has(table.id) ? () => { if (!multiTouch.current) onSelect?.(table.id, false); } : undefined}
            onOpenService={service && table.active && onServiceTable ? () => { if (!multiTouch.current) onServiceTable(table.id); } : undefined}
            onContextMenu={!service && onContextMenuTable ? (point) => onContextMenuTable(table.id, point) : undefined}
            onDragStart={(node) => {
              if (!selecting) return;
              const alreadySelected = selectedIds.includes(table.id);
              const targets = alreadySelected ? selectedIds : joinedIdsByTable.get(table.id) ?? [table.id];
              const ids = targets.filter((id) => liveTables.some((item) => item.id === id && item.active) && (!draggableIds || draggableIds.includes(id)));
              if (!alreadySelected) selectTable(table.id, false);
              const bounds = elementBounds(table);
              drag.current = { origin: { x: node.x(), y: node.y() }, size: { width: bounds.right - bounds.left, height: bounds.bottom - bounds.top }, ids, starts: new Map(tables.filter((item) => ids.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }])) };
              setTableDragPreview(new Map(drag.current.starts));
              applyElementCursor("move");
            }}
            onDragMove={(node) => {
              const session = drag.current;
              if (!session) return;
              const target = snapCenter({ x: node.x(), y: node.y() }, session.size);
              if (grid) node.position?.(target);
              const delta = { x: target.x - session.origin.x, y: target.y - session.origin.y };
              setTableDragPreview(new Map(Array.from(session.starts, ([id, start]) => [id, { x: start.x + delta.x, y: start.y + delta.y }])));
              for (const id of session.ids) {
                if (id === table.id) continue;
                const start = session.starts.get(id);
                if (start) stage.current?.findOne(`#floor-table-${id}`)?.position({ x: start.x + delta.x, y: start.y + delta.y });
              }
            }}
            onDragEnd={(node) => {
              const session = drag.current;
              if (session && selecting) {
                const target = snapCenter({ x: node.x(), y: node.y() }, session.size);
                onMove?.(session.ids, { x: target.x - session.origin.x, y: target.y - session.origin.y });
              }
              drag.current = null;
              setTableDragPreview(null);
              applyElementCursor(tableCursor);
            }} />;
        })}
        {selectedSector && onResizeLocation && <FloorSectorResizeHandles key={selectedSector.id} location={selectedSector as FloorSectorResizeGeometry & { id: string }} geometry={liveSector(selectedSector) as FloorSectorResizeGeometry} room={room} scale={scale} gridSize={grid ? FLOOR_GRID_SIZE : undefined} getPointer={() => layer.current?.getRelativePointerPosition() ?? null} onPreview={setResizePreview} onCommit={(id, { x, y, width, height }) => onResizeLocation(id, { x, y, width, height })} onCursor={setCursor} defaultCursor={baseCursor} cancelRef={cancelResize} onContextMenu={onContextMenuLocation ? (point) => onContextMenuLocation(selectedSector.id, point) : undefined} />}
        {activeMarquee && <Rect id="floor-selection-marquee" x={Math.min(activeMarquee.start.x, activeMarquee.end.x)} y={Math.min(activeMarquee.start.y, activeMarquee.end.y)} width={Math.abs(activeMarquee.end.x - activeMarquee.start.x)} height={Math.abs(activeMarquee.end.y - activeMarquee.start.y)} fill={paint.tableSelected} opacity={0.65} stroke={paint.tableSelectedEdge} strokeWidth={1.5 / scale} listening={false} />}
      </Layer>
    </Stage>
  </div>;
}

function elementBounds(element: Pick<FloorCanvasTable, "x" | "y" | "width" | "height" | "rotation"> & { shape?: FloorCanvasTable["shape"] }) {
  const radians = element.rotation * Math.PI / 180;
  const width = element.shape === "CIRCLE" ? element.width : Math.abs(Math.cos(radians)) * element.width + Math.abs(Math.sin(radians)) * element.height;
  const height = element.shape === "CIRCLE" ? element.width : Math.abs(Math.sin(radians)) * element.width + Math.abs(Math.cos(radians)) * element.height;
  return { left: element.x - width / 2, right: element.x + width / 2, top: element.y - height / 2, bottom: element.y + height / 2 };
}

function JoinedTables({ group, tables, selectedIds, paint, onSelect, onContextMenu, onCursor }: { group: FloorCanvasJoinedGroup; tables: FloorCanvasTable[]; selectedIds: string[]; paint: CanvasPaint; onSelect?: (additive: boolean) => void; onContextMenu?: (point: { x: number; y: number }) => void; onCursor?: (cursor: string | null) => void }) {
  if (tables.length < 2) return null;
  const bounds = tables.map(elementBounds);
  const left = Math.min(...bounds.map((bound) => bound.left)) - 6;
  const top = Math.min(...bounds.map((bound) => bound.top)) - 6;
  const width = Math.max(...bounds.map((bound) => bound.right)) + 6 - left;
  const height = Math.max(...bounds.map((bound) => bound.bottom)) + 6 - top;
  const selected = tables.every((table) => selectedIds.includes(table.id) || table.state === "selected");
  const reserved = tables.some((table) => table.state === "reserved");
  const ready = tables.some((table) => table.state !== "unavailable" && table.active && Boolean(table.readyQuantity && table.readyQuantity > 0));
  const stroke = selected ? paint.tableSelectedEdge : ready ? "#16a34a" : reserved ? "#95664c" : paint.joinEdge;
  const labelWidth = Math.max(width, 160);
  const labelX = (width - labelWidth) / 2;
  const listening = Boolean(onSelect || onContextMenu);
  return <Group id={`floor-joined-group-${group.id}`} x={left} y={top} listening={listening}
    onMouseEnter={onCursor ? (event) => { event.cancelBubble = true; onCursor("pointer"); } : undefined}
    onMouseMove={onCursor ? (event) => { event.cancelBubble = true; onCursor("pointer"); } : undefined}
    onMouseLeave={onCursor ? (event) => { event.cancelBubble = true; onCursor(null); } : undefined}
    onClick={onSelect ? (event) => { if (event.evt.button !== 0) return; event.cancelBubble = true; onSelect(event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey); } : undefined} onTap={onSelect ? (event) => { event.cancelBubble = true; onSelect(false); } : undefined} onContextMenu={onContextMenu ? (event) => { event.evt.preventDefault(); event.cancelBubble = true; onContextMenu({ x: event.evt.clientX, y: event.evt.clientY }); } : undefined}>
    <Rect id={`floor-joined-outline-${group.id}`} width={width} height={height} stroke={stroke} strokeWidth={1.5} dash={[6, 4]} cornerRadius={9} hitStrokeWidth={16} listening={listening} />
    <Rect x={labelX} y={-25} width={labelWidth} height={21} fill={paint.board} cornerRadius={4} listening={listening} />
    <Text id={`floor-joined-label-${group.id}`} text={`Unidas · ${group.label}`} x={labelX + 5} y={-21} width={labelWidth - 10} height={16} wrap="none" ellipsis align="center" fontSize={12} fontStyle="bold" fill={stroke} listening={listening} />
  </Group>;
}

function Table({ table, selected, selecting, draggable, hoverCursor, onCursor, paint, onSelect, onSelectIndividual, onOpenService, onContextMenu, onDragStart, onDragMove, onDragEnd }: { table: FloorCanvasTable; selected: boolean; selecting: boolean; draggable: boolean; hoverCursor: string | null; onCursor: (cursor: string | null) => void; paint: CanvasPaint; onSelect: (additive: boolean) => void; onSelectIndividual?: () => void; onOpenService?: () => void; onContextMenu?: (point: { x: number; y: number }) => void; onDragStart: (node: Konva.Node) => void; onDragMove: (node: Konva.Node) => void; onDragEnd: (node: Konva.Node) => void }) {
  const gesture = useRef({ dragged: false, selectedOnPress: false });
  const occupied = table.state === "occupied";
  const reserved = table.state === "reserved";
  const unavailable = table.state === "unavailable" || !table.active;
  const ready = !unavailable && Boolean(table.readyQuantity && table.readyQuantity > 0);
  const fill = selected ? paint.tableSelected : ready ? "#bbf7d0" : occupied ? "#dbeff5" : reserved ? "#f0d6c4" : unavailable ? paint.tableUnavailable : paint.table;
  const stroke = selected ? paint.tableSelectedEdge : ready ? "#16a34a" : occupied ? "#0e7490" : reserved ? "#95664c" : paint.tableEdge;
  const ink = ready ? "#14532d" : paint.tableInk;
  const subLabel = table.subtitle ?? (table.partySize ? `${table.partySize}p` : `${table.capacity}p`);
  const bounds = elementBounds(table);
  const halfWidth = (bounds.right - bounds.left) / 2;
  const halfHeight = (bounds.bottom - bounds.top) / 2;
  const readyBadgePosition =
    table.shape === "CIRCLE"
      ? { x: Math.round((table.width / 2) * Math.SQRT1_2), y: -Math.round((table.width / 2) * Math.SQRT1_2) }
      : { x: halfWidth, y: -halfHeight };
  return <Group id={`floor-table-${table.id}`} x={table.x} y={table.y} rotation={table.rotation} opacity={unavailable ? 0.55 : 1} draggable={draggable && table.active}
    onMouseEnter={(event) => { event.cancelBubble = true; onCursor(hoverCursor); }}
    onMouseMove={(event) => { event.cancelBubble = true; onCursor(hoverCursor); }}
    onMouseLeave={(event) => { event.cancelBubble = true; onCursor(null); }}
    onMouseDown={(event) => { if (!selecting) return; event.cancelBubble = true; if (event.evt.button !== 0) return; const additive = event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey; gesture.current = { dragged: false, selectedOnPress: additive || !selected }; if (gesture.current.selectedOnPress) onSelect(additive); }}
    onTouchStart={() => { gesture.current = { dragged: false, selectedOnPress: false }; }}
    onClick={(event) => {
      if (onOpenService && event.evt.button === 0) { event.cancelBubble = true; onOpenService(); return; }
      if (!selecting) return;
      event.cancelBubble = true;
      if (event.evt.button === 0 && !gesture.current.dragged && !gesture.current.selectedOnPress) onSelect(false);
    }} onTap={(event) => {
      if (onOpenService) { event.cancelBubble = true; onOpenService(); return; }
      if (!selecting) return;
      event.cancelBubble = true;
      if (!gesture.current.dragged) onSelect(false);
    }}
    onDblClick={selecting && onSelectIndividual ? (event) => { if (event.evt.button !== 0 || gesture.current.dragged) return; event.cancelBubble = true; onSelectIndividual(); } : undefined}
    onDblTap={selecting && onSelectIndividual ? (event) => { if (gesture.current.dragged) return; event.cancelBubble = true; onSelectIndividual(); } : undefined}
    onContextMenu={onContextMenu ? (event) => { event.evt.preventDefault(); event.cancelBubble = true; onContextMenu({ x: event.evt.clientX, y: event.evt.clientY }); } : undefined}
    onDragStart={(event) => { if (!selecting) return; event.cancelBubble = true; gesture.current.dragged = true; onDragStart(event.target); }} onDragMove={(event) => { if (!selecting) return; event.cancelBubble = true; onDragMove(event.target); }} onDragEnd={(event) => { event.cancelBubble = true; onDragEnd(event.target); }}>
    {table.shape === "CIRCLE" ? <Circle id={`floor-table-shape-${table.id}`} radius={table.width / 2} fill={fill} stroke={stroke} strokeWidth={selected ? 3 : ready ? 2 : 1.5} /> : <Rect id={`floor-table-shape-${table.id}`} x={-table.width / 2} y={-table.height / 2} width={table.width} height={table.height} cornerRadius={6} fill={fill} stroke={stroke} strokeWidth={selected ? 3 : ready ? 2 : 1.5} />}
    <Group rotation={-table.rotation} listening={false}>
      <Text x={-60} y={-12} width={120} align="center" text={table.label} fontSize={15} fontStyle="bold" fill={ink} />
      <Text x={-60} y={5} width={120} align="center" text={subLabel} fontSize={10} fill={ink} opacity={0.85} />
      {ready && (
        <Group id={`floor-table-ready-badge-${table.id}`} x={readyBadgePosition.x} y={readyBadgePosition.y}>
          <Circle radius={10} fill="#15803d" stroke="#ffffff" strokeWidth={1.5} />
          <Text x={-10} y={-5} width={20} align="center" text={String(table.readyQuantity)} fontSize={10} fontStyle="bold" fill="#ffffff" />
        </Group>
      )}
      {table.hasPartialPayments && (
        <Group x={-18} y={-18}>
          <Circle radius={6} fill="#d97706" stroke="#ffffff" strokeWidth={1.5} />
        </Group>
      )}
    </Group>
  </Group>;
}
