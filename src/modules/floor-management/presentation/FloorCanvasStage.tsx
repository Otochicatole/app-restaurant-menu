"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import type Konva from "konva";
import { getJoinedTableGroups, type FloorRotation } from "../contracts";
import type { FloorCanvasJoinedGroup, FloorCanvasProps, FloorCanvasTable } from "./FloorCanvas";
import { FloorSectorResizeHandles, type FloorSectorResizePreview } from "./FloorSectorResizeHandles";
import type { FloorSectorResizeGeometry } from "./floor-sector-resize";

const canvasPaint = {
  default: { board: "#fffdf7", edge: "#6b7067", grid: "#e7e5dc", sector: "#f1f3eb", sectorSelected: "#e8efe6", sectorEdge: "#8d9a85", sectorSelectedEdge: "#3d5934", sectorInk: "#46543e", wall: "#777c72", bar: "#bca98b", fixtureInk: "#383d34", table: "#e8dfc9", tableSelected: "#d6e8d4", tableUnavailable: "#e8e8e2", tableEdge: "#aaa28d", tableSelectedEdge: "#255f46", tableInk: "#313a2f", joinEdge: "#756b4f" },
  operational: { board: "#fbfdfe", edge: "#65818e", grid: "#dbe5e9", sector: "#f0f5f7", sectorSelected: "#e6f2f6", sectorEdge: "#79929e", sectorSelectedEdge: "#0e7490", sectorInk: "#4b6470", wall: "#6a7c84", bar: "#adc0c8", fixtureInk: "#173642", table: "#f9fcfd", tableSelected: "#d8ecf2", tableUnavailable: "#e5ecef", tableEdge: "#6b8e9f", tableSelectedEdge: "#155e75", tableInk: "#173642", joinEdge: "#4b6470" },
};
type CanvasPaint = (typeof canvasPaint)[keyof typeof canvasPaint];

