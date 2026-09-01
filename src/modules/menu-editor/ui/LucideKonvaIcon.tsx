"use client";

import { useEffect, useState } from "react";
import { Circle, Ellipse, Group, Line, Path, Rect } from "react-konva";
import type Konva from "konva";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { IconNode } from "lucide-react";
import { canonicalizeLucideIconKey } from "../domain/lucide-icon-catalog";

type IconPart = IconNode[number];
type KonvaNodeProps = Record<string, unknown>;

const iconNodeCache = new Map<string, IconNode>();
const iconNodePromises = new Map<string, Promise<IconNode>>();

export function LucideKonvaIcon({ iconKey, color, strokeWidth, nodeProps }: { iconKey: string; color: string; strokeWidth: number; nodeProps: KonvaNodeProps }) {
  const canonicalKey = canonicalizeLucideIconKey(iconKey);
  const iconNode = useLucideIconNode(canonicalKey);
  const width = numberValue(nodeProps.width, 80);
  const height = numberValue(nodeProps.height, 80);
  const iconSize = Math.min(width, height);
  const offsetX = (width - iconSize) / 2;
  const offsetY = (height - iconSize) / 2;
  const iconScale = iconSize / 24;

  return (
    <Group {...(nodeProps as Konva.GroupConfig)}>
      <Rect width={width} height={height} fill="#000000" opacity={0.001} listening />
      {iconNode && (
        <Group x={offsetX} y={offsetY} scaleX={iconScale} scaleY={iconScale} listening={false}>
          {iconNode.map((part, index) => renderIconPart(part, index, color, strokeWidth))}
        </Group>
      )}
    </Group>
  );
}

function useLucideIconNode(iconKey: string): IconNode | null {
  const [iconNode, setIconNode] = useState<IconNode | null>(() => iconNodeCache.get(iconKey) ?? null);

  useEffect(() => {
    let mounted = true;
    const cached = iconNodeCache.get(iconKey);
    if (cached) {
      return () => { mounted = false; };
    }
    const loader = dynamicIconImports[iconKey as keyof typeof dynamicIconImports] ?? dynamicIconImports.sparkles;
    const promise = iconNodePromises.get(iconKey) ?? loader().then((module) => module.__iconNode);
    iconNodePromises.set(iconKey, promise);
    void promise.then((loaded) => {
      iconNodeCache.set(iconKey, loaded);
      if (mounted) setIconNode(loaded);
    });
    return () => { mounted = false; };
  }, [iconKey]);

  return iconNode;
}

function renderIconPart(part: IconPart, index: number, color: string, strokeWidth: number) {
  const [element, attrs] = part;
  const key = `${element}-${attrs.key ?? index}`;
  const fill = attrs.fill === "currentColor" ? color : attrs.fill && attrs.fill !== "none" ? attrs.fill : "transparent";
  const stroke = attrs.stroke === "none" ? undefined : attrs.stroke ?? color;
  const shared = { fill, stroke, strokeWidth, lineCap: "round" as const, lineJoin: "round" as const };

  if (element === "path") return <Path key={key} {...shared} data={attrs.d ?? ""} />;
  if (element === "circle") return <Circle key={key} {...shared} x={numberValue(attrs.cx)} y={numberValue(attrs.cy)} radius={numberValue(attrs.r)} />;
  if (element === "ellipse") return <Ellipse key={key} {...shared} x={numberValue(attrs.cx)} y={numberValue(attrs.cy)} radiusX={numberValue(attrs.rx)} radiusY={numberValue(attrs.ry)} />;
  if (element === "line") return <Line key={key} {...shared} points={[numberValue(attrs.x1), numberValue(attrs.y1), numberValue(attrs.x2), numberValue(attrs.y2)]} />;
  if (element === "polygon" || element === "polyline") return <Line key={key} {...shared} points={parsePoints(attrs.points)} closed={element === "polygon"} />;
  if (element === "rect") return <Rect key={key} {...shared} x={numberValue(attrs.x)} y={numberValue(attrs.y)} width={numberValue(attrs.width)} height={numberValue(attrs.height)} cornerRadius={numberValue(attrs.rx)} />;
  return null;
}

function parsePoints(points: string | undefined): number[] {
  return (points ?? "").trim().split(/[ ,]+/).filter(Boolean).map(Number).filter(Number.isFinite);
}

function numberValue(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}
