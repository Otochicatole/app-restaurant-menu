"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow, Ellipse, Image as KonvaImage, Layer, Line, Rect, RegularPolygon, Star, Stage, Text, Transformer } from "react-konva";
import type Konva from "konva";
import type { CanvasDocumentV1, CanvasNode } from "../contracts";

type Viewport = CanvasDocumentV1["initialViewport"];

export function KonvaCanvas({ document, assets, selectedIds, onSelect, onSelectMany, onChange, viewport, onViewportChange }: {
  document: CanvasDocumentV1;
  assets: Record<string, { url: string; kind: "IMAGE" | "FONT"; fontFamily: string | null }>;
  selectedIds: string[];
  onSelect: (id: string | null, additive: boolean) => void;
  onSelectMany: (ids: string[]) => void;
  onChange: (id: string, patch: Partial<CanvasNode>) => void;
  viewport: Viewport;
  onViewportChange: (viewport: Viewport) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [size, setSize] = useState({ width: 900, height: 640 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number; viewport: Viewport } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const scale = Math.max(0.1, Math.min(8, Math.min(size.width / viewport.width, size.height / viewport.height)));

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize({ width: element.clientWidth || 900, height: element.clientHeight || 640 }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;
    const nodes = selectedIds.map((id) => stage.findOne(`#node-${id}`)).filter((node): node is Konva.Node => Boolean(node));
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, document.nodes]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => { if (event.code === "Space") { event.preventDefault(); setSpacePressed(true); } };
    const up = (event: KeyboardEvent) => { if (event.code === "Space") { event.preventDefault(); setSpacePressed(false); setPanStart(null); } };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const zoomAt = (factor: number, pointer: { x: number; y: number }) => {
    const nextScale = Math.max(0.1, Math.min(8, scale * factor));
    const worldX = viewport.x + pointer.x / scale;
    const worldY = viewport.y + pointer.y / scale;
    const width = size.width / nextScale;
    const height = size.height / nextScale;
    onViewportChange({ x: worldX - pointer.x / nextScale, y: worldY - pointer.y / nextScale, width, height });
  };
  const pointer = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => event.target.getStage()?.getPointerPosition();
  const beginPan = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const button = "button" in event.evt ? event.evt.button : 0;
    if (!spacePressed && button !== 1) return;
    const position = pointer(event);
    if (!position) return;
    event.evt.preventDefault();
    event.cancelBubble = true;
    setPanStart({ x: position.x, y: position.y, viewport });
  };
  const movePan = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!panStart) return;
    const position = pointer(event);
    if (!position) return;
    onViewportChange({ ...panStart.viewport, x: panStart.viewport.x - (position.x - panStart.x) / scale, y: panStart.viewport.y - (position.y - panStart.y) / scale });
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
      const left = viewport.x + selectionBox.x / scale;
      const top = viewport.y + selectionBox.y / scale;
      const right = left + selectionBox.width / scale;
      const bottom = top + selectionBox.height / scale;
      onSelectMany(document.nodes.filter((node) => node.visible && node.x < right && node.x + node.width > left && node.y < bottom && node.y + node.height > top).map((node) => node.id));
    }
    setSelectionStart(null);
    setSelectionBox(null);
  };

  return <div ref={containerRef} className="h-full w-full overflow-hidden bg-zinc-200" onContextMenu={(event) => event.preventDefault()}>
    <Stage
      ref={stageRef}
      width={size.width}
      height={size.height}
      draggable={false}
      onMouseDown={(event) => { if (event.target === event.target.getStage()) { onSelect(null, false); beginPan(event); beginSelection(event); } }}
      onMouseMove={(event) => { movePan(event); moveSelection(event); }}
      onMouseUp={() => { setPanStart(null); finishSelection(); }}
      onTouchStart={(event) => { if (event.target === event.target.getStage()) beginPan(event); }}
      onTouchMove={movePan}
      onTouchEnd={() => setPanStart(null)}
      onWheel={(event) => {
        event.evt.preventDefault();
        if (event.evt.ctrlKey || event.evt.deltaY !== 0) zoomAt(event.evt.deltaY > 0 ? 0.92 : 1.08, { x: event.evt.offsetX, y: event.evt.offsetY });
      }}
    >
      <Layer x={-viewport.x * scale} y={-viewport.y * scale} scaleX={scale} scaleY={scale}>
        <Rect x={-100000} y={-100000} width={200000} height={200000} fill={document.background} listening={false} />
        {document.nodes.filter((node) => node.visible).map((node) => <CanvasNodeView key={node.id} node={node} imageAsset={node.type === "image" ? assets[node.assetId] : undefined} fontAsset={node.type === "text" && node.fontAssetId ? assets[node.fontAssetId] : undefined} onSelect={onSelect} onChange={onChange} />)}
        <Transformer ref={transformerRef} rotateEnabled={true} flipEnabled={false} boundBoxFunc={(oldBox, nextBox) => nextBox.width < 4 || nextBox.height < 4 ? oldBox : nextBox} />
      </Layer>
      {selectionBox && <Layer listening={false}><Rect x={selectionBox.x} y={selectionBox.y} width={selectionBox.width} height={selectionBox.height} fill="rgba(16,185,129,0.16)" stroke="#10b981" dash={[6, 4]} strokeWidth={1} /></Layer>}
    </Stage>
    <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-2 py-1 text-xs text-zinc-600 shadow">{Math.round(scale * 100)}%</div>
  </div>;
}

