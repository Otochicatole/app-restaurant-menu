"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { Layers3, Redo2, Trash2, Undo2 } from "lucide-react";
import { SYSTEM_FONT_FAMILIES, type CanvasDocumentV1, type CanvasNode, type MenuAssetView, type MenuProjectView } from "../contracts";
import { clampGroupDelta } from "../domain/canvas-geometry";
import { placeNodeInCanvas } from "../domain/node-placement";
import { LayersPanel } from "./LayersPanel";
import { EditorToolsPanel, IconPickerDrawer } from "./EditorToolsPanel";

const KonvaCanvas = dynamic(() => import("./KonvaCanvas").then((module) => module.KonvaCanvas), { ssr: false });

export function CanvasEditor({ project, initialAssets, restaurantName, restaurantSlug }: { project: MenuProjectView; initialAssets: MenuAssetView[]; restaurantName: string; restaurantSlug: string }) {
  const [document, setDocument] = useState(project.document);
  const [revision, setRevision] = useState(project.draftRevision);
  const [publishedRevision, setPublishedRevision] = useState(project.publishedRevision);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [layersOpen, setLayersOpen] = useState(true);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const [history, setHistory] = useState<CanvasDocumentV1[]>([]);
  const [future, setFuture] = useState<CanvasDocumentV1[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Guardado");
  const [conflict, setConflict] = useState(false);
  const [viewport, setViewport] = useState(project.document.initialViewport);

  const assetMap = useMemo(() => Object.fromEntries(assets.map((asset) => [asset.id, asset])), [assets]);
  const fontFaces = useMemo(() => assets.filter((asset) => asset.kind === "FONT").map((asset) => `@font-face{font-family:"editor-font-${asset.id}";src:url("${asset.url}") format("${asset.mimeType.includes("woff2") ? "woff2" : asset.mimeType.includes("woff") ? "woff" : "truetype"}");font-display:swap;}`).join(""), [assets]);
  const selected = document.nodes.find((node) => node.id === selectedIds[0]) ?? null;

  const commitTransform = (transform: (current: CanvasDocumentV1) => CanvasDocumentV1) => {
    setDocument((current) => {
      const next = transform(current);
      setHistory((items) => [...items.slice(-99), current]);
      return next;
    });
    setFuture([]);
    setDirty(true);
    setStatus("Cambios pendientes");
  };
  const commit = (next: CanvasDocumentV1) => commitTransform(() => next);
  const patchNode = (id: string, patch: Partial<CanvasNode>) => commitTransform((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === id ? ({ ...node, ...patch } as CanvasNode) : node) }));
  const patchSelected = (patch: Partial<CanvasNode>) => commitTransform((current) => ({ ...current, nodes: current.nodes.map((node) => selectedIds.includes(node.id) && !node.locked ? ({ ...node, ...patch } as CanvasNode) : node) }));
  const moveSelected = (ids: string[], delta: { x: number; y: number }) => commitTransform((current) => {
    const { x: dx, y: dy } = clampGroupDelta(current.nodes, ids, current.canvasBounds, delta);
    return { ...current, nodes: current.nodes.map((node) => ids.includes(node.id) && !node.locked ? ({ ...node, x: node.x + dx, y: node.y + dy } as CanvasNode) : node) };
  });
  const setCanvasSize = (dimension: "width" | "height", value: number) => { const nextValue = Math.max(100, Math.min(100_000, value || 100)); commitTransform((current) => ({ ...current, canvasBounds: { ...current.canvasBounds, [dimension]: nextValue } })); };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture((items) => [...items, document]); setHistory((items) => items.slice(0, -1)); setDocument(previous); setDirty(true); setStatus("Cambios pendientes"); };
  const redo = () => { const next = future.at(-1); if (!next) return; setHistory((items) => [...items, document]); setFuture((items) => items.slice(0, -1)); setDocument(next); setDirty(true); setStatus("Cambios pendientes"); };

  useEffect(() => {
    if (!dirty || saving || conflict) return;
    const timer = window.setTimeout(async () => {
      setSaving(true); setStatus("Guardando...");
      try {
        const response = await fetch("/api/editor/project", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision: revision, document }) });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          if (response.status === 409) setConflict(true);
          throw new Error(payload.error?.message ?? "No se pudo guardar");
        }
        setRevision(payload.data.draftRevision); setDirty(false); setStatus("Guardado");
      } catch (error) { setStatus(error instanceof Error ? error.message : "No se pudo guardar"); }
      finally { setSaving(false); }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [dirty, document, revision, saving, conflict]);

  const reloadServerVersion = async () => {
    const response = await fetch("/api/editor/project");
    const payload = await response.json();
    if (!response.ok || !payload.success) return;
    setDocument(payload.data.document); setRevision(payload.data.draftRevision); setPublishedRevision(payload.data.publishedRevision); setHistory([]); setFuture([]); setDirty(false); setConflict(false); setStatus("Versión del servidor cargada");
  };
  const overwriteServerVersion = async () => {
    const response = await fetch("/api/editor/project");
    const payload = await response.json();
    if (!response.ok || !payload.success || !window.confirm("Esto reemplaza el borrador del servidor con tu trabajo local. ¿Continuar?")) return;
    const save = await fetch("/api/editor/project", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision: payload.data.draftRevision, document }) });
    const saved = await save.json();
    if (save.ok && saved.success) { setRevision(saved.data.draftRevision); setDirty(false); setConflict(false); setStatus("Guardado"); }
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches("input, textarea, select")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length) { event.preventDefault(); commit({ ...document, nodes: document.nodes.filter((node) => !selectedIds.includes(node.id) || node.locked) }); setSelectedIds((ids) => ids.filter((id) => document.nodes.find((node) => node.id === id)?.locked)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const addNode = (node: CanvasNode) => { commitTransform((current) => ({ ...current, nodes: [...current.nodes, node] })); setSelectedIds([node.id]); };
  const newNodeFrame = (preferredWidth: number, preferredHeight: number) => placeNodeInCanvas(document.canvasBounds, viewport, preferredWidth, preferredHeight);
  const duplicate = () => { if (!selected || selected.locked) return; const bounds = document.canvasBounds; addNode({ ...selected, id: crypto.randomUUID(), x: Math.max(bounds.x, Math.min(bounds.x + bounds.width - selected.width, selected.x + 24)), y: Math.max(bounds.y, Math.min(bounds.y + bounds.height - selected.height, selected.y + 24)) }); };
  const moveLayer = (delta: number) => { if (!selectedIds.length) return; const index = document.nodes.findIndex((node) => node.id === selectedIds[0]); const nextIndex = Math.max(0, Math.min(document.nodes.length - 1, index + delta)); if (index < 0 || index === nextIndex) return; const nodes = [...document.nodes]; const [node] = nodes.splice(index, 1); nodes.splice(nextIndex, 0, node); commit({ ...document, nodes }); };
  const reorderLayer = (activeId: string, overId: string) => {
    const activeIndex = document.nodes.findIndex((node) => node.id === activeId);
    const overIndex = document.nodes.findIndex((node) => node.id === overId);
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return;
    commit({ ...document, nodes: arrayMove(document.nodes, activeIndex, overIndex) });
  };
  const deleteSelected = () => { if (!selectedIds.length) return; commit({ ...document, nodes: document.nodes.filter((node) => !selectedIds.includes(node.id) || node.locked) }); setSelectedIds((ids) => ids.filter((id) => document.nodes.find((node) => node.id === id)?.locked)); };
  const addText = () => addNode({ id: crypto.randomUUID(), type: "text", ...newNodeFrame(360, 80), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, text: "Nuevo texto", fontAssetId: null, fontSize: 42, fontWeight: "600", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "middle", lineHeight: 1.2, letterSpacing: 0, fill: "#171717", semanticRole: "paragraph" });
  const addShape = (shape: "rect" | "ellipse" | "line" | "arrow" | "triangle" | "star") => addNode({ id: crypto.randomUUID(), type: "shape", shape, ...newNodeFrame(260, 160), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, fill: "#3A4824", stroke: null, strokeWidth: 0, cornerRadius: 18 });
  const addIcon = (iconKey: string) => addNode({ id: crypto.randomUUID(), type: "icon", iconKey, accessibleLabel: iconKey.replaceAll("-", " "), ...newNodeFrame(80, 80), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, fill: "#B8790A", strokeWidth: 2 });
  const addImage = (asset: MenuAssetView) => addNode({ id: crypto.randomUUID(), type: "image", assetId: asset.id, ...newNodeFrame(280, 180), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, fit: "contain", cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, cornerRadius: 12, alt: asset.name });
  const uploadAsset = async (kind: "IMAGE" | "FONT", file: File) => { const form = new FormData(); form.set("kind", kind); form.set("file", file); if (kind === "FONT") form.set("name", file.name.replace(/\.[^.]+$/, "")); const response = await fetch("/api/editor/assets", { method: "POST", body: form }); const payload = await response.json(); if (response.ok && payload.success) setAssets((items) => [payload.data, ...items]); };
  const publish = async () => {
    if (dirty || saving) return;
    setStatus("Publicando...");
    const response = await fetch("/api/editor/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision: revision }) });
    const payload = await response.json();
    if (response.ok && payload.success) { setPublishedRevision(payload.data.publishedRevision); setStatus("Publicado"); } else setStatus(payload.error?.message ?? "No se pudo publicar");
  };

  return <>
    <div className="flex min-h-[70dvh] flex-col justify-center gap-4 p-6 md:hidden">
      <h1 className="text-2xl font-semibold">Editor de carta</h1>
      <p className="text-sm leading-6 text-zinc-600">Para diseñar con precisión necesitás una pantalla más grande. Desde acá podés abrir la configuración o ver la carta pública.</p>
      <div className="flex flex-wrap gap-2"><a className="rounded-lg bg-emerald-950 px-4 py-2 text-sm font-semibold text-white" href="/admin/settings">Configuración</a><a className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold" href={`/m/${encodeURIComponent(restaurantSlug)}`} target="_blank">Ver carta pública</a></div>
    </div>
    <div className="fixed inset-y-0 right-0 hidden flex-col border-l border-zinc-200 bg-zinc-100 text-zinc-900 md:flex" style={{ left: "var(--admin-nav-width, 0px)" }}>
      <style dangerouslySetInnerHTML={{ __html: fontFaces }} />
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 shadow-sm backdrop-blur">
      <div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-white"><Layers3 size={17} /></div><div className="flex min-w-0 items-center gap-3"><h1 className="sr-only">Resumen del menú</h1><p className="truncate text-sm font-semibold text-zinc-900">Editor de {restaurantName}</p><span className="hidden rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-500 sm:inline-flex">{status}</span></div></div>
      <div className="flex shrink-0 items-center gap-1.5"><button className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" onClick={undo} disabled={!history.length} aria-label="Deshacer"><Undo2 size={16} /></button><button className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" onClick={redo} disabled={!future.length} aria-label="Rehacer"><Redo2 size={16} /></button><button className="hidden rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 sm:block" onClick={() => commit({ ...document, initialViewport: viewport })}>Guardar vista inicial</button>{conflict && <><button className="rounded-lg border border-amber-300 px-2 py-1.5 text-[11px] text-amber-800" onClick={reloadServerVersion}>Cargar servidor</button><button className="rounded-lg border border-red-300 px-2 py-1.5 text-[11px] text-red-800" onClick={overwriteServerVersion}>Sobrescribir</button></>}<button className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-40" onClick={publish} disabled={dirty || saving || conflict || publishedRevision === revision}>Publicar</button></div>
    </header>
    <div className="flex min-h-0 flex-1">
      <EditorToolsPanel background={document.background} images={assets.filter((asset) => asset.kind === "IMAGE")} layersOpen={layersOpen} onToggleLayers={() => { setIconsOpen(false); setLayersOpen((open) => !open); }} onOpenIcons={(open) => { setIconsOpen(open); if (open) setLayersOpen(true); }} onBackgroundChange={(value) => commit({ ...document, background: value })} onAddText={addText} onAddShape={addShape} onAddImage={addImage} onUpload={uploadAsset} />
      {layersOpen && (iconsOpen ? <IconPickerDrawer onClose={() => setIconsOpen(false)} onSelect={addIcon} /> : <LayersPanel nodes={document.nodes} selectedIds={selectedIds} onReorder={reorderLayer} onSelect={(id, additive) => setSelectedIds((ids) => additive ? ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] : [id])} />)}
      <main className="relative min-w-0 flex-1"><KonvaCanvas document={document} assets={assetMap} selectedIds={selectedIds} onSelect={(id, additive) => setSelectedIds((ids) => !id ? [] : additive ? ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] : [id])} onSelectMany={(ids) => setSelectedIds(ids.filter((id) => !document.nodes.find((node) => node.id === id)?.locked))} onChange={patchNode} onChangeMany={moveSelected} viewport={viewport} onViewportChange={setViewport} /></main>
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-zinc-200 bg-white p-4"><Inspector node={selected} selectedCount={selectedIds.length} document={document} assets={assets} onCanvasSizeChange={setCanvasSize} onChange={(patch) => selected && (!selected.locked || Object.keys(patch).every((key) => key === "locked")) && patchNode(selected.id, patch)} onChangeSelected={patchSelected} onDuplicate={duplicate} onMoveLayer={moveLayer} onDelete={deleteSelected} />{selected?.type === "icon" && <IconInspector node={selected} onChange={(patch) => (!selected.locked || Object.keys(patch).every((key) => key === "locked")) && patchNode(selected.id, patch)} />}</aside>
    </div>
    </div>
  </>;
}

