"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import type { PublicCanvasAsset, PublicCanvasMenuView } from "../contracts";
import { MediaModal, type MediaModalAsset } from "@/ui/MediaModal";
import { nodeLayerState } from "@/modules/menu-editor/ui";

const PublicCanvasStage = dynamic(() => import("./PublicCanvasStage").then((module) => module.PublicCanvasStage), { ssr: false });

export function PublicCanvasScreen({ menu }: { menu: PublicCanvasMenuView }) {
  const [modalAsset, setModalAsset] = useState<MediaModalAsset | null>(null);
  const textNodes = menu.document.nodes.filter((node): node is Extract<typeof node, { type: "text" }> => node.type === "text" && nodeLayerState(menu.document, node).effectiveVisible);
  const iconNodes = menu.document.nodes.filter((node): node is Extract<typeof node, { type: "icon" }> => node.type === "icon" && nodeLayerState(menu.document, node).effectiveVisible);
  const imageNodes = menu.document.nodes.filter((node): node is Extract<typeof node, { type: "image" }> => node.type === "image" && nodeLayerState(menu.document, node).effectiveVisible);
  const accessibleNodes = [...textNodes, ...iconNodes];
  const fontFaces = Object.values(menu.assets).filter((asset) => asset.kind === "FONT").map((asset) => `@font-face{font-family:"editor-font-${asset.id}";src:url("${asset.url}") format("${asset.mimeType.includes("woff2") ? "woff2" : asset.mimeType.includes("woff") ? "woff" : "truetype"}");font-display:swap;}`).join("");
  const openModal = (asset: MediaModalAsset) => setModalAsset(asset);
  const displayBackground = menu.document.background.endsWith("00") ? "#f5f7f3" : menu.document.background;
  return <main className="relative h-[100dvh] w-full overflow-hidden" style={{ backgroundColor: displayBackground }}>
    <style dangerouslySetInnerHTML={{ __html: fontFaces }} />
    <PublicCanvasStage document={menu.document} assets={menu.assets} onTextModalOpen={openModal} showZoomControls={false} />
    <section className="sr-only" aria-label="Contenido accesible de la carta">{accessibleNodes.map((node) => { const label = node.type === "text" ? node.text : (node.accessibleLabel || node.iconKey.replaceAll("-", " ")); const media = node.type === "text" && node.modalAssetId ? menu.assets[node.modalAssetId] : undefined; if (isMediaAsset(media)) return <button key={node.id} type="button" onClick={() => openModal(media)}>{label}</button>; return node.link ? <a key={node.id} href={node.link} target="_blank" rel="noopener noreferrer" aria-label={node.type === "icon" ? label : undefined}>{label}</a> : <p key={node.id} aria-label={node.type === "icon" ? label : undefined}>{label}</p>; })}{imageNodes.map((node) => { const asset = menu.assets[node.assetId]; return asset?.kind === "IMAGE" ? <Image key={node.id} src={asset.url} alt={node.alt} width={1} height={1} /> : null; })}</section>
    <MediaModal asset={modalAsset} onClose={() => setModalAsset(null)} />
  </main>;
}

function isMediaAsset(asset: PublicCanvasAsset | undefined): asset is MediaModalAsset {
  return Boolean(asset && (asset.kind === "IMAGE" || asset.kind === "VIDEO"));
}