export default function FloorCanvasStage({ room, tables, appearance = "default", joinedGroups = [], selectedIds = [], selectedFixtureId, selectedLocationId, draggableIds, onSelect, onContextMenuTable, onContextMenuGroup, onMove, onSelectFixture, onMoveFixture, onSelectLocation, onContextMenuLocation, onPlace, onMoveLocation, onResizeLocation, grid, fullScreen, editorMode, zoom, onZoomChange }: FloorCanvasProps & { zoom: number; onZoomChange: (zoom: number) => void }) {
  const paint = canvasPaint[appearance];
  const container = useRef<HTMLDivElement>(null);
  const stage = useRef<Konva.Stage>(null);
  const layer = useRef<Konva.Layer>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [resizePreview, setResizePreview] = useState<FloorSectorResizePreview>(null);
  const [sectorDragPreview, setSectorDragPreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const [tableDragPreview, setTableDragPreview] = useState<Map<string, { x: number; y: number }> | null>(null);
  const pinch = useRef<{ distance: number; zoom: number; world: { x: number; y: number } } | null>(null);
  const multiTouch = useRef(false);
  const drag = useRef<{ origin: { x: number; y: number }; ids: string[]; starts: Map<string, { x: number; y: number }> } | null>(null);
  const cancelResize = useRef<(() => void) | null>(null);
  const setCursor = useCallback((cursor: string) => { const element = stage.current?.container?.(); if (element) element.style.cursor = cursor; }, []);
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
  const offset = { x: viewCenter.x - room.width * scale / 2 + (zoom === 1 ? 0 : pan.x), y: viewCenter.y - room.height * scale / 2 + (zoom === 1 ? 0 : pan.y) };
  const selectedSector = onResizeLocation && !onPlace ? room.locations?.find((location) => location.id === selectedLocationId && [0, 90, 180, 270].includes(location.rotation)) : undefined;
  const liveSector = (location: NonNullable<FloorCanvasProps["room"]["locations"]>[number]) => {
    const resized = selectedSector?.id === location.id && resizePreview?.id === location.id ? { ...location, ...resizePreview.geometry } : location;
    return sectorDragPreview?.id === location.id ? { ...resized, x: sectorDragPreview.x, y: sectorDragPreview.y } : resized;
  };
  const liveTables = tables.filter((table) => table.active || grid).map((table) => {
    const position = tableDragPreview?.get(table.id);
    return position ? { ...table, ...position } : table;
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
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize({ width: element.clientWidth || 800, height: element.clientHeight || 500 }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
  const place = (locationId?: string) => {
    if (!onPlace || multiTouch.current) return;
    // Invert the live layer transform, including any in-progress stage translation.
    const point = layer.current?.getRelativePointerPosition();
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)
      || point.x < 0 || point.y < 0 || point.x > room.width || point.y > room.height) return;
    onPlace({ x: point.x, y: point.y }, locationId);
  };
  return <div ref={container} className="h-full w-full touch-none">
    <Stage ref={stage} width={size.width} height={size.height} draggable={zoom > 1} style={{ cursor: onPlace ? "crosshair" : zoom > 1 ? "grab" : "default" }} onDragEnd={(event) => {
      if (event.target !== stage.current) return;
      // Capture the movement before resetting the node; React may apply the updater later.
      const delta = { x: event.target.x(), y: event.target.y() };
      setPan((value) => ({ x: value.x + delta.x, y: value.y + delta.y }));
      event.target.position({ x: 0, y: 0 });
    }}
      onMouseDown={() => { multiTouch.current = false; }}
      onClick={(event) => { if (event.target === stage.current) place(); }}
      onTap={(event) => { if (event.target === stage.current) place(); }}
      onWheel={(event) => { event.evt.preventDefault(); zoomAt(stage.current?.getPointerPosition() ?? viewCenter, zoom * (event.evt.deltaY > 0 ? 0.9 : 1.1)); }}
      onTouchStart={(event) => { multiTouch.current = event.evt.touches.length > 1; if (multiTouch.current) cancelResize.current?.(); const touch = touchGeometry(event); if (touch && touch.distance > 0) { event.evt.preventDefault(); stage.current?.stopDrag(); pinch.current = { distance: touch.distance, zoom, world: { x: (touch.center.x - offset.x) / scale, y: (touch.center.y - offset.y) / scale } }; } }}
      onTouchMove={(event) => { const touch = touchGeometry(event); if (touch && pinch.current) { event.evt.preventDefault(); zoomAt(touch.center, pinch.current.zoom * touch.distance / pinch.current.distance, pinch.current.world); } }}
      onTouchEnd={() => { pinch.current = null; }} onTouchCancel={() => { pinch.current = null; }}>
      <Layer ref={layer} x={offset.x} y={offset.y} scaleX={scale} scaleY={scale}>
        <Rect x={0} y={0} width={room.width} height={room.height} fill={paint.board} stroke={paint.edge} strokeWidth={5} cornerRadius={3} listening={false} />
        {grid && Array.from({ length: Math.floor(room.width / 40) }, (_, index) => <Line key={`x-${index}`} points={[(index + 1) * 40, 0, (index + 1) * 40, room.height]} stroke={paint.grid} strokeWidth={0.7} listening={false} />)}
        {grid && Array.from({ length: Math.floor(room.height / 40) }, (_, index) => <Line key={`y-${index}`} points={[0, (index + 1) * 40, room.width, (index + 1) * 40]} stroke={paint.grid} strokeWidth={0.7} listening={false} />)}
        {(room.locations ?? []).filter((location) => location.active || grid).map((source) => { const location = liveSector(source); return <Group key={location.id} x={location.x} y={location.y} rotation={location.rotation} draggable={Boolean(onMoveLocation) && resizePreview?.id !== location.id} opacity={location.active ? 1 : 0.4}
          onClick={(event) => { event.cancelBubble = true; if (onContextMenuLocation && event.evt?.button === 2) return; if (onPlace && location.active) place(location.id); else onSelectLocation?.(location.id); }} onTap={(event) => { event.cancelBubble = true; if (onPlace && location.active) place(location.id); else onSelectLocation?.(location.id); }} onContextMenu={onContextMenuLocation ? (event) => { event.evt.preventDefault(); event.cancelBubble = true; onContextMenuLocation(location.id, { x: event.evt.clientX, y: event.evt.clientY }); } : undefined} onDragStart={(event) => {
            event.cancelBubble = true;
            if (!onMoveLocation) return;
            cancelResize.current?.();
            setSectorDragPreview({ id: location.id, x: event.target.x(), y: event.target.y() });
            onSelectLocation?.(location.id);
          }} onDragMove={(event) => {
            event.cancelBubble = true;
            if (onMoveLocation) setSectorDragPreview({ id: location.id, x: event.target.x(), y: event.target.y() });
          }} onDragEnd={(event) => {
            event.cancelBubble = true;
            const point = { x: event.target.x(), y: event.target.y() };
            setSectorDragPreview(null);
            onMoveLocation?.(location.id, point);
          }}>
          <Rect x={-location.width / 2} y={-location.height / 2} width={location.width} height={location.height} fill={selectedLocationId === location.id ? paint.sectorSelected : paint.sector} opacity={appearance === "operational" ? 0.8 : 0.65} stroke={selectedLocationId === location.id ? paint.sectorSelectedEdge : paint.sectorEdge} strokeWidth={selectedLocationId === location.id ? 3 : 1.5} dash={[10, 7]} cornerRadius={5} />
          <Text x={-location.width / 2 + 10} y={-location.height / 2 + 10} width={Math.max(1, location.width - 20)} height={Math.max(1, location.height - 20)} wrap="none" ellipsis text={location.name} fontSize={15} fill={paint.sectorInk} fontStyle="bold" listening={false} />
        </Group>; })}
        {room.fixtures.map((fixture) => <Group key={fixture.id} x={fixture.x} y={fixture.y} rotation={fixture.rotation} draggable={Boolean(onMoveFixture)} onClick={(event) => { event.cancelBubble = true; if (onPlace) place(); else onSelectFixture?.(fixture.id); }} onTap={(event) => { event.cancelBubble = true; if (onPlace) place(); else onSelectFixture?.(fixture.id); }} onDragEnd={(event) => { event.cancelBubble = true; onMoveFixture?.(fixture.id, { x: event.target.x(), y: event.target.y() }); }}>
          {fixture.type !== "LABEL" && <Rect x={-fixture.width / 2} y={-fixture.height / 2} width={fixture.width} height={fixture.height} fill={fixture.type === "WALL" ? paint.wall : paint.bar} stroke={selectedFixtureId === fixture.id ? paint.tableSelectedEdge : undefined} strokeWidth={3} cornerRadius={fixture.type === "BAR" ? 5 : 0} />}
          {fixture.label && <Text text={fixture.label} x={-fixture.width / 2} y={-8} width={fixture.width} align="center" fontSize={fixture.type === "LABEL" ? 18 : 13} fill={fixture.type === "WALL" ? "#ffffff" : paint.fixtureInk} fontStyle="bold" />}
        </Group>)}
        {liveJoinedGroups.map(({ group, tables }) => <JoinedTables key={group.id} group={group} tables={tables} selectedIds={selectedIds} paint={paint} onContextMenu={onContextMenuGroup ? (point) => onContextMenuGroup(group.tableIds, point) : undefined} />)}
        {liveTables.map((table) => <Table key={table.id} table={table} paint={paint} selected={selectedIds.includes(table.id)} draggable={Boolean(onMove) && (!draggableIds || draggableIds.includes(table.id))}
          onSelect={(additive) => onSelect?.(table.id, additive)}
          onContextMenu={onContextMenuTable ? (point) => onContextMenuTable(table.id, point) : undefined}
          onDragStart={(node) => {
            const ids = selectedIds.includes(table.id) ? selectedIds : [table.id];
            if (!selectedIds.includes(table.id)) onSelect?.(table.id, false);
            drag.current = { origin: { x: node.x(), y: node.y() }, ids, starts: new Map(tables.filter((item) => ids.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }])) };
            setTableDragPreview(new Map(drag.current.starts));
          }}
          onDragMove={(node) => {
            const session = drag.current;
            if (!session) return;
            const delta = { x: node.x() - session.origin.x, y: node.y() - session.origin.y };
            setTableDragPreview(new Map(Array.from(session.starts, ([id, start]) => [id, { x: start.x + delta.x, y: start.y + delta.y }])));
            for (const id of session.ids) {
              if (id === table.id) continue;
              const start = session.starts.get(id);
              if (start) stage.current?.findOne(`#floor-table-${id}`)?.position({ x: start.x + delta.x, y: start.y + delta.y });
            }
          }}
          onDragEnd={(node) => {
            const session = drag.current;
            if (session) onMove?.(session.ids, { x: node.x() - session.origin.x, y: node.y() - session.origin.y });
            drag.current = null;
            setTableDragPreview(null);
          }} />)}
        {selectedSector && onResizeLocation && <FloorSectorResizeHandles key={selectedSector.id} location={selectedSector as FloorSectorResizeGeometry & { id: string }} geometry={liveSector(selectedSector) as FloorSectorResizeGeometry} room={room} scale={scale} getPointer={() => layer.current?.getRelativePointerPosition() ?? null} onPreview={setResizePreview} onCommit={(id, { x, y, width, height }) => onResizeLocation(id, { x, y, width, height })} onCursor={setCursor} defaultCursor={zoom > 1 ? "grab" : "default"} cancelRef={cancelResize} onContextMenu={onContextMenuLocation ? (point) => onContextMenuLocation(selectedSector.id, point) : undefined} />}
      </Layer>
    </Stage>
  </div>;
}

