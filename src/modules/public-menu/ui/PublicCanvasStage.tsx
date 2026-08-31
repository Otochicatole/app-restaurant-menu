"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow, Ellipse, Image as KonvaImage, Layer, Line, Rect, RegularPolygon, Star, Stage, Text } from "react-konva";
import type { CanvasDocumentV1, CanvasNode } from "@/modules/menu-editor/contracts";
import type { PublicCanvasAsset } from "../contracts";

export function PublicCanvasStage({ document, assets }: { document: CanvasDocumentV1; assets: Record<string, PublicCanvasAsset> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 640 });
  const [viewport, setViewport] = useState(document.initialViewport);
  const scale = Math.max(0.1, Math.min(8, Math.min(size.width / viewport.width, size.height / viewport.height)));
  const zoom = (factor: number) => setViewport((current) => ({ ...current, width: Math.max(80, Math.min(100_000, current.width / factor)), height: Math.max(80, Math.min(100_000, current.height / factor)) }));
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize({ width: el.clientWidth || 900, height: el.clientHeight || 640 }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={containerRef} className="h-full w-full touch-none bg-zinc-200" onContextMenu={(event) => event.preventDefault()}>
    <Stage width={size.width} height={size.height} draggable onDragEnd={(event) => { const dx = event.target.x(); const dy = event.target.y(); setViewport((current) => ({ ...current, x: current.x - dx / scale, y: current.y - dy / scale })); event.target.position({ x: 0, y: 0 }); }} onWheel={(event) => { event.evt.preventDefault(); const factor = event.evt.deltaY > 0 ? 0.92 : 1.08; setViewport((current) => ({ ...current, width: Math.max(80, Math.min(100_000, current.width / factor)), height: Math.max(80, Math.min(100_000, current.height / factor)) })); }}>
      <Layer x={-viewport.x * scale} y={-viewport.y * scale} scaleX={scale} scaleY={scale}><Rect x={-100000} y={-100000} width={200000} height={200000} fill={document.background} listening={false} />{document.nodes.filter((node) => node.visible).map((node) => <PublicNode key={node.id} node={node} asset={node.type === "image" ? assets[node.assetId] : node.type === "text" && node.fontAssetId ? assets[node.fontAssetId] : undefined} />)}</Layer>
    </Stage>
    <div className="absolute left-3 top-3 flex items-center gap-1 rounded-lg bg-white/95 p-1 shadow"><button type="button" className="rounded px-2 py-1 text-sm" onClick={() => zoom(0.9)} aria-label="Alejar">−</button><span className="px-1 text-[11px] text-zinc-600">{Math.round(scale * 100)}%</span><button type="button" className="rounded px-2 py-1 text-sm" onClick={() => zoom(1.1)} aria-label="Acercar">+</button><button type="button" className="rounded px-2 py-1 text-[11px] text-zinc-700" onClick={() => setViewport(document.initialViewport)}>Restablecer</button></div>
  </div>;
}

function PublicNode({ node, asset }: { node: CanvasNode; asset?: PublicCanvasAsset }) {
  const common = { x: node.x, y: node.y, width: node.width, height: node.height, rotation: node.rotation, opacity: node.opacity, listening: Boolean(node.link), onTap: node.link ? () => { window.location.href = node.link!; } : undefined };
  if (node.type === "text") return <Text {...common} text={node.text} fontSize={node.fontSize} fontFamily={asset?.fontFamily ?? "Arial"} fontStyle={node.fontStyle} fontWeight={node.fontWeight} textDecoration={node.textDecoration} align={node.align} verticalAlign={node.verticalAlign} lineHeight={node.lineHeight} letterSpacing={node.letterSpacing} fill={node.fill} />;
  if (node.type === "image") return <PublicImage {...common} url={asset?.url} />;
  if (node.type === "icon") return <Text {...common} text={iconGlyph(node.iconKey)} fontSize={Math.min(node.width, node.height)} align="center" verticalAlign="middle" fill={node.fill} />;
  if (node.shape === "ellipse") return <Ellipse {...common} radiusX={node.width / 2} radiusY={node.height / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
  if (node.shape === "line") return <Line {...common} points={[0, node.height / 2, node.width, node.height / 2]} stroke={node.stroke ?? node.fill ?? "#3A4824"} strokeWidth={Math.max(1, node.strokeWidth || 3)} />;
  if (node.shape === "arrow") return <Arrow {...common} points={[0, node.height / 2, node.width, node.height / 2]} stroke={node.stroke ?? node.fill ?? "#3A4824"} fill={node.fill ?? undefined} strokeWidth={Math.max(1, node.strokeWidth || 3)} pointerLength={12} pointerWidth={12} />;
  if (node.shape === "triangle") return <RegularPolygon {...common} sides={3} radius={Math.min(node.width, node.height) / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
  if (node.shape === "star") return <Star {...common} numPoints={5} innerRadius={Math.min(node.width, node.height) / 4} outerRadius={Math.min(node.width, node.height) / 2} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
  return <Rect {...common} cornerRadius={node.cornerRadius} fill={node.fill ?? undefined} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} />;
}

function PublicImage(props: Record<string, unknown> & { url?: string }) {
  const [image, setImage] = useState<HTMLImageElement>();
  useEffect(() => { if (!props.url) return; const image = new window.Image(); image.crossOrigin = "anonymous"; image.onload = () => setImage(image); image.src = props.url; }, [props.url]);
  return <KonvaImage {...props} image={image} />;
}

function iconGlyph(key: string): string { return ({ star: "★", heart: "♥", coffee: "☕", leaf: "❧", check: "✓", circle: "●", arrow: "➜" } as Record<string, string>)[key] ?? "✦"; }
