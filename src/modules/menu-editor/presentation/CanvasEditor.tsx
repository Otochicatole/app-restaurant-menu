"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { Redo2, Trash2, Undo2 } from "lucide-react";
import { SYSTEM_FONT_FAMILIES, type CanvasDocumentV1, type CanvasNode, type MenuAssetView, type MenuProjectView, type MenuTemplateView } from "../contracts";
import { placeNodeInCanvas } from "../domain/node-placement";
import { LayersPanel } from "./LayersPanel";
import { EditorToolsPanel, IconPickerDrawer, ImagePickerDrawer, TemplatePickerDrawer, type CanvasDropItem } from "./EditorToolsPanel";

const KonvaCanvas = dynamic(() => import("./KonvaCanvas").then((module) => module.KonvaCanvas), { ssr: false });

export function CanvasEditor({ project, initialAssets, initialTemplates, restaurantName, restaurantSlug }: { project: MenuProjectView; initialAssets: MenuAssetView[]; initialTemplates: MenuTemplateView[]; restaurantName: string; restaurantSlug: string }) {
  const [document, setDocument] = useState(() => normalizeDocument(project.document));
  const [revision, setRevision] = useState(project.draftRevision);
  const [publishedRevision, setPublishedRevision] = useState(project.publishedRevision);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [layersOpen, setLayersOpen] = useState(true);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const [templates, setTemplates] = useState(initialTemplates);
  const [history, setHistory] = useState<CanvasDocumentV1[]>([]);
  const [future, setFuture] = useState<CanvasDocumentV1[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Guardado");
  const [conflict, setConflict] = useState(false);
  const [viewport, setViewport] = useState(project.document.initialViewport);
  const [modal, setModal] = useState<EditorModalState>(null);
  const [modalName, setModalName] = useState("");
  const [modalDescription, setModalDescription] = useState("");

  const assetMap = useMemo(() => Object.fromEntries(assets.map((asset) => [asset.id, asset])), [assets]);
  const fontFaces = useMemo(() => assets.filter((asset) => asset.kind === "FONT").map((asset) => `@font-face{font-family:"editor-font-${asset.id}";src:url("${asset.url}") format("${asset.mimeType.includes("woff2") ? "woff2" : asset.mimeType.includes("woff") ? "woff" : "truetype"}");font-display:swap;}`).join(""), [assets]);
  const selected = document.nodes.find((node) => node.id === selectedIds[0]) ?? null;

  const commitTransform = (transform: (current: CanvasDocumentV1) => CanvasDocumentV1) => {
    setDocument((current) => {
      const next = normalizeDocument(transform(current));
      setHistory((items) => [...items.slice(-99), current]);
      return next;
    });
    setFuture([]);
    setDirty(true);
    setStatus("Cambios pendientes");
  };
  const commit = (next: CanvasDocumentV1) => commitTransform(() => next);
  const patchNode = (id: string, patch: Partial<CanvasNode>) => commitTransform((current) => ({ ...current, nodes: current.nodes.map((node) => {
    if (node.id !== id) return node;
    const next = { ...node, ...patch } as CanvasNode;
    if (next.type === "text" && ("text" in patch || "width" in patch || "height" in patch || "fontSize" in patch || "lineHeight" in patch || "letterSpacing" in patch)) {
      // A text box may be resized freely, but it must never become shorter than
      // the wrapped content. Keeping the larger value also prevents the last
      // line from being clipped after a Transformer operation.
      next.height = Math.max(finiteOr(next.height, 4), estimateTextHeight(next));
    }
    return next;
  }) }));
  const patchSelected = (patch: Partial<CanvasNode>) => commitTransform((current) => ({ ...current, nodes: current.nodes.map((node) => selectedIds.includes(node.id) && !node.locked ? ({ ...node, ...patch } as CanvasNode) : node) }));
  const moveSelected = (ids: string[], delta: { x: number; y: number }) => commitTransform((current) => ({ ...current, nodes: current.nodes.map((node) => ids.includes(node.id) && !node.locked ? ({ ...node, x: node.x + delta.x, y: node.y + delta.y } as CanvasNode) : node) }));
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
    if (!response.ok || !payload.success) return;
    setModal({ kind: "overwrite", serverRevision: payload.data.draftRevision });
  };
  const confirmOverwrite = async (serverRevision: number) => {
    const save = await fetch("/api/editor/project", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision: serverRevision, document }) });
    const saved = await save.json();
    if (save.ok && saved.success) { setRevision(saved.data.draftRevision); setDirty(false); setConflict(false); setStatus("Guardado"); }
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedIds.length) { event.preventDefault(); commit({ ...document, nodes: document.nodes.filter((node) => !selectedIds.includes(node.id) || node.locked) }); setSelectedIds((ids) => ids.filter((id) => document.nodes.find((node) => node.id === id)?.locked)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const addNode = (node: CanvasNode) => { commitTransform((current) => ({ ...current, nodes: [...current.nodes, node] })); setSelectedIds([node.id]); };
  const newNodeFrame = (preferredWidth: number, preferredHeight: number, point?: { x: number; y: number }) => { const frame = point ? { x: point.x - preferredWidth / 2, y: point.y - preferredHeight / 2, width: preferredWidth, height: preferredHeight } : placeNodeInCanvas(document.canvasBounds, viewport, preferredWidth, preferredHeight); return { x: finiteOr(frame.x, document.canvasBounds.x + document.canvasBounds.width / 2 - preferredWidth / 2), y: finiteOr(frame.y, document.canvasBounds.y + document.canvasBounds.height / 2 - preferredHeight / 2), width: finiteOr(frame.width, preferredWidth), height: finiteOr(frame.height, preferredHeight) }; };
  const duplicate = () => { if (!selected || selected.locked) return; const bounds = document.canvasBounds; addNode({ ...selected, id: crypto.randomUUID(), x: Math.max(bounds.x, Math.min(bounds.x + bounds.width - selected.width, selected.x + 24)), y: Math.max(bounds.y, Math.min(bounds.y + bounds.height - selected.height, selected.y + 24)) }); };
  const moveLayer = (delta: number) => { if (!selectedIds.length) return; const index = document.nodes.findIndex((node) => node.id === selectedIds[0]); const nextIndex = Math.max(0, Math.min(document.nodes.length - 1, index + delta)); if (index < 0 || index === nextIndex) return; const nodes = [...document.nodes]; const [node] = nodes.splice(index, 1); nodes.splice(nextIndex, 0, node); commit({ ...document, nodes }); };
  const reorderLayer = (activeId: string, overId: string) => {
    const activeIndex = document.nodes.findIndex((node) => node.id === activeId);
    const overIndex = document.nodes.findIndex((node) => node.id === overId);
    if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) return;
    commit({ ...document, nodes: arrayMove(document.nodes, activeIndex, overIndex) });
  };
  const deleteSelected = () => { if (!selectedIds.length) return; commit({ ...document, nodes: document.nodes.filter((node) => !selectedIds.includes(node.id) || node.locked) }); setSelectedIds((ids) => ids.filter((id) => document.nodes.find((node) => node.id === id)?.locked)); };
  const addText = (point?: { x: number; y: number }) => addNode({ id: crypto.randomUUID(), type: "text", ...newNodeFrame(360, 80, point), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, text: "Nuevo texto", fontAssetId: null, fontSize: 42, fontWeight: "600", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "middle", lineHeight: 1.2, letterSpacing: 0, fill: "#171717", semanticRole: "paragraph" });
  const addShape = (shape: "rect" | "ellipse" | "line" | "arrow" | "triangle" | "star", point?: { x: number; y: number }) => addNode({ id: crypto.randomUUID(), type: "shape", shape, ...newNodeFrame(260, 160, point), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, fill: "#3A4824", stroke: null, strokeWidth: 0, cornerRadius: 18 });
  const addIcon = (iconKey: string, point?: { x: number; y: number }) => addNode({ id: crypto.randomUUID(), type: "icon", iconKey, accessibleLabel: iconKey.replaceAll("-", " "), ...newNodeFrame(80, 80, point), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, fill: "#B8790A", strokeWidth: 2 });
  const addImage = (asset: MenuAssetView, point?: { x: number; y: number }) => addNode({ id: crypto.randomUUID(), type: "image", assetId: asset.id, ...newNodeFrame(280, 180, point), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, link: null, fit: "contain", cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, cornerRadius: 12, alt: asset.name });
  const handleCanvasDrop = (item: CanvasDropItem, point: { x: number; y: number }) => { if (item.kind === "text") addText(point); if (item.kind === "shape" && item.shape) addShape(item.shape, point); if (item.kind === "icon" && item.iconKey) addIcon(item.iconKey, point); if (item.kind === "image" && item.assetId) { const asset = assets.find((candidate) => candidate.id === item.assetId); if (asset) addImage(asset, point); } };
  const uploadAsset = async (kind: "IMAGE" | "FONT", file: File) => { const form = new FormData(); form.set("kind", kind); form.set("file", file); if (kind === "FONT") form.set("name", file.name.replace(/\.[^.]+$/, "")); const response = await fetch("/api/editor/assets", { method: "POST", body: form }); const payload = await response.json(); if (response.ok && payload.success) setAssets((items) => [payload.data, ...items]); };
  const deleteAsset = async (asset: MenuAssetView) => { const response = await fetch(`/api/editor/assets/${encodeURIComponent(asset.id)}`, { method: "DELETE" }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error?.message ?? "No se pudo eliminar la imagen."); setAssets((items) => items.filter((item) => item.id !== asset.id)); };
  const publish = async () => {
    if (dirty || saving) return;
    setStatus("Publicando...");
    const response = await fetch("/api/editor/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision: revision }) });
    const payload = await response.json();
    if (response.ok && payload.success) { setPublishedRevision(payload.data.publishedRevision); setStatus("Publicado"); } else setStatus(payload.error?.message ?? "No se pudo publicar");
  };
  const applyTemplate = async (template: MenuTemplateView) => {
    if ((dirty || history.length > 0)) { setModal({ kind: "apply", template }); return; }
    await performApplyTemplate(template);
  };
  const performApplyTemplate = async (template: MenuTemplateView) => {
    setStatus("Aplicando plantilla...");
    const response = await fetch(`/api/editor/templates/${encodeURIComponent(template.id)}/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision: revision }) });
    const payload = await response.json();
    if (!response.ok || !payload.success) { setStatus(payload.error?.message ?? "No se pudo aplicar la plantilla"); return; }
    const nextProject = payload.data as MenuProjectView;
    setHistory((items) => [...items.slice(-99), document]); setFuture([]); setDocument(nextProject.document); setRevision(nextProject.draftRevision); setPublishedRevision(nextProject.publishedRevision); setViewport(nextProject.document.initialViewport); setDirty(false); setStatus("Plantilla aplicada"); setSelectedIds([]);
  };
  const saveTemplate = async (submitPublic: boolean) => { setModalName(""); setModalDescription(""); setModal({ kind: "save", submitPublic }); };
  const performSaveTemplate = async (submitPublic: boolean, name: string, description: string) => {
    const response = await fetch("/api/editor/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, submitPublic, document }) });
    const payload = await response.json();
    if (response.ok && payload.success) { setTemplates((items) => [payload.data, ...items]); setStatus(submitPublic ? "Enviada a revisión" : "Plantilla guardada"); } else setStatus(payload.error?.message ?? "No se pudo guardar la plantilla");
  };
  const deleteTemplate = async (template: MenuTemplateView) => { setModal({ kind: "delete", template }); };
  const performDeleteTemplate = async (template: MenuTemplateView) => {
    const response = await fetch(`/api/editor/templates/${encodeURIComponent(template.id)}`, { method: "DELETE" });
    const payload = await response.json();
    if (response.ok && payload.success) { setTemplates((items) => items.filter((item) => item.id !== template.id)); setStatus("Plantilla eliminada"); } else setStatus(payload.error?.message ?? "No se pudo eliminar la plantilla");
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
      <div className="flex min-w-0 items-center gap-3"><h1 className="sr-only">Resumen del menú</h1><p className="truncate text-sm font-semibold text-zinc-900">Editor de {restaurantName}</p><span className="hidden rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-500 sm:inline-flex">{status}</span></div>
      <div className="flex shrink-0 items-center gap-1.5"><button className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" onClick={undo} disabled={!history.length} aria-label="Deshacer"><Undo2 size={16} /></button><button className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" onClick={redo} disabled={!future.length} aria-label="Rehacer"><Redo2 size={16} /></button><button className="hidden rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 sm:block" onClick={() => commit({ ...document, initialViewport: viewport })}>Guardar vista inicial</button>{conflict && <><button className="rounded-lg border border-amber-300 px-2 py-1.5 text-[11px] text-amber-800" onClick={reloadServerVersion}>Cargar servidor</button><button className="rounded-lg border border-red-300 px-2 py-1.5 text-[11px] text-red-800" onClick={overwriteServerVersion}>Sobrescribir</button></>}<button className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-40" onClick={publish} disabled={dirty || saving || conflict || publishedRevision === revision}>Publicar</button></div>
    </header>
    <div className="flex min-h-0 flex-1">
      <EditorToolsPanel background={document.background} layersOpen={layersOpen} onToggleLayers={() => { setIconsOpen(false); setImagesOpen(false); setTemplatesOpen(false); setLayersOpen((open) => !open); }} onOpenIcons={(open) => { setIconsOpen(open); setImagesOpen(false); setTemplatesOpen(false); if (open) setLayersOpen(true); }} onOpenImages={(open) => { setImagesOpen(open); setIconsOpen(false); setTemplatesOpen(false); if (open) setLayersOpen(true); }} onOpenTemplates={(open) => { setTemplatesOpen(open); setIconsOpen(false); setImagesOpen(false); if (open) setLayersOpen(true); }} onBackgroundChange={(value) => commit({ ...document, background: value })} onAddText={addText} onAddShape={addShape} onUpload={uploadAsset} />
      {layersOpen && (iconsOpen ? <IconPickerDrawer onClose={() => setIconsOpen(false)} onSelect={addIcon} /> : imagesOpen ? <ImagePickerDrawer images={assets.filter((asset) => asset.kind === "IMAGE")} onClose={() => setImagesOpen(false)} onSelect={addImage} onDelete={deleteAsset} /> : templatesOpen ? <TemplatePickerDrawer templates={templates} onClose={() => setTemplatesOpen(false)} onApply={applyTemplate} onSaveTemplate={saveTemplate} onDelete={deleteTemplate} /> : <LayersPanel nodes={document.nodes} selectedIds={selectedIds} onReorder={reorderLayer} onSelect={(id, additive) => setSelectedIds((ids) => additive ? ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] : [id])} />)}
      <main className="relative min-w-0 flex-1 bg-zinc-100"><KonvaCanvas document={document} assets={assetMap} selectedIds={selectedIds} onSelect={(id, additive) => setSelectedIds((ids) => !id ? [] : additive ? ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] : [id])} onSelectMany={(ids) => setSelectedIds(ids.filter((id) => !document.nodes.find((node) => node.id === id)?.locked))} onDropItem={handleCanvasDrop} onChange={patchNode} onChangeMany={moveSelected} viewport={viewport} onViewportChange={setViewport} /></main>
      <aside className="w-72 shrink-0 overflow-y-auto border-l border-zinc-200 bg-white p-4"><Inspector node={selected} selectedCount={selectedIds.length} document={document} assets={assets} onCanvasSizeChange={setCanvasSize} onChange={(patch) => selected && (!selected.locked || Object.keys(patch).every((key) => key === "locked")) && patchNode(selected.id, patch)} onChangeSelected={patchSelected} onDuplicate={duplicate} onMoveLayer={moveLayer} onDelete={deleteSelected} onRename={(name) => selected && (!selected.locked) && patchNode(selected.id, { name })} onOpacityChange={(opacity) => selected && (!selected.locked) && patchNode(selected.id, { opacity })} /></aside>
    </div>
    </div>
    {modal && <EditorModal state={modal} name={modalName} description={modalDescription} onNameChange={setModalName} onDescriptionChange={setModalDescription} onClose={() => setModal(null)} onApply={async (template) => { setModal(null); await performApplyTemplate(template); }} onSave={async (submitPublic, name, description) => { setModal(null); await performSaveTemplate(submitPublic, name, description); }} onDelete={async (template) => { setModal(null); await performDeleteTemplate(template); }} onOverwrite={async (serverRevision) => { setModal(null); await confirmOverwrite(serverRevision); }} />}
  </>;
}

type EditorModalData = { kind: "apply"; template: MenuTemplateView } | { kind: "save"; submitPublic: boolean } | { kind: "delete"; template: MenuTemplateView } | { kind: "overwrite"; serverRevision: number };
type EditorModalState = EditorModalData | null;

function EditorModal({ state, name, description, onNameChange, onDescriptionChange, onClose, onApply, onSave, onDelete, onOverwrite }: { state: EditorModalData; name: string; description: string; onNameChange: (value: string) => void; onDescriptionChange: (value: string) => void; onClose: () => void; onApply: (template: MenuTemplateView) => Promise<void>; onSave: (submitPublic: boolean, name: string, description: string) => Promise<void>; onDelete: (template: MenuTemplateView) => Promise<void>; onOverwrite: (revision: number) => Promise<void> }) {
  const isApply = state.kind === "apply";
  const isDelete = state.kind === "delete";
  const isSave = state.kind === "save";
  const title = isApply ? "Aplicar plantilla" : isDelete ? "Eliminar plantilla" : isSave ? (state.submitPublic ? "Enviar a la comunidad" : "Guardar plantilla") : "Sobrescribir borrador";
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="editor-modal-title"><h2 id="editor-modal-title" className="text-base font-semibold text-zinc-900">{title}</h2>{isApply && <p className="mt-2 text-sm leading-6 text-zinc-600">“{state.template.name}” reemplazará el borrador actual. La publicación vigente no se modificará.</p>}{isDelete && <p className="mt-2 text-sm leading-6 text-zinc-600">Se eliminará “{state.template.name}”. Esta acción no se puede deshacer.</p>}{state.kind === "overwrite" && <p className="mt-2 text-sm leading-6 text-zinc-600">Esto reemplazará el borrador guardado con tu trabajo local.</p>}{isSave && <div className="mt-4 space-y-3"><label className="block text-xs font-medium">Nombre<input autoFocus className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm" value={name} onChange={(event) => onNameChange(event.target.value)} /></label><label className="block text-xs font-medium">Descripción<textarea className="mt-1 min-h-20 w-full resize-y rounded-md border border-zinc-200 px-3 py-2 text-sm" value={description} onChange={(event) => onDescriptionChange(event.target.value)} /></label></div>}<div className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-lg border border-zinc-200 px-3 py-2 text-xs" onClick={onClose}>Cancelar</button>{isApply && <button type="button" className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white" onClick={() => void onApply(state.template)}>Aplicar</button>}{isDelete && <button type="button" className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white" onClick={() => void onDelete(state.template)}>Eliminar</button>}{isSave && <button type="button" disabled={!name.trim()} className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40" onClick={() => void onSave(state.submitPublic, name, description)}>{state.submitPublic ? "Enviar" : "Guardar"}</button>}{state.kind === "overwrite" && <button type="button" className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white" onClick={() => void onOverwrite(state.serverRevision)}>Sobrescribir</button>}</div></div></div>;
}

function Inspector({ node, selectedCount, document, assets, onCanvasSizeChange, onChange, onChangeSelected, onDuplicate, onMoveLayer, onDelete, onRename, onOpacityChange }: { node: CanvasNode | null; selectedCount: number; document: CanvasDocumentV1; assets: MenuAssetView[]; onCanvasSizeChange: (dimension: "width" | "height", value: number) => void; onChange: (patch: Partial<CanvasNode>) => void; onChangeSelected: (patch: Partial<CanvasNode>) => void; onDuplicate: () => void; onMoveLayer: (delta: number) => void; onDelete: () => void; onRename: (name: string) => void; onOpacityChange: (opacity: number) => void }) {
  if (!node) {
    return <div className="space-y-5">
      <InspectorSection title="Lienzo">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Tamaño de la carta pública</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Define el área real de la hoja. La vista inicial se guarda por separado.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <NumberField label="Ancho" value={document.canvasBounds.width} onChange={(value) => onCanvasSizeChange("width", value)} />
          <NumberField label="Alto" value={document.canvasBounds.height} onChange={(value) => onCanvasSizeChange("height", value)} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <button type="button" className="rounded-md border border-zinc-200 px-2 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50" onClick={() => { onCanvasSizeChange("width", 1080); onCanvasSizeChange("height", 1920); }}>Vertical</button>
          <button type="button" className="rounded-md border border-zinc-200 px-2 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50" onClick={() => { onCanvasSizeChange("width", 1920); onCanvasSizeChange("height", 1080); }}>Horizontal</button>
          <button type="button" className="rounded-md border border-zinc-200 px-2 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50" onClick={() => { onCanvasSizeChange("width", 1080); onCanvasSizeChange("height", 1080); }}>Cuadrado</button>
        </div>
      </InspectorSection>
    </div>;
  }

  if (selectedCount > 1) {
    return <div className="space-y-5">
      <div className="border-b border-zinc-200 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">Selección múltiple</p>
        <p className="mt-1 text-base font-semibold text-zinc-900">{selectedCount} objetos seleccionados</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">Los cambios compatibles se aplican a todos los objetos seleccionados.</p>
      </div>
      <InspectorSection title="Transformación">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Ancho" value={node.width} onChange={(value) => onChangeSelected({ width: value })} />
          <NumberField label="Alto" value={node.height} onChange={(value) => onChangeSelected({ height: value })} />
        </div>
        <label className="mt-3 block text-xs font-medium">Opacidad <span className="float-right text-zinc-500">{Math.round((Number.isFinite(node.opacity) ? node.opacity : 1) * 100)}%</span><input aria-label="Opacidad de la selección" className="mt-1 w-full accent-emerald-700" type="range" min="0" max="1" step="0.01" value={Number.isFinite(node.opacity) ? node.opacity : 1} onChange={(event) => onChangeSelected({ opacity: Number(event.target.value) })} /></label>
      </InspectorSection>
      <InspectorSection title="Estado">
        <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={node.locked} onChange={(event) => onChangeSelected({ locked: event.target.checked })} /> Bloquear selección</label>
        <label className="mt-3 flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={node.visible} onChange={(event) => onChangeSelected({ visible: event.target.checked })} /> Mostrar objetos</label>
      </InspectorSection>
      <button type="button" className="flex w-full items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={onDelete}><Trash2 size={14} /> Eliminar selección</button>
    </div>;
  }

  const typeLabel = node.type === "text" ? "Texto" : node.type === "image" ? "Imagen" : node.type === "shape" ? ({ rect: "Rectángulo", ellipse: "Elipse", line: "Línea", arrow: "Flecha", triangle: "Triángulo", star: "Estrella" }[node.shape]) : "Icono";
  const fieldDisabled = node.locked;
  return <div className="space-y-5">
    <div className="border-b border-zinc-200 pb-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-400">Propiedades</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-zinc-900">{typeLabel}</h2>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-500">{node.id.slice(0, 8)}</span>
      </div>
    </div>

    <InspectorSection title="Identificación">
      <label className="block text-xs font-medium text-zinc-700">Nombre de la capa<input disabled={fieldDisabled} className="mt-1 w-full rounded-md border border-zinc-200 px-2.5 py-2 text-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-zinc-100 disabled:text-zinc-400" value={node.name ?? ""} placeholder="Ej. Título principal" onChange={(event) => onRename(event.target.value)} /></label>
    </InspectorSection>

    <InspectorSection title="Transformación">
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" value={node.x} disabled={fieldDisabled} onChange={(value) => onChange({ x: value })} />
        <NumberField label="Y" value={node.y} disabled={fieldDisabled} onChange={(value) => onChange({ y: value })} />
        <NumberField label="Ancho" value={node.width} disabled={fieldDisabled} onChange={(value) => onChange({ width: value })} />
        <NumberField label="Alto" value={node.height} disabled={fieldDisabled} onChange={(value) => onChange({ height: value })} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <NumberField label="Rotación" value={node.rotation} disabled={fieldDisabled} onChange={(value) => onChange({ rotation: value })} />
        <label className="text-xs font-medium">Escala<input className="mt-1 w-full rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-500" value="Normalizada" readOnly /></label>
      </div>
    </InspectorSection>

    <InspectorSection title="Capa y visibilidad">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="rounded-md border border-zinc-200 px-2 py-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40" disabled={fieldDisabled} onClick={() => onMoveLayer(1)}>Subir capa</button>
        <button type="button" className="rounded-md border border-zinc-200 px-2 py-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40" disabled={fieldDisabled} onClick={() => onMoveLayer(-1)}>Bajar capa</button>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={node.locked} onChange={(event) => onChange({ locked: event.target.checked })} /> Bloquear objeto</label>
      <label className="mt-3 flex items-center gap-2 text-xs font-medium"><input disabled={fieldDisabled} type="checkbox" checked={node.visible} onChange={(event) => onChange({ visible: event.target.checked })} /> Mostrar objeto</label>
      <label className="mt-3 block text-xs font-medium">Opacidad <span className="float-right text-zinc-500">{Math.round((Number.isFinite(node.opacity) ? node.opacity : 1) * 100)}%</span><input aria-label="Opacidad del objeto" disabled={fieldDisabled} className="mt-1 w-full accent-emerald-700 disabled:opacity-40" type="range" min="0" max="1" step="0.01" value={Number.isFinite(node.opacity) ? node.opacity : 1} onChange={(event) => onOpacityChange(Number(event.target.value))} /></label>
    </InspectorSection>

    {node.type === "text" && <InspectorSection title="Contenido y tipografía">
      <label className="block text-xs font-medium">Contenido<textarea disabled={fieldDisabled} className="mt-1 min-h-24 w-full resize-y rounded-md border border-zinc-200 p-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-zinc-100" value={node.text} onChange={(event) => onChange({ text: event.target.value })} /></label>
      <div className="mt-3 grid grid-cols-2 gap-2"><NumberField label="Tamaño" value={node.fontSize} disabled={fieldDisabled} onChange={(value) => onChange({ fontSize: value })} /><label className="text-xs font-medium">Peso<select disabled={fieldDisabled} className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-2 text-xs disabled:bg-zinc-100" value={node.fontWeight} onChange={(event) => onChange({ fontWeight: event.target.value as typeof node.fontWeight })}><option value="400">Regular</option><option value="500">Medio</option><option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra bold</option><option value="900">Black</option></select></label></div>
      <label className="mt-3 block text-xs font-medium">Fuente<select disabled={fieldDisabled} className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-2 text-xs disabled:bg-zinc-100" value={node.fontAssetId ? `asset:${node.fontAssetId}` : `system:${node.fontFamily ?? "Arial"}`} onChange={(event) => { const value = event.target.value; onChange(value.startsWith("asset:") ? { fontAssetId: value.slice(6), fontFamily: undefined } : { fontAssetId: null, fontFamily: value.slice(7) as typeof SYSTEM_FONT_FAMILIES[number] }); }}><optgroup label="Fuentes del sistema">{SYSTEM_FONT_FAMILIES.map((family) => <option key={family} value={`system:${family}`} style={{ fontFamily: family }}>{family}</option>)}</optgroup><optgroup label="Fuentes subidas">{assets.filter((asset) => asset.kind === "FONT").map((asset) => <option key={asset.id} value={`asset:${asset.id}`}>{asset.name}</option>)}</optgroup></select></label>
      <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-medium">Alineación<select disabled={fieldDisabled} className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-2 text-xs disabled:bg-zinc-100" value={node.align} onChange={(event) => onChange({ align: event.target.value as typeof node.align })}><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option></select></label><label className="text-xs font-medium">Estilo<select disabled={fieldDisabled} className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-2 text-xs disabled:bg-zinc-100" value={node.fontStyle} onChange={(event) => onChange({ fontStyle: event.target.value as typeof node.fontStyle })}><option value="normal">Normal</option><option value="italic">Cursiva</option></select></label></div>
      <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-medium">Rol semántico<select disabled={fieldDisabled} className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-2 text-xs disabled:bg-zinc-100" value={node.semanticRole} onChange={(event) => onChange({ semanticRole: event.target.value as typeof node.semanticRole })}><option value="none">Ninguno</option><option value="heading">Encabezado</option><option value="paragraph">Párrafo</option><option value="label">Etiqueta</option><option value="price">Precio</option></select></label><label className="text-xs font-medium">Color<input disabled={fieldDisabled} className="mt-1 h-9 w-full rounded-md border border-zinc-200 disabled:opacity-50" type="color" value={node.fill.slice(0, 7)} onChange={(event) => onChange({ fill: event.target.value })} /></label></div>
    </InspectorSection>}

    {node.type === "shape" && <InspectorSection title="Estilo de la figura">
      <AlphaColorField label="Color de relleno" value={node.fill ?? "#3A4824"} disabled={fieldDisabled} onChange={(value) => onChange({ fill: value })} />
      <div className="mt-3 grid grid-cols-2 gap-2"><NumberField label="Grosor del borde" value={node.strokeWidth} disabled={fieldDisabled} onChange={(value) => onChange({ strokeWidth: value })} /><label className="text-xs font-medium">Color del borde<input disabled={fieldDisabled} className="mt-1 h-9 w-full rounded-md border border-zinc-200 disabled:opacity-50" type="color" value={node.stroke?.slice(0, 7) ?? "#3A4824"} onChange={(event) => onChange({ stroke: event.target.value })} /></label></div>
      {node.shape === "rect" && <><NumberField label="Redondeado" value={node.cornerRadius} disabled={fieldDisabled} onChange={(value) => onChange({ cornerRadius: Math.max(0, Math.min(Math.min(node.width, node.height) / 2, value)) })} /><input aria-label="Redondeado de esquinas" disabled={fieldDisabled} className="mt-2 w-full accent-emerald-700 disabled:opacity-40" type="range" min="0" max={Math.max(0, Math.min(node.width, node.height) / 2)} step="1" value={Math.min(node.cornerRadius, Math.max(0, Math.min(node.width, node.height) / 2))} onChange={(event) => onChange({ cornerRadius: Number(event.target.value) })} /></>}
    </InspectorSection>}

    {node.type === "image" && <InspectorSection title="Imagen">
      <label className="block text-xs font-medium">Ajuste<select disabled={fieldDisabled} className="mt-1 w-full rounded-md border border-zinc-200 px-2 py-2 text-xs disabled:bg-zinc-100" value={node.fit} onChange={(event) => onChange({ fit: event.target.value as typeof node.fit })}><option value="contain">Contener</option><option value="cover">Cubrir</option><option value="stretch">Estirar</option></select></label>
      <label className="mt-3 block text-xs font-medium">Texto alternativo<input disabled={fieldDisabled} className="mt-1 w-full rounded-md border border-zinc-200 px-2.5 py-2 text-xs disabled:bg-zinc-100" value={node.alt} placeholder="Describe la imagen" onChange={(event) => onChange({ alt: event.target.value })} /></label>
      <NumberField label="Redondeado" value={node.cornerRadius} disabled={fieldDisabled} onChange={(value) => onChange({ cornerRadius: Math.max(0, value) })} />
    </InspectorSection>}

    {node.type === "icon" && <InspectorSection title="Icono">
      <label className="block text-xs font-medium">Nombre accesible<input disabled={fieldDisabled} className="mt-1 w-full rounded-md border border-zinc-200 px-2.5 py-2 text-xs disabled:bg-zinc-100" value={node.accessibleLabel} onChange={(event) => onChange({ accessibleLabel: event.target.value })} /></label>
      <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-medium">Color<input disabled={fieldDisabled} className="mt-1 h-9 w-full rounded-md border border-zinc-200 disabled:opacity-50" type="color" value={node.fill.slice(0, 7)} onChange={(event) => onChange({ fill: event.target.value })} /></label><NumberField label="Grosor" value={node.strokeWidth} disabled={fieldDisabled} onChange={(value) => onChange({ strokeWidth: value })} /></div>
    </InspectorSection>}

    <InspectorSection title="Interacción">
      <label className="block text-xs font-medium">Enlace<input disabled={fieldDisabled} className="mt-1 w-full rounded-md border border-zinc-200 px-2.5 py-2 text-xs disabled:bg-zinc-100" type="url" placeholder="https://..." value={node.link ?? ""} onChange={(event) => onChange({ link: event.target.value || null })} /></label>
    </InspectorSection>

    <div className="grid grid-cols-2 gap-2 pt-1">
      <button type="button" className="rounded-md border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-40" disabled={fieldDisabled} onClick={onDuplicate}>Duplicar</button>
      <button type="button" className="flex items-center justify-center gap-1 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={onDelete}><Trash2 size={14} /> Eliminar</button>
    </div>
  </div>;
}

function InspectorSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border-b border-zinc-100 pb-5 last:border-b-0">
    <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">{title}</h3>
    {children}
  </section>;
}

function NumberField({ label, value, onChange, disabled = false }: { label: string; value: number; onChange: (value: number) => void; disabled?: boolean }) { const safeValue = Number.isFinite(value) ? value : 0; return <label className="text-xs font-medium">{label}<input disabled={disabled} className="mt-1 w-full rounded-md border border-zinc-200 px-2.5 py-2 text-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-zinc-100 disabled:text-zinc-400" type="number" value={Math.round(safeValue * 100) / 100} onChange={(event) => onChange(Number(event.target.value) || 0)} /></label>; }

function AlphaColorField({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const normalized = /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value) ? value : "#3A4824";
  const alpha = normalized.length === 9 ? parseInt(normalized.slice(7, 9), 16) / 255 : 1;
  const base = normalized.slice(0, 7);
  return <div>
    <div className="flex items-center justify-between text-xs font-medium"><span>{label}</span><label className="flex items-center gap-1 text-[11px] font-normal text-zinc-500"><input aria-label={`Porcentaje de transparencia de ${label.toLowerCase()}`} disabled={disabled} className="w-14 rounded border border-zinc-200 px-1.5 py-1 text-right text-[11px] text-zinc-700 disabled:bg-zinc-100 disabled:text-zinc-400" type="number" min="0" max="100" step="1" value={Math.round(alpha * 100)} onChange={(event) => onChange(withColorAlpha(base, Number(event.target.value) / 100))} /><span>%</span></label></div>
    <input aria-label={label} disabled={disabled} className="mt-1 h-9 w-full rounded-md border border-zinc-200 disabled:opacity-50" type="color" value={base} onChange={(event) => onChange(withColorAlpha(event.target.value, alpha))} />
    <input aria-label={`Transparencia de ${label.toLowerCase()}`} disabled={disabled} className="mt-2 w-full accent-emerald-700 disabled:opacity-40" type="range" min="0" max="1" step="0.01" value={alpha} onChange={(event) => onChange(withColorAlpha(base, Number(event.target.value)))} />
  </div>;
}

function withColorAlpha(color: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  const base = color.slice(0, 7);
  if (clamped >= 0.999) return base;
  return `${base}${Math.round(clamped * 255).toString(16).padStart(2, "0")}`;
}

function normalizeDocument(document: CanvasDocumentV1): CanvasDocumentV1 {
  return { ...document, nodes: document.nodes.map((node) => {
    const width = Math.max(4, finiteOr(node.width, 4));
    const height = Math.max(4, finiteOr(node.height, 4));
    const normalized = { ...node, x: finiteOr(node.x, document.canvasBounds.x + (document.canvasBounds.width - width) / 2), y: finiteOr(node.y, document.canvasBounds.y + (document.canvasBounds.height - height) / 2), width, height, rotation: finiteOr(node.rotation, 0), opacity: Math.max(0, Math.min(1, finiteOr(node.opacity, 1))) } as CanvasNode;
    if (normalized.type === "text") normalized.height = Math.max(normalized.height, estimateTextHeight(normalized));
    return normalized;
  }) };
}

function finiteOr(value: number, fallback: number): number { return Number.isFinite(value) ? value : fallback; }

function estimateTextHeight(node: Extract<CanvasNode, { type: "text" }>): number {
  const width = Math.max(4, finiteOr(node.width, 4));
  const fontSize = Math.max(1, finiteOr(node.fontSize, 16));
  const letterSpacing = finiteOr(node.letterSpacing, 0);
  let measure: (value: string) => number = (value) => value.length * Math.max(1, fontSize * 0.55 + letterSpacing);
  if (typeof window !== "undefined") {
    const context = window.document.createElement("canvas").getContext("2d");
    if (context) {
      context.font = `${node.fontStyle} ${node.fontWeight} ${fontSize}px ${node.fontFamily ?? "Arial"}`;
      measure = (value) => context.measureText(value).width + Math.max(0, value.length - 1) * letterSpacing;
    }
  }
  const lines = node.text.split("\n").reduce((total, rawLine) => {
    if (!rawLine) return total + 1;
    const tokens = rawLine.split(/(\s+)/).filter(Boolean);
    let lineWidth = 0;
    let lineCount = 1;
    for (const token of tokens) {
      const tokenWidth = measure(token);
      if (lineWidth > 0 && lineWidth + tokenWidth > width) {
        lineCount += 1;
        lineWidth = tokenWidth;
      } else if (lineWidth === 0 && tokenWidth > width) {
        const charactersPerLine = Math.max(1, Math.floor(width / Math.max(1, fontSize * 0.55 + letterSpacing)));
        const chunks = Math.ceil(token.length / charactersPerLine);
        lineCount += chunks - 1;
        lineWidth = measure(token.slice(-charactersPerLine));
      } else lineWidth += tokenWidth;
    }
    return total + lineCount;
  }, 0);
  return Math.max(4, Math.ceil(lines * node.fontSize * node.lineHeight + 8));
}
