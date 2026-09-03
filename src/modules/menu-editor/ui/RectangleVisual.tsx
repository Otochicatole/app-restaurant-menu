"use client";

import { useEffect, useState } from "react";
import { Group, Image as KonvaImage, Path, Rect } from "react-konva";
import type { CanvasShapeNode } from "../contracts";
import { drawRectanglePath, rectangleBorderGeometryForNode, rectanglePathToSvg } from "../domain/rectangle-border";
import { backgroundImagePlacement, gradientColorStops, gradientEndpoints } from "../domain/rectangle-fill";

export type RectangleVisualAsset = { url: string; width?: number | null; height?: number | null };

export function RectangleVisual({ node, backgroundAsset, nodeProps = {} }: { node: CanvasShapeNode; backgroundAsset?: RectangleVisualAsset; nodeProps?: Record<string, unknown> }) {
  const image = useLoadedImage(node.backgroundImage && backgroundAsset?.url ? backgroundAsset.url : undefined);
  const geometry = rectangleBorderGeometryForNode(node);
  const imageConfig = node.backgroundImage && image ? backgroundImagePlacement(node.width, node.height, image.naturalWidth, image.naturalHeight, node.backgroundImage) : null;
  const gradient = node.fillGradient;
  const endpoints = gradient ? gradientEndpoints(node.width, node.height, gradient.angle) : null;
  const fillData = rectanglePathToSvg(geometry.fillPath);
  return <Group {...nodeProps} width={node.width} height={node.height}>
    <Path data={fillData} fill={node.fill ?? "transparent"} listening={false} />
    {image && imageConfig && <Group listening={false} clipFunc={(context) => { drawRectanglePath(context, geometry.fillPath); context.clip(); }}>
      <KonvaImage image={image} x={imageConfig.x} y={imageConfig.y} width={imageConfig.width} height={imageConfig.height} opacity={node.backgroundImage?.opacity ?? 1} listening={false} />
    </Group>}
    {gradient && endpoints && <Path data={fillData} listening={false} fillLinearGradientStartPoint={endpoints.start} fillLinearGradientEndPoint={endpoints.end} fillLinearGradientColorStops={gradientColorStops(gradient)} />}
    {node.stroke && node.strokeWidth > 0 && geometry.borderPaths.map((path, index) => <Path key={index} data={rectanglePathToSvg(path)} listening={false} stroke={node.stroke ?? undefined} strokeWidth={node.strokeWidth} lineCap="butt" lineJoin="round" />)}
    <Rect x={0} y={0} width={node.width} height={node.height} fill="#000000" opacity={0.001} listening={Boolean(nodeProps.listening)} />
  </Group>;
}

function useLoadedImage(url?: string): HTMLImageElement | undefined {
  const [loaded, setLoaded] = useState<{ url: string; image: HTMLImageElement } | null>(null);
  useEffect(() => {
    if (!url) return;
    const nextImage = new window.Image();
    nextImage.crossOrigin = "anonymous";
    nextImage.onload = () => setLoaded({ url, image: nextImage });
    nextImage.src = url;
    return () => { nextImage.onload = null; };
  }, [url]);
  if (!url || loaded?.url !== url) return undefined;
  return loaded.image;
}
