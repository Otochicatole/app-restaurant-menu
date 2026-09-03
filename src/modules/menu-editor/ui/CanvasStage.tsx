"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow, Ellipse, Image as KonvaImage, Layer, Line, Rect, RegularPolygon, Star, Stage, Text } from "react-konva";
import type Konva from "konva";
import type { CanvasDocumentV1, CanvasNode } from "../contracts";
import { cameraForViewport, zoomViewportAt } from "../domain/canvas-geometry";
import { RectangleVisual } from "./RectangleVisual";
import { LucideKonvaIcon } from "./LucideKonvaIcon";
import type { MediaModalAsset } from "@/ui/MediaModal";

export type CanvasStageAsset = MediaModalAsset | { id: string; kind: "FONT"; name: string; mimeType: string; url: string; fontFamily?: string | null };

type TouchPoint = { x: number; y: number };
type PinchSession = {
  viewport: CanvasDocumentV1["initialViewport"];
  scale: number;
  distance: number;
  worldFocus: TouchPoint;
};

export function CanvasStage({ document, assets, onTextModalOpen }: { document: CanvasDocumentV1; assets: Record<string, CanvasStageAsset>; onTextModalOpen?: (asset: MediaModalAsset) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 640 });
  const [viewport, setViewport] = useState(document.initialViewport);
  const [panStart, setPanStart] = useState<{ x: number; y: number; viewport: CanvasDocumentV1["initialViewport"] } | null>(null);
  const pinchSession = useRef<PinchSession | null>(null);
  const bounds = document.canvasBounds;
  const scenePadding = 10;
  const sceneSize = { width: Math.max(1, size.width - scenePadding * 2), height: Math.max(1, size.height - scenePadding * 2) };
  const { camera, scale, fitScale } = cameraForViewport(viewport, bounds, sceneSize, 0.1, 8, "width");
  const zoomAt = (factor: number, point = { x: size.width / 2, y: size.height / 2 }) => setViewport(zoomViewportAt(viewport, bounds, sceneSize, factor, { x: point.x - scenePadding, y: point.y - scenePadding }, 0.1, 8, "width"));
  const pointer = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => event.target.getStage()?.getPointerPosition();
  const beginPan = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => { const position = pointer(event); if (!position) return; const button = "button" in event.evt ? event.evt.button : 0; if (button !== 0 && button !== 1) return; event.evt.preventDefault(); setPanStart({ x: position.x, y: position.y, viewport: camera }); };
  const movePan = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => { if (!panStart) return; const position = pointer(event); if (!position) return; setViewport(cameraForViewport({ ...panStart.viewport, x: panStart.viewport.x - (position.x - panStart.x) / scale, y: panStart.viewport.y - (position.y - panStart.y) / scale }, bounds, sceneSize, 0.1, 8, "width").camera); };
  const touchPoints = (event: Konva.KonvaEventObject<TouchEvent>): TouchPoint[] => {
    const stage = event.target.getStage();
    if (!stage) return [];
    const rect = stage.container().getBoundingClientRect();
    return Array.from(event.evt.touches).map((touch) => ({ x: touch.clientX - rect.left, y: touch.clientY - rect.top }));
  };
  const beginPinch = (event: Konva.KonvaEventObject<TouchEvent>, points: TouchPoint[]) => {
    const first = points[0];
    const second = points[1];
    if (!first || !second) return;
    const focus = midpoint(first, second);
    const distance = Math.max(1, distanceBetween(first, second));
    const current = cameraForViewport(viewport, bounds, sceneSize, 0.1, 8, "width");
    pinchSession.current = { viewport, scale: current.scale, distance, worldFocus: { x: current.camera.x + (focus.x - scenePadding) / current.scale, y: current.camera.y + (focus.y - scenePadding) / current.scale } };
    setPanStart(null);
    event.evt.preventDefault();
  };
  const movePinch = (event: Konva.KonvaEventObject<TouchEvent>, points: TouchPoint[]) => {
    if (points.length < 2) { movePan(event); return; }
    const first = points[0];
    const second = points[1];
    if (!first || !second) return;
    if (!pinchSession.current) beginPinch(event, points);
    const session = pinchSession.current;
    if (!session) return;
    const focus = midpoint(first, second);
    const factor = distanceBetween(first, second) / session.distance;
    const nextScale = Math.max(fitScale, Math.min(8, session.scale * factor));
    const nextViewport = { x: session.worldFocus.x - (focus.x - scenePadding) / nextScale, y: session.worldFocus.y - (focus.y - scenePadding) / nextScale, width: sceneSize.width / nextScale, height: sceneSize.height / nextScale };
    setViewport(cameraForViewport(nextViewport, bounds, sceneSize, 0.1, 8, "width").camera);
    event.evt.preventDefault();
  };
  const finishTouch = (event: Konva.KonvaEventObject<TouchEvent>) => {
    if (event.evt.touches.length < 2) pinchSession.current = null;
    setPanStart(null);
  };
  useEffect(() => { const el = containerRef.current; if (!el) return; const observer = new ResizeObserver(() => setSize({ width: el.clientWidth || 900, height: el.clientHeight || 640 })); observer.observe(el); return () => observer.disconnect(); }, []);
  const displayBackground = document.background.endsWith("00") ? "#f5f7f3" : document.background;
  return <div ref={containerRef} className="h-full w-full touch-none" style={{ backgroundColor: displayBackground }} onContextMenu={(event) => event.preventDefault()}>
    <Stage width={size.width} height={size.height} draggable={false} onMouseDown={(event) => { if (event.target === event.target.getStage()) beginPan(event); }} onMouseMove={movePan} onMouseUp={() => setPanStart(null)} onMouseLeave={() => setPanStart(null)} onTouchStart={(event) => { const points = touchPoints(event); if (points.length >= 2) beginPinch(event, points); else if (event.target === event.target.getStage()) beginPan(event); }} onTouchMove={(event) => movePinch(event, touchPoints(event))} onTouchEnd={finishTouch} onTouchCancel={finishTouch} onWheel={(event) => { event.evt.preventDefault(); zoomAt(event.evt.deltaY > 0 ? 0.92 : 1.08, { x: event.evt.offsetX, y: event.evt.offsetY }); }}>
      <Layer x={scenePadding - camera.x * scale} y={scenePadding - camera.y * scale} scaleX={scale} scaleY={scale} clipX={bounds.x} clipY={bounds.y} clipWidth={bounds.width} clipHeight={bounds.height}><Rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill={document.background} listening={false} />{document.nodes.filter((node) => node.visible).map((node) => <CanvasStageNode key={node.id} node={node} assets={assets} onTextModalOpen={onTextModalOpen} />)}</Layer>
    </Stage>
    <div className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-white/95 p-1 shadow"><button type="button" className="rounded px-2 py-1 text-sm disabled:opacity-30" onClick={() => zoomAt(0.9)} disabled={scale <= fitScale} aria-label="Alejar">−</button><span className="px-1 text-[11px] text-zinc-600">{Math.round(scale * 100)}%</span><button type="button" className="rounded px-2 py-1 text-sm" onClick={() => zoomAt(1.1)} aria-label="Acercar">+</button><button type="button" className="rounded px-2 py-1 text-[11px] text-zinc-700" onClick={() => setViewport(bounds)}>Restablecer</button></div>
  </div>;
}

