"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ArrowUp, Circle, ImagePlus, Layers3, Redo2, Square, Star, Trash2, Type, Undo2, Upload } from "lucide-react";
import type { CanvasDocumentV1, CanvasNode, MenuAssetView, MenuProjectView } from "../contracts";

const KonvaCanvas = dynamic(() => import("./KonvaCanvas").then((module) => module.KonvaCanvas), { ssr: false });

export function CanvasEditor({ project, initialAssets, restaurantName, restaurantSlug }: { project: MenuProjectView; initialAssets: MenuAssetView[]; restaurantName: string; restaurantSlug: string }) {
  const [document, setDocument] = useState(project.document);
  const [revision, setRevision] = useState(project.draftRevision);
  const [publishedRevision, setPublishedRevision] = useState(project.publishedRevision);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [layersOpen, setLayersOpen] = useState(true);
  const [assets, setAssets] = useState(initialAssets);
  const [history, setHistory] = useState<CanvasDocumentV1[]>([]);
  const [future, setFuture] = useState<CanvasDocumentV1[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Guardado");
  const [conflict, setConflict] = useState(false);
  const [viewport, setViewport] = useState(project.document.initialViewport);

  const assetMap = useMemo(() => Object.fromEntries(assets.map((asset) => [asset.id, asset])), [assets]);
  const fontFaces = useMemo(() => assets.filter((asset) => asset.kind === "FONT").map((asset) => `@font-face{font-family:"editor-font-${asset.id}";src:url("${asset.url}") format("${asset.mimeType === "font/woff2" ? "woff2" : asset.mimeType === "font/woff" ? "woff" : "truetype"}");font-display:swap;}`).join(""), [assets]);
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
  const patchSelected = (patch: Partial<CanvasNode>) => commitTransform((current) => ({ ...current, nodes: current.nodes.map((node) => selectedIds.includes(node.id) ? ({ ...node, ...patch } as CanvasNode) : node) }));
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
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length) { event.preventDefault(); commit({ ...document, nodes: document.nodes.filter((node) => !selectedIds.includes(node.id)) }); setSelectedIds([]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const addNode = (node: CanvasNode) => { commit({ ...document, nodes: [...document.nodes, node] }); setSelectedIds([node.id]); };
  const duplicate = () => { if (!selected) return; addNode({ ...selected, id: crypto.randomUUID(), x: selected.x + 24, y: selected.y + 24 }); };
  const moveLayer = (delta: number) => { if (!selectedIds.length) return; const index = document.nodes.findIndex((node) => node.id === selectedIds[0]); const nextIndex = Math.max(0, Math.min(document.nodes.length - 1, index + delta)); if (index < 0 || index === nextIndex) return; const nodes = [...document.nodes]; const [node] = nodes.splice(index, 1); nodes.splice(nextIndex, 0, node); commit({ ...document, nodes }); };
  const deleteSelected = () => { if (!selectedIds.length) return; commit({ ...document, nodes: document.nodes.filter((node) => !selectedIds.includes(node.id)) }); setSelectedIds([]); };
  const addText = () => addNode({ id: crypto.randomUUID(), type: "text", x: viewport.x + 120, y: viewport.y + 120, width: 360, height: 80, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, text: "Nuevo texto", fontAssetId: null, fontSize: 42, fontWeight: "600", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "middle", lineHeight: 1.2, letterSpacing: 0, fill: "#171717", semanticRole: "paragraph" });
  const addShape = (shape: "rect" | "ellipse" | "line" | "arrow" | "triangle" | "star") => addNode({ id: crypto.randomUUID(), type: "shape", shape, x: viewport.x + 160, y: viewport.y + 160, width: 260, height: 160, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, fill: "#3A4824", stroke: null, strokeWidth: 0, cornerRadius: 18 });
  const addIcon = () => addNode({ id: crypto.randomUUID(), type: "icon", iconKey: "star", x: viewport.x + 180, y: viewport.y + 180, width: 80, height: 80, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, fill: "#B8790A", strokeWidth: 2 });
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
    <div className="fixed inset-0 hidden flex-col bg-zinc-100 text-zinc-900 md:flex lg:left-72">
      <style dangerouslySetInnerHTML={{ __html: fontFaces }} />
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white/95 px-4 shadow-sm backdrop-blur">
      <div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-white"><Layers3 size={17} /></div><div className="flex min-w-0 items-center gap-3"><h1 className="sr-only">Resumen del menú</h1><p className="truncate text-sm font-semibold text-zinc-900">Editor de {restaurantName}</p><span className="hidden rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-500 sm:inline-flex">{status}</span></div></div>
      <div className="flex shrink-0 items-center gap-1.5"><button className="rounded-lg border border-zinc-200 px-2.5 py-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50" onClick={() => setLayersOpen((open) => !open)} aria-expanded={layersOpen} aria-controls="editor-layers"><Layers3 size={14} className="mr-1 inline" />{layersOpen ? "Ocultar capas" : "Mostrar capas"}</button><button className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" onClick={undo} disabled={!history.length} aria-label="Deshacer"><Undo2 size={16} /></button><button className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" onClick={redo} disabled={!future.length} aria-label="Rehacer"><Redo2 size={16} /></button><button className="hidden rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 sm:block" onClick={() => commit({ ...document, initialViewport: viewport })}>Guardar vista inicial</button>{conflict && <><button className="rounded-lg border border-amber-300 px-2 py-1.5 text-[11px] text-amber-800" onClick={reloadServerVersion}>Cargar servidor</button><button className="rounded-lg border border-red-300 px-2 py-1.5 text-[11px] text-red-800" onClick={overwriteServerVersion}>Sobrescribir</button></>}<button className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-40" onClick={publish} disabled={dirty || saving || conflict || publishedRevision === revision}>Publicar</button></div>
    </header>
    <div className="flex min-h-0 flex-1">
      <aside className="w-56 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3">
        <label className="mb-4 flex items-center justify-between rounded-lg bg-zinc-50 px-2 py-2 text-xs font-medium">Fondo<input className="h-7 w-10 rounded border border-zinc-200" type="color" value={document.background} onChange={(event) => commit({ ...document, background: event.target.value })} /></label>
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Agregar</p>
        <div className="grid grid-cols-2 gap-2"><ToolButton icon={<Type size={16} />} label="Texto" onClick={addText} /><ToolButton icon={<Square size={16} />} label="Rectángulo" onClick={() => addShape("rect")} /><ToolButton icon={<Circle size={16} />} label="Elipse" onClick={() => addShape("ellipse")} /><ToolButton icon={<ArrowUp size={16} />} label="Línea" onClick={() => addShape("line")} /><ToolButton icon={<ArrowUp size={16} />} label="Flecha" onClick={() => addShape("arrow")} /><ToolButton icon={<Star size={16} />} label="Estrella" onClick={() => addShape("star")} /><ToolButton icon={<Star size={16} />} label="Triángulo" onClick={() => addShape("triangle")} /><ToolButton icon={<Star size={16} />} label="Icono" onClick={addIcon} /></div>
        <p className="mb-2 mt-6 px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Imágenes</p>
        <div className="space-y-2">{assets.filter((asset) => asset.kind === "IMAGE").map((asset) => <button key={asset.id} className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 p-2 text-left text-xs hover:border-emerald-400" onClick={() => addNode({ id: crypto.randomUUID(), type: "image", assetId: asset.id, x: viewport.x + 100, y: viewport.y + 100, width: 280, height: 180, rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, fit: "contain", cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, cornerRadius: 12, alt: asset.name })}><ImagePlus size={15} /><span className="truncate">{asset.name}</span></button>)}</div>
        <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:border-emerald-500"><Upload size={14} /> Subir imagen<input className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const form = new FormData(); form.set("kind", "IMAGE"); form.set("file", file); const response = await fetch("/api/editor/assets", { method: "POST", body: form }); const payload = await response.json(); if (response.ok && payload.success) { setAssets((items) => [payload.data, ...items]); } }} /></label>
      </aside>
      {layersOpen && <aside id="editor-layers" className="w-64 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3 shadow-sm"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Capas</p><button type="button" className="text-xs text-zinc-500 hover:text-zinc-900" onClick={() => setLayersOpen(false)}>Cerrar</button></div><div className="space-y-1">{[...document.nodes].reverse().map((node) => <button key={node.id} type="button" className={`flex w-full items-center rounded px-2 py-1.5 text-left text-xs ${selectedIds.includes(node.id) ? "bg-emerald-100 text-emerald-900" : "hover:bg-zinc-100"}`} onClick={(event) => setSelectedIds((ids) => event.shiftKey ? ids.includes(node.id) ? ids.filter((id) => id !== node.id) : [...ids, node.id] : [node.id])}><span className="truncate">{node.type === "text" ? node.text : node.type === "image" ? "Imagen" : node.type === "shape" ? node.shape : node.iconKey}</span><span className="ml-auto text-[10px] text-zinc-400">{node.locked ? "Bloq." : ""}</span></button>)}</div></aside>}
      <main className="relative min-w-0 flex-1"><KonvaCanvas document={document} assets={assetMap} selectedIds={selectedIds} onSelect={(id, additive) => setSelectedIds((ids) => !id ? [] : additive ? ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] : [id])} onSelectMany={setSelectedIds} onChange={patchNode} viewport={viewport} onViewportChange={setViewport} /></main>
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-zinc-200 bg-white p-4"><Inspector node={selected} selectedCount={selectedIds.length} assets={assets} onChange={(patch) => selected && patchNode(selected.id, patch)} onChangeSelected={patchSelected} onDuplicate={duplicate} onMoveLayer={moveLayer} onDelete={deleteSelected} /></aside>
    </div>
    </div>
  </>;
}

function ToolButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className="flex flex-col items-center gap-1 rounded-lg border border-zinc-200 px-2 py-3 text-[11px] hover:border-emerald-400 hover:bg-emerald-50">{icon}<span>{label}</span></button>; }

function Inspector({ node, selectedCount, assets, onChange, onChangeSelected, onDuplicate, onMoveLayer, onDelete }: { node: CanvasNode | null; selectedCount: number; assets: MenuAssetView[]; onChange: (patch: Partial<CanvasNode>) => void; onChangeSelected: (patch: Partial<CanvasNode>) => void; onDuplicate: () => void; onMoveLayer: (delta: number) => void; onDelete: () => void }) {
  if (!node) return <div className="flex h-full flex-col items-center justify-center text-center text-sm text-zinc-400"><p>Seleccioná un objeto</p><p className="mt-1 text-xs">Sus propiedades aparecerán aquí.</p></div>;
  if (selectedCount > 1) return <div className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Selección múltiple</p><p className="mt-1 text-sm font-semibold">{selectedCount} objetos seleccionados</p></div><p className="text-xs leading-5 text-zinc-500">Las propiedades aplicadas se actualizan en todos los objetos seleccionados.</p><div className="grid grid-cols-2 gap-2"><NumberField label="Ancho" value={node.width} onChange={(value) => onChangeSelected({ width: value })} /><NumberField label="Alto" value={node.height} onChange={(value) => onChangeSelected({ height: value })} /></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={node.locked} onChange={(event) => onChangeSelected({ locked: event.target.checked })} /> Bloquear selección</label><label className="block text-xs font-medium">Enlace<input className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" type="url" placeholder="https://..." value={node.link ?? ""} onChange={(event) => onChangeSelected({ link: event.target.value || null })} /></label><button className="flex w-full items-center justify-center gap-2 rounded border border-red-200 px-3 py-2 text-xs text-red-700" onClick={onDelete}><Trash2 size={14} /> Eliminar selección</button></div>;
  return <div className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Propiedades</p><p className="mt-1 text-sm font-semibold">{node.type === "text" ? "Texto" : node.type === "image" ? "Imagen" : node.type === "shape" ? node.shape : "Icono"}</p></div><div className="grid grid-cols-2 gap-2"><NumberField label="X" value={node.x} onChange={(value) => onChange({ x: value })} /><NumberField label="Y" value={node.y} onChange={(value) => onChange({ y: value })} /><NumberField label="Ancho" value={node.width} onChange={(value) => onChange({ width: value })} /><NumberField label="Alto" value={node.height} onChange={(value) => onChange({ height: value })} /></div><div className="flex gap-2"><button className="flex-1 rounded border border-zinc-200 px-2 py-1.5 text-xs" onClick={() => onMoveLayer(1)}>Subir capa</button><button className="flex-1 rounded border border-zinc-200 px-2 py-1.5 text-xs" onClick={() => onMoveLayer(-1)}>Bajar capa</button></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={node.locked} onChange={(event) => onChange({ locked: event.target.checked })} /> Bloquear objeto</label>{node.type === "text" && <><label className="block text-xs font-medium">Contenido<textarea className="mt-1 min-h-24 w-full rounded-lg border border-zinc-200 p-2 text-sm" value={node.text} onChange={(event) => onChange({ text: event.target.value })} /></label><NumberField label="Tamaño" value={node.fontSize} onChange={(value) => onChange({ fontSize: value })} /><label className="block text-xs font-medium">Fuente<select className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" value={node.fontAssetId ?? ""} onChange={(event) => onChange({ fontAssetId: event.target.value || null })}><option value="">Sistema</option>{assets.filter((asset) => asset.kind === "FONT").map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label><label className="block text-xs font-medium">Enlace<input className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" type="url" placeholder="https://..." value={node.link ?? ""} onChange={(event) => onChange({ link: event.target.value || null })} /></label><label className="block text-xs font-medium">Color<input className="mt-1 h-9 w-full rounded border border-zinc-200" type="color" value={node.fill} onChange={(event) => onChange({ fill: event.target.value })} /></label></>}{node.type === "shape" && <label className="block text-xs font-medium">Color<input className="mt-1 h-9 w-full rounded border border-zinc-200" type="color" value={node.fill ?? "#3A4824"} onChange={(event) => onChange({ fill: event.target.value })} /></label>}{node.type === "image" && <label className="block text-xs font-medium">Ajuste<select className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" value={node.fit} onChange={(event) => onChange({ fit: event.target.value as "contain" | "cover" | "stretch" })}><option value="contain">Contener</option><option value="cover">Cubrir</option><option value="stretch">Estirar</option></select></label>}<div className="flex gap-2"><button className="flex-1 rounded border border-emerald-200 px-2 py-1.5 text-xs text-emerald-800" onClick={onDuplicate}>Duplicar</button><button className="flex-1 rounded border border-red-200 px-2 py-1.5 text-xs text-red-700" onClick={onDelete}><Trash2 size={14} className="mr-1 inline" /> Eliminar</button></div></div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="text-xs font-medium">{label}<input className="mt-1 w-full rounded border border-zinc-200 px-2 py-1.5 text-xs" type="number" value={Math.round(value * 100) / 100} onChange={(event) => onChange(Number(event.target.value) || 0)} /></label>; }