function Inspector({ node, selectedCount, document, assets, onCanvasSizeChange, onChange, onChangeSelected, onDuplicate, onMoveLayer, onDelete }: { node: CanvasNode | null; selectedCount: number; document: CanvasDocumentV1; assets: MenuAssetView[]; onCanvasSizeChange: (dimension: "width" | "height", value: number) => void; onChange: (patch: Partial<CanvasNode>) => void; onChangeSelected: (patch: Partial<CanvasNode>) => void; onDuplicate: () => void; onMoveLayer: (delta: number) => void; onDelete: () => void }) {
  if (!node) return <div className="space-y-5"><div><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Lienzo</p><p className="mt-1 text-sm font-semibold">Tamaño de la carta pública</p><p className="mt-1 text-xs leading-5 text-zinc-500">Define el área real de la hoja. La vista inicial se guarda por separado.</p></div><div className="grid grid-cols-2 gap-2"><NumberField label="Ancho" value={document.canvasBounds.width} onChange={(value) => onCanvasSizeChange("width", value)} /><NumberField label="Alto" value={document.canvasBounds.height} onChange={(value) => onCanvasSizeChange("height", value)} /></div><div className="flex flex-wrap gap-2"><button className="rounded border border-zinc-200 px-2 py-1.5 text-xs" onClick={() => { onCanvasSizeChange("width", 1080); onCanvasSizeChange("height", 1920); }}>Vertical</button><button className="rounded border border-zinc-200 px-2 py-1.5 text-xs" onClick={() => { onCanvasSizeChange("width", 1920); onCanvasSizeChange("height", 1080); }}>Horizontal</button><button className="rounded border border-zinc-200 px-2 py-1.5 text-xs" onClick={() => { onCanvasSizeChange("width", 1080); onCanvasSizeChange("height", 1080); }}>Cuadrado</button></div></div>;
  if (selectedCount > 1) return <div className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Selección múltiple</p><p className="mt-1 text-sm font-semibold">{selectedCount} objetos seleccionados</p></div><p className="text-xs leading-5 text-zinc-500">Las propiedades aplicadas se actualizan en todos los objetos seleccionados.</p><div className="grid grid-cols-2 gap-2"><NumberField label="Ancho" value={node.width} onChange={(value) => onChangeSelected({ width: value })} /><NumberField label="Alto" value={node.height} onChange={(value) => onChangeSelected({ height: value })} /></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={node.locked} onChange={(event) => onChangeSelected({ locked: event.target.checked })} /> Bloquear selección</label><label className="block text-xs font-medium">Enlace<input className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" type="url" placeholder="https://..." value={node.link ?? ""} onChange={(event) => onChangeSelected({ link: event.target.value || null })} /></label><button className="flex w-full items-center justify-center gap-2 rounded border border-red-200 px-3 py-2 text-xs text-red-700" onClick={onDelete}><Trash2 size={14} /> Eliminar selección</button></div>;
  return <div className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Propiedades</p><p className="mt-1 text-sm font-semibold">{node.type === "text" ? "Texto" : node.type === "image" ? "Imagen" : node.type === "shape" ? node.shape : "Icono"}</p></div><div className="grid grid-cols-2 gap-2"><NumberField label="X" value={node.x} onChange={(value) => onChange({ x: value })} /><NumberField label="Y" value={node.y} onChange={(value) => onChange({ y: value })} /><NumberField label="Ancho" value={node.width} onChange={(value) => onChange({ width: value })} /><NumberField label="Alto" value={node.height} onChange={(value) => onChange({ height: value })} /></div><div className="flex gap-2"><button className="flex-1 rounded border border-zinc-200 px-2 py-1.5 text-xs" onClick={() => onMoveLayer(1)}>Subir capa</button><button className="flex-1 rounded border border-zinc-200 px-2 py-1.5 text-xs" onClick={() => onMoveLayer(-1)}>Bajar capa</button></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={node.locked} onChange={(event) => onChange({ locked: event.target.checked })} /> Bloquear objeto</label>{node.type === "text" && <><label className="block text-xs font-medium">Contenido<textarea className="mt-1 min-h-24 w-full rounded-lg border border-zinc-200 p-2 text-sm" value={node.text} onChange={(event) => onChange({ text: event.target.value })} /></label><NumberField label="Tamaño" value={node.fontSize} onChange={(value) => onChange({ fontSize: value })} /><label className="block text-xs font-medium">Fuente<select className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" value={node.fontAssetId ? `asset:${node.fontAssetId}` : `system:${node.fontFamily ?? "Arial"}`} onChange={(event) => { const value = event.target.value; onChange(value.startsWith("asset:") ? { fontAssetId: value.slice(6), fontFamily: undefined } : { fontAssetId: null, fontFamily: value.slice(7) as typeof SYSTEM_FONT_FAMILIES[number] }); }}><optgroup label="Fuentes del sistema">{SYSTEM_FONT_FAMILIES.map((family) => <option key={family} value={`system:${family}`} style={{ fontFamily: family }}>{family}</option>)}</optgroup><optgroup label="Fuentes subidas">{assets.filter((asset) => asset.kind === "FONT").map((asset) => <option key={asset.id} value={`asset:${asset.id}`}>{asset.name}</option>)}</optgroup></select></label><label className="block text-xs font-medium">Enlace<input className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" type="url" placeholder="https://..." value={node.link ?? ""} onChange={(event) => onChange({ link: event.target.value || null })} /></label><label className="block text-xs font-medium">Color<input className="mt-1 h-9 w-full rounded border border-zinc-200" type="color" value={node.fill} onChange={(event) => onChange({ fill: event.target.value })} /></label></>}{node.type === "shape" && <label className="block text-xs font-medium">Color<input className="mt-1 h-9 w-full rounded border border-zinc-200" type="color" value={node.fill ?? "#3A4824"} onChange={(event) => onChange({ fill: event.target.value })} /></label>}{node.type === "image" && <label className="block text-xs font-medium">Ajuste<select className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" value={node.fit} onChange={(event) => onChange({ fit: event.target.value as "contain" | "cover" | "stretch" })}><option value="contain">Contener</option><option value="cover">Cubrir</option><option value="stretch">Estirar</option></select></label>}<div className="flex gap-2"><button className="flex-1 rounded border border-emerald-200 px-2 py-1.5 text-xs text-emerald-800" onClick={onDuplicate}>Duplicar</button><button className="flex-1 rounded border border-red-200 px-2 py-1.5 text-xs text-red-700" onClick={onDelete}><Trash2 size={14} className="mr-1 inline" /> Eliminar</button></div></div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="text-xs font-medium">{label}<input className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" type="number" value={Math.round(value * 100) / 100} onChange={(event) => onChange(Number(event.target.value) || 0)} /></label>; }

function IconInspector({ node, onChange }: { node: Extract<CanvasNode, { type: "icon" }>; onChange: (patch: Partial<CanvasNode>) => void }) {
  return <div className="mt-5 space-y-3 border-t border-zinc-200 pt-4"><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Estilo del icono</p><label className="block text-xs font-medium">Nombre accesible<input className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" value={node.accessibleLabel} onChange={(event) => onChange({ accessibleLabel: event.target.value })} /></label><label className="block text-xs font-medium">Color<input className="mt-1 h-9 w-full rounded border border-zinc-200" type="color" value={node.fill} onChange={(event) => onChange({ fill: event.target.value })} /></label><NumberField label="Grosor del trazo" value={node.strokeWidth} onChange={(value) => onChange({ strokeWidth: value })} /><label className="block text-xs font-medium">Enlace<input className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" type="url" placeholder="https://..." value={node.link ?? ""} onChange={(event) => onChange({ link: event.target.value || null })} /></label></div>;
}