function distanceBetween(first: TouchPoint, second: TouchPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function midpoint(first: TouchPoint, second: TouchPoint): TouchPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function CanvasStageNode({ node, assets, onTextModalOpen }: { node: CanvasNode; assets: Record<string, CanvasStageAsset>; onTextModalOpen?: (asset: MediaModalAsset) => void }) {
  const modalAsset = node.type === "text" && node.modalAssetId ? assets[node.modalAssetId] : undefined;
  const fontAsset = node.type === "text" && node.fontAssetId ? assets[node.fontAssetId] : undefined;
  const interactive = Boolean(node.link || modalAsset);
  const activate = interactive ? () => { if (modalAsset && (modalAsset.kind === "IMAGE" || modalAsset.kind === "VIDEO")) onTextModalOpen?.(modalAsset); else if (node.link) window.location.href = node.link; } : undefined;
  const common = { x: node.x, y: node.y, width: node.width, height: node.height, rotation: node.rotation, opacity: node.opacity, listening: interactive, onMouseEnter: interactive ? (event: Konva.KonvaEventObject<MouseEvent>) => { const stage = event.target.getStage(); if (stage) stage.container().style.cursor = "pointer"; } : undefined, onMouseLeave: interactive ? (event: Konva.KonvaEventObject<MouseEvent>) => { const stage = event.target.getStage(); if (stage) stage.container().style.cursor = "default"; } : undefined, onClick: activate, onTap: activate };
  if (node.type === "text") return <Text {...common} text={node.text} wrap="word" fontSize={node.fontSize} fontFamily={fontAsset?.kind === "FONT" ? fontAsset.fontFamily ?? `editor-font-${fontAsset.id}` : node.fontFamily ?? "Arial"} fontStyle={node.fontStyle} fontVariant={`normal ${node.fontWeight}`} textDecoration={node.textDecoration} align={node.align} verticalAlign={node.verticalAlign} lineHeight={node.lineHeight} letterSpacing={node.letterSpacing} fill={node.fill} />;
  if (node.type === "image") return <CanvasStageImage {...common} url={assets[node.assetId]?.url} cornerRadius={node.cornerRadius} />;
  if (node.type === "icon") return <LucideKonvaIcon iconKey={node.iconKey} color={node.fill} strokeWidth={node.strokeWidth} nodeProps={common} />;
  if (node.shape === "ellipse") return <Ellipse {...common} radiusX={node.width / 2} radiusY={node.height / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
  if (node.shape === "line") return <Line {...common} points={[0, node.height / 2, node.width, node.height / 2]} stroke={node.stroke ?? node.fill ?? undefined} strokeWidth={Math.max(1, node.strokeWidth || 3)} />;
  if (node.shape === "arrow") return <Arrow {...common} points={[0, node.height / 2, node.width, node.height / 2]} stroke={node.stroke ?? node.fill ?? undefined} fill={node.fill ?? undefined} strokeWidth={Math.max(1, node.strokeWidth || 3)} pointerLength={12} pointerWidth={12} />;
  if (node.shape === "triangle") return <RegularPolygon {...common} sides={3} radius={Math.min(node.width, node.height) / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
  if (node.shape === "star") return <Star {...common} numPoints={5} innerRadius={Math.min(node.width, node.height) / 4} outerRadius={Math.min(node.width, node.height) / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
  return <RectangleVisual node={node} backgroundAsset={node.backgroundImage ? assets[node.backgroundImage.assetId] : undefined} nodeProps={common} />;
}

function CanvasStageImage(props: Record<string, unknown> & { url?: string; cornerRadius?: number }) { const [image, setImage] = useState<HTMLImageElement>(); useEffect(() => { if (!props.url) return; const image = new window.Image(); image.crossOrigin = "anonymous"; image.onload = () => setImage(image); image.src = props.url; }, [props.url]); return <KonvaImage {...props} image={image} cornerRadius={props.cornerRadius} />; }
