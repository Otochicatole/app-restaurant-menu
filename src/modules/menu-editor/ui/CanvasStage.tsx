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
type PanMotion = { last: TouchPoint; velocity: TouchPoint; time: number };

export function CanvasStage({ document, assets, onTextModalOpen }: { document: CanvasDocumentV1; assets: Record<string, CanvasStageAsset>; onTextModalOpen?: (asset: MediaModalAsset) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 640 });
  const [viewport, setViewport] = useState(document.canvasBounds);
  const [panStart, setPanStart] = useState<{ x: number; y: number; viewport: CanvasDocumentV1["initialViewport"] } | null>(null);
  const pinchSession = useRef<PinchSession | null>(null);
  const panMotion = useRef<PanMotion | null>(null);
  const inertiaFrame = useRef<number | null>(null);
  const viewportRef = useRef(viewport);
  const bounds = document.canvasBounds;
  const scenePadding = 10;
  const sceneSize = { width: Math.max(1, size.width - scenePadding * 2), height: Math.max(1, size.height - scenePadding * 2) };
  const { camera, scale, fitScale } = cameraForViewport(viewport, bounds, sceneSize, 0.1, 8, "width");
  const updateViewport = (next: CanvasDocumentV1["initialViewport"]) => { viewportRef.current = next; setViewport(next); };
  const zoomAt = (factor: number, point = { x: size.width / 2, y: size.height / 2 }) => updateViewport(zoomViewportAt(viewportRef.current, bounds, sceneSize, factor, { x: point.x - scenePadding, y: point.y - scenePadding }, 0.1, 8, "width"));
  const pointer = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => event.target.getStage()?.getPointerPosition();
  const cancelInertia = () => { if (inertiaFrame.current !== null) window.cancelAnimationFrame(inertiaFrame.current); inertiaFrame.current = null; };
  const beginPan = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => { const position = pointer(event); if (!position) return; const button = "button" in event.evt ? event.evt.button : 0; if (button !== 0 && button !== 1) return; cancelInertia(); event.evt.preventDefault(); setPanStart({ x: position.x, y: position.y, viewport: camera }); panMotion.current = { last: position, velocity: { x: 0, y: 0 }, time: performance.now() }; };
  const movePan = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => { if (!panStart) return; const position = pointer(event); if (!position) return; const now = performance.now(); const motion = panMotion.current; if (motion) { const elapsed = Math.max(1, now - motion.time); const instantVelocity = { x: (position.x - motion.last.x) / elapsed, y: (position.y - motion.last.y) / elapsed }; panMotion.current = { last: position, time: now, velocity: { x: motion.velocity.x * 0.35 + instantVelocity.x * 0.65, y: motion.velocity.y * 0.35 + instantVelocity.y * 0.65 } }; } updateViewport(cameraForViewport({ ...panStart.viewport, x: panStart.viewport.x - (position.x - panStart.x) / scale, y: panStart.viewport.y - (position.y - panStart.y) / scale }, bounds, sceneSize, 0.1, 8, "width").camera); };
  const startInertia = (velocity: TouchPoint | null) => {
    if (!velocity || Math.hypot(velocity.x, velocity.y) < 0.08) return;
    cancelInertia();
    const currentVelocity = { ...velocity };
    let previousTime = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(40, Math.max(1, now - previousTime));
      previousTime = now;
      const currentViewport = viewportRef.current;
      const current = cameraForViewport(currentViewport, bounds, sceneSize, 0.1, 8, "width");
      const nextViewport = { ...currentViewport, x: currentViewport.x - currentVelocity.x * elapsed / current.scale, y: currentViewport.y - currentVelocity.y * elapsed / current.scale };
      const nextCamera = cameraForViewport(nextViewport, bounds, sceneSize, 0.1, 8, "width").camera;
      const hitHorizontalEdge = nextCamera.x === current.camera.x && currentVelocity.x !== 0;
      const hitVerticalEdge = nextCamera.y === current.camera.y && currentVelocity.y !== 0;
      if (hitHorizontalEdge) currentVelocity.x = 0;
      if (hitVerticalEdge) currentVelocity.y = 0;
      updateViewport(nextCamera);
      const friction = Math.pow(0.92, elapsed / 16);
      currentVelocity.x *= friction;
      currentVelocity.y *= friction;
      if (Math.hypot(currentVelocity.x, currentVelocity.y) >= 0.02) inertiaFrame.current = window.requestAnimationFrame(tick);
      else inertiaFrame.current = null;
    };
    inertiaFrame.current = window.requestAnimationFrame(tick);
  };
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
    const current = cameraForViewport(viewportRef.current, bounds, sceneSize, 0.1, 8, "width");
    pinchSession.current = { viewport: viewportRef.current, scale: current.scale, distance, worldFocus: { x: current.camera.x + (focus.x - scenePadding) / current.scale, y: current.camera.y + (focus.y - scenePadding) / current.scale } };
    panMotion.current = null;
    cancelInertia();
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
    updateViewport(cameraForViewport(nextViewport, bounds, sceneSize, 0.1, 8, "width").camera);
    event.evt.preventDefault();
  };
  const finishTouch = (event: Konva.KonvaEventObject<TouchEvent>, withInertia = true) => {
    const wasPinching = Boolean(pinchSession.current);
    if (event.evt.touches.length < 2) pinchSession.current = null;
    const velocity = panMotion.current?.velocity ?? null;
    panMotion.current = null;
    setPanStart(null);
    if (withInertia && event.evt.touches.length === 0 && !wasPinching) startInertia(velocity);
  };
  useEffect(() => { const el = containerRef.current; if (!el) return; const observer = new ResizeObserver(() => setSize({ width: el.clientWidth || 900, height: el.clientHeight || 640 })); observer.observe(el); return () => observer.disconnect(); }, []);
  useEffect(() => () => cancelInertia(), []);
  const displayBackground = document.background.endsWith("00") ? "#f5f7f3" : document.background;
  return <div ref={containerRef} className="h-full w-full touch-none" style={{ backgroundColor: displayBackground }} onContextMenu={(event) => event.preventDefault()}>
    <Stage width={size.width} height={size.height} draggable={false} onMouseDown={(event) => { if (event.target === event.target.getStage()) beginPan(event); }} onMouseMove={movePan} onMouseUp={() => { panMotion.current = null; setPanStart(null); }} onMouseLeave={() => { panMotion.current = null; setPanStart(null); }} onTouchStart={(event) => { const points = touchPoints(event); if (points.length >= 2) beginPinch(event, points); else if (event.target === event.target.getStage()) beginPan(event); }} onTouchMove={(event) => movePinch(event, touchPoints(event))} onTouchEnd={finishTouch} onTouchCancel={(event: Konva.KonvaEventObject<TouchEvent>) => finishTouch(event, false)} onWheel={(event) => { event.evt.preventDefault(); zoomAt(event.evt.deltaY > 0 ? 0.92 : 1.08, { x: event.evt.offsetX, y: event.evt.offsetY }); }}>
      <Layer x={scenePadding - camera.x * scale} y={scenePadding - camera.y * scale} scaleX={scale} scaleY={scale} clipX={bounds.x} clipY={bounds.y} clipWidth={bounds.width} clipHeight={bounds.height}><Rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} fill={document.background} listening={false} />{document.nodes.filter((node) => node.visible).map((node) => <CanvasStageNode key={node.id} node={node} assets={assets} onTextModalOpen={onTextModalOpen} />)}</Layer>
    </Stage>
    <div className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-white/95 p-1 shadow"><button type="button" className="rounded px-2 py-1 text-sm disabled:opacity-30" onClick={() => zoomAt(0.9)} disabled={scale <= fitScale * (1 + 1e-10)} aria-label="Alejar">−</button><span className="px-1 text-[11px] text-zinc-600">{Math.round(scale * 100)}%</span><button type="button" className="rounded px-2 py-1 text-sm" onClick={() => zoomAt(1.1)} aria-label="Acercar">+</button><button type="button" className="rounded px-2 py-1 text-[11px] text-zinc-700" onClick={() => { cancelInertia(); updateViewport(bounds); }}>Restablecer</button></div>
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
  const activate = interactive ? () => { if (modalAsset && (modalAsset.kind === "IMAGE" || modalAsset.kind === "VIDEO")) onTextModalOpen?.(modalAsset); else if (node.link) window.open(node.link, "_blank", "noopener,noreferrer"); } : undefined;
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