function CanvasNodeView({ node, imageAsset, fontAsset, onSelect, onChange }: { node: CanvasNode; imageAsset?: { url: string }; fontAsset?: { fontFamily: string | null }; onSelect: (id: string, additive: boolean) => void; onChange: (id: string, patch: Partial<CanvasNode>) => void }) {
  const common = { id: `node-${node.id}`, x: node.x, y: node.y, width: node.width, height: node.height, rotation: node.rotation, opacity: node.opacity, draggable: !node.locked, onMouseDown: (event: Konva.KonvaEventObject<MouseEvent>) => { event.cancelBubble = true; onSelect(node.id, event.evt.shiftKey); }, onTouchStart: (event: Konva.KonvaEventObject<TouchEvent>) => { event.cancelBubble = true; onSelect(node.id, false); }, onDragStart: (event: Konva.KonvaEventObject<DragEvent>) => { event.cancelBubble = true; }, onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => { event.cancelBubble = true; onChange(node.id, { x: event.target.x(), y: event.target.y() }); }, onTransformEnd: (event: Konva.KonvaEventObject<Event>) => { event.cancelBubble = true; const target = event.target; const scaleX = target.scaleX(); const scaleY = target.scaleY(); target.scaleX(1); target.scaleY(1); const patch: Partial<CanvasNode> = { x: target.x(), y: target.y(), width: Math.max(4, target.width() * scaleX), height: Math.max(4, target.height() * scaleY), rotation: target.rotation() }; if (node.type === "text") { onChange(node.id, { ...patch, fontSize: Math.max(1, node.fontSize * scaleY), letterSpacing: node.letterSpacing * scaleX } as Partial<CanvasNode>); } else onChange(node.id, patch); } };
  if (node.type === "text") return <Text {...common} text={node.text} fontSize={node.fontSize} fontStyle={node.fontStyle} fontFamily={fontAsset?.fontFamily ?? (node.fontAssetId ? `editor-font-${node.fontAssetId}` : "Arial")} fontWeight={node.fontWeight} textDecoration={node.textDecoration} align={node.align} verticalAlign={node.verticalAlign} lineHeight={node.lineHeight} letterSpacing={node.letterSpacing} fill={node.fill} />;
  if (node.type === "image") return <LoadedImage {...common} url={imageAsset?.url} cornerRadius={node.cornerRadius} />;
  if (node.type === "shape") {
    if (node.shape === "ellipse") return <Ellipse {...common} radiusX={node.width / 2} radiusY={node.height / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
    if (node.shape === "line") return <Line {...common} points={[0, node.height / 2, node.width, node.height / 2]} stroke={node.stroke ?? node.fill ?? "#3A4824"} strokeWidth={Math.max(1, node.strokeWidth || 3)} />;
    if (node.shape === "arrow") return <Arrow {...common} points={[0, node.height / 2, node.width, node.height / 2]} stroke={node.stroke ?? node.fill ?? "#3A4824"} fill={node.fill ?? undefined} strokeWidth={Math.max(1, node.strokeWidth || 3)} pointerLength={12} pointerWidth={12} />;
    if (node.shape === "triangle") return <RegularPolygon {...common} sides={3} radius={Math.min(node.width, node.height) / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
    if (node.shape === "star") return <Star {...common} numPoints={5} innerRadius={Math.min(node.width, node.height) / 4} outerRadius={Math.min(node.width, node.height) / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
    return <Rect {...common} cornerRadius={node.cornerRadius} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
  }
  return <Text {...common} text={iconGlyph(node.iconKey)} fontSize={Math.min(node.width, node.height)} align="center" verticalAlign="middle" fill={node.fill} />;
}

function LoadedImage(props: Record<string, unknown> & { url?: string; cornerRadius?: number }) {
  const [image, setImage] = useState<HTMLImageElement | undefined>();
  useEffect(() => {
    if (!props.url) return;
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => setImage(image);
    image.src = props.url;
  }, [props.url]);
  return <KonvaImage {...props} image={image} cornerRadius={props.cornerRadius} />;
}

function iconGlyph(key: string): string {
  const values: Record<string, string> = { star: "★", heart: "♥", coffee: "☕", leaf: "❧", check: "✓", circle: "●", arrow: "➜" };
  return values[key] ?? "✦";
}