function JoinedTables({ group, tables, selectedIds, paint, onContextMenu }: { group: FloorCanvasJoinedGroup; tables: FloorCanvasTable[]; selectedIds: string[]; paint: CanvasPaint; onContextMenu?: (point: { x: number; y: number }) => void }) {
  if (tables.length < 2) return null;
  const bounds = tables.map((table) => {
    const swapped = table.shape !== "CIRCLE" && Math.abs(table.rotation % 180) === 90;
    const width = swapped ? table.height : table.width;
    const height = table.shape === "CIRCLE" ? table.width : swapped ? table.width : table.height;
    return { left: table.x - width / 2, right: table.x + width / 2, top: table.y - height / 2, bottom: table.y + height / 2 };
  });
  const left = Math.min(...bounds.map((bound) => bound.left)) - 6;
  const top = Math.min(...bounds.map((bound) => bound.top)) - 6;
  const width = Math.max(...bounds.map((bound) => bound.right)) + 6 - left;
  const height = Math.max(...bounds.map((bound) => bound.bottom)) + 6 - top;
  const selected = tables.some((table) => selectedIds.includes(table.id) || table.state === "selected");
  const reserved = tables.some((table) => table.state === "reserved");
  const stroke = selected ? paint.tableSelectedEdge : reserved ? "#95664c" : paint.joinEdge;
  const labelWidth = Math.max(width, 160);
  const labelX = (width - labelWidth) / 2;
  return <Group id={`floor-joined-group-${group.id}`} x={left} y={top} listening={Boolean(onContextMenu)} onContextMenu={onContextMenu ? (event) => { event.evt.preventDefault(); event.cancelBubble = true; onContextMenu({ x: event.evt.clientX, y: event.evt.clientY }); } : undefined}>
    <Rect id={`floor-joined-outline-${group.id}`} width={width} height={height} stroke={stroke} strokeWidth={1.5} dash={[6, 4]} cornerRadius={9} hitStrokeWidth={16} listening={Boolean(onContextMenu)} />
    <Rect x={labelX} y={-25} width={labelWidth} height={21} fill={paint.board} cornerRadius={4} listening={Boolean(onContextMenu)} />
    <Text id={`floor-joined-label-${group.id}`} text={`Unidas · ${group.label}`} x={labelX + 5} y={-21} width={labelWidth - 10} height={16} wrap="none" ellipsis align="center" fontSize={12} fontStyle="bold" fill={stroke} listening={Boolean(onContextMenu)} />
  </Group>;
}

