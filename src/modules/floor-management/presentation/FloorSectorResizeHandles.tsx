"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { Group, Rect } from "react-konva";
import type Konva from "konva";
import { resizeFloorSector, type FloorSectorResizeAnchor, type FloorSectorResizeGeometry, type FloorSectorResizePoint } from "./floor-sector-resize";

export type FloorSectorResizePreview = { id: string; geometry: FloorSectorResizeGeometry } | null;
const anchors: FloorSectorResizeAnchor[] = ["top-left", "top-center", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-center", "bottom-right"];
const edges: FloorSectorResizeAnchor[] = ["top-center", "middle-right", "bottom-center", "middle-left"];
function localPoint(geometry: FloorSectorResizeGeometry, anchor: FloorSectorResizeAnchor) {
  return { x: anchor.endsWith("left") ? -geometry.width / 2 : anchor.endsWith("right") ? geometry.width / 2 : 0, y: anchor.startsWith("top") ? -geometry.height / 2 : anchor.startsWith("bottom") ? geometry.height / 2 : 0 };
}
function worldPoint(geometry: FloorSectorResizeGeometry, anchor: FloorSectorResizeAnchor) {
  const point = localPoint(geometry, anchor);
  if (geometry.rotation === 90) return { x: geometry.x - point.y, y: geometry.y + point.x };
  if (geometry.rotation === 180) return { x: geometry.x - point.x, y: geometry.y - point.y };
  if (geometry.rotation === 270) return { x: geometry.x + point.y, y: geometry.y - point.x };
  return { x: geometry.x + point.x, y: geometry.y + point.y };
}
function cursorFor(anchor: FloorSectorResizeAnchor, rotation: number) {
  const swap = rotation % 180 !== 0;
  if (anchor.endsWith("center")) return swap ? "ew-resize" : "ns-resize";
  if (anchor.startsWith("middle")) return swap ? "ns-resize" : "ew-resize";
  return (["top-left", "bottom-right"].includes(anchor) !== swap) ? "nwse-resize" : "nesw-resize";
}

export function FloorSectorResizeHandles({ location, geometry, room, scale, getPointer, onPreview, onCommit, onCursor, defaultCursor, cancelRef, onContextMenu }: {
  location: FloorSectorResizeGeometry & { id: string }; geometry: FloorSectorResizeGeometry; room: { width: number; height: number }; scale: number;
  getPointer: () => FloorSectorResizePoint | null; onPreview: (value: FloorSectorResizePreview) => void;
  onCommit: (id: string, geometry: FloorSectorResizeGeometry) => void; onCursor: (cursor: string) => void; defaultCursor: string;
  cancelRef: RefObject<(() => void) | null>; onContextMenu?: (point: FloorSectorResizePoint) => void;
}) {
  const session = useRef<{ start: FloorSectorResizeGeometry; anchor: FloorSectorResizeAnchor; offset: FloorSectorResizePoint; node: Konva.Node; edge: boolean; dragging: boolean } | null>(null);
  useEffect(() => () => { const active = session.current; session.current = null; active?.node.stopDrag(); onPreview(null); onCursor(defaultCursor); }, [onPreview, onCursor, defaultCursor]);
  const size = 10 / scale;
  const box = (value: FloorSectorResizeGeometry, anchor: FloorSectorResizeAnchor, edge: boolean) => {
    const point = localPoint(value, anchor);
    if (edge && anchor.startsWith("middle")) return { x: point.x - size / 2, y: -value.height / 2, width: size, height: value.height };
    if (edge) return { x: -value.width / 2, y: point.y - size / 2, width: value.width, height: size };
    return { x: point.x - size / 2, y: point.y - size / 2, width: size, height: size };
  };
  const candidate = () => {
    const active = session.current; const pointer = getPointer();
    return active && pointer ? resizeFloorSector(active.start, active.anchor, { x: pointer.x - active.offset.x, y: pointer.y - active.offset.y }, room) : null;
  };
  useLayoutEffect(() => {
    const cancel = () => {
      const active = session.current; session.current = null;
      if (active) { active.node.position(box(active.start, active.anchor, active.edge)); active.node.stopDrag(); }
      onPreview(null); onCursor(defaultCursor);
    };
    cancelRef.current = cancel;
    return () => { if (cancelRef.current === cancel) cancelRef.current = null; };
  });
  const prepare = (anchor: FloorSectorResizeAnchor, edge: boolean, node: Konva.Node) => {
    const start = { x: location.x, y: location.y, width: location.width, height: location.height, rotation: location.rotation };
    const origin = worldPoint(start, anchor); const pointer = getPointer() ?? origin;
    session.current = { start, anchor, offset: { x: pointer.x - origin.x, y: pointer.y - origin.y }, node, edge, dragging: false };
  };
  const handle = (anchor: FloorSectorResizeAnchor, edge: boolean) => <Rect key={`${edge ? "edge" : "handle"}-${anchor}`} id={`floor-sector-${location.id}-${edge ? "edge" : "handle"}-${anchor}`} {...box(geometry, anchor, edge)} draggable dragDistance={0} fill={edge ? "transparent" : "#ffffff"} stroke={edge ? undefined : "#255f46"} strokeWidth={edge ? 0 : 1.5 / scale} hitStrokeWidth={edge ? 0 : 8 / scale} cornerRadius={edge ? 0 : 1 / scale}
    onMouseEnter={() => onCursor(cursorFor(anchor, geometry.rotation))} onMouseMove={() => onCursor(cursorFor(anchor, geometry.rotation))} onMouseLeave={() => { if (!session.current) onCursor(defaultCursor); }}
    onMouseDown={(event) => { if (event.evt.button === 0) { event.cancelBubble = true; prepare(anchor, edge, event.target); } }} onMouseUp={() => { if (session.current && !session.current.dragging) { session.current = null; onCursor(defaultCursor); } }} onClick={(event) => { event.cancelBubble = true; }} onTap={(event) => { event.cancelBubble = true; }}
    onTouchStart={(event) => { if (event.evt.touches.length === 1) { event.cancelBubble = true; prepare(anchor, edge, event.target); } else cancelRef.current?.(); }} onTouchEnd={() => { if (session.current && !session.current.dragging) { session.current = null; onCursor(defaultCursor); } }}
    onDragStart={(event) => {
      event.cancelBubble = true;
      if (!session.current) prepare(anchor, edge, event.target);
      session.current!.dragging = true;
      onCursor(cursorFor(anchor, session.current!.start.rotation));
    }}
    onDragMove={(event) => {
      event.cancelBubble = true;
      const next = candidate() ?? session.current?.start;
      if (!next) return;
      onPreview({ id: location.id, geometry: next }); event.target.position(box(next, anchor, edge));
    }}
    onDragEnd={(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      event.cancelBubble = true;
      const active = session.current;
      const next = event.evt?.type === "touchcancel" ? active?.start : candidate() ?? active?.start;
      session.current = null;
      if (next) event.target.position(box(next, anchor, edge));
      onPreview(null);
      onCursor(defaultCursor);
      if (active && next && (next.x !== active.start.x || next.y !== active.start.y || next.width !== active.start.width || next.height !== active.start.height)) onCommit(location.id, next);
    }} />;
  return <Group id={`floor-sector-resize-${location.id}`} x={geometry.x} y={geometry.y} rotation={geometry.rotation} onContextMenu={onContextMenu ? (event) => { event.evt.preventDefault(); event.cancelBubble = true; onContextMenu({ x: event.evt.clientX, y: event.evt.clientY }); } : undefined}>{edges.map((anchor) => handle(anchor, true))}{anchors.map((anchor) => handle(anchor, false))}</Group>;
}
