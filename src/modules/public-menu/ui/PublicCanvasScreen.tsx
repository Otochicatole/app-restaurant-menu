"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import type { PublicCanvasMenuView } from "../contracts";

const PublicCanvasStage = dynamic(() => import("./PublicCanvasStage").then((module) => module.PublicCanvasStage), { ssr: false });

export function PublicCanvasScreen({ menu }: { menu: PublicCanvasMenuView }) {
  const [accessible, setAccessible] = useState(false);
  const textNodes = menu.document.nodes.filter((node): node is Extract<typeof node, { type: "text" }> => node.type === "text" && node.visible);
  const iconNodes = menu.document.nodes.filter((node): node is Extract<typeof node, { type: "icon" }> => node.type === "icon" && node.visible);
  const accessibleNodes = [...textNodes, ...iconNodes];
  const fontFaces = Object.values(menu.assets).filter((asset) => asset.kind === "FONT").map((asset) => `@font-face{font-family:"editor-font-${asset.id}";src:url("${asset.url}") format("${asset.mimeType.includes("woff2") ? "woff2" : asset.mimeType.includes("woff") ? "woff" : "truetype"}");font-display:swap;}`).join("");
  const displayBackground = menu.document.background.endsWith("00") ? "#f5f7f3" : menu.document.background;
  return <main className="relative h-[100dvh] w-full overflow-hidden" style={{ backgroundColor: displayBackground }}>
    <style dangerouslySetInnerHTML={{ __html: fontFaces }} />
    <PublicCanvasStage document={menu.document} assets={menu.assets} />
    <div className="absolute bottom-4 right-4 z-10 flex gap-2"><button type="button" onClick={() => setAccessible((value) => !value)} className="rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-800 shadow">{accessible ? "Ocultar texto" : "Ver contenido en texto"}</button></div>
    <section className="sr-only" aria-label="Contenido accesible de la carta">{accessibleNodes.map((node) => { const label = node.type === "text" ? node.text : (node.accessibleLabel || node.iconKey.replaceAll("-", " ")); return node.link ? <a key={node.id} href={node.link} aria-label={node.type === "icon" ? label : undefined}>{label}</a> : <p key={node.id} aria-label={node.type === "icon" ? label : undefined}>{label}</p>; })}{Object.values(menu.assets).filter((asset) => asset.kind === "IMAGE").map((asset) => <Image key={asset.id} src={asset.url} alt={asset.name} width={1} height={1} />)}</section>
    {accessible && <section className="absolute inset-x-3 bottom-16 z-20 max-h-[45dvh] overflow-y-auto rounded-xl bg-white p-4 shadow-xl" aria-label="Contenido accesible de la carta">{accessibleNodes.length ? accessibleNodes.map((node) => { const label = node.type === "text" ? node.text : (node.accessibleLabel || node.iconKey.replaceAll("-", " ")); return node.link ? <a key={node.id} href={node.link} className="mb-2 block text-sm text-zinc-800">{label}</a> : <p key={node.id} className="mb-2 text-sm text-zinc-800">{label}</p>; }) : <p className="text-sm text-zinc-500">Esta carta no tiene texto visible.</p>}</section>}
  </main>;
}