function Table({ table, selected, draggable, paint, onSelect, onContextMenu, onDragStart, onDragMove, onDragEnd }: { table: FloorCanvasTable; selected: boolean; draggable: boolean; paint: CanvasPaint; onSelect: (additive: boolean) => void; onContextMenu?: (point: { x: number; y: number }) => void; onDragStart: (node: Konva.Node) => void; onDragMove: (node: Konva.Node) => void; onDragEnd: (node: Konva.Node) => void }) {
  const reserved = table.state === "reserved";
  const unavailable = table.state === "unavailable" || !table.active;
  const fill = selected ? paint.tableSelected : reserved ? "#f0d6c4" : unavailable ? paint.tableUnavailable : paint.table;
  const stroke = selected ? paint.tableSelectedEdge : reserved ? "#95664c" : paint.tableEdge;
  return <Group id={`floor-table-${table.id}`} x={table.x} y={table.y} rotation={table.rotation} opacity={unavailable ? 0.55 : 1} draggable={draggable && table.active}
    onMouseDown={(event) => { event.cancelBubble = true; if (event.evt.button !== 0) return; onSelect(event.evt.shiftKey); }} onTap={(event) => { event.cancelBubble = true; onSelect(false); }}
    onContextMenu={onContextMenu ? (event) => { event.evt.preventDefault(); event.cancelBubble = true; onContextMenu({ x: event.evt.clientX, y: event.evt.clientY }); } : undefined}
    onDragStart={(event) => { event.cancelBubble = true; onDragStart(event.target); }} onDragMove={(event) => { event.cancelBubble = true; onDragMove(event.target); }} onDragEnd={(event) => { event.cancelBubble = true; onDragEnd(event.target); }}>
    {table.shape === "CIRCLE" ? <Circle radius={table.width / 2} fill={fill} stroke={stroke} strokeWidth={selected ? 3 : 1.5} /> : <Rect x={-table.width / 2} y={-table.height / 2} width={table.width} height={table.height} cornerRadius={6} fill={fill} stroke={stroke} strokeWidth={selected ? 3 : 1.5} />}
    <Group rotation={-table.rotation} listening={false}><Text x={-60} y={-8} width={120} align="center" text={table.label} fontSize={16} fontStyle="bold" fill={paint.tableInk} /></Group>
  </Group>;
}
