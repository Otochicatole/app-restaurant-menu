"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Grid2X2, Redo2, Undo2 } from "lucide-react";
import { STROKE_SIDES, type CanvasDocumentV1, type CanvasGroup, type CanvasNode, type MenuAssetView, type MenuProjectView, type MenuTemplateView } from "../contracts";
import { copyCanvasSelection, pasteCanvasSelection, type CanvasClipboardSnapshot } from "../domain/canvas-clipboard";
import {
  createCanvasGroup,
  descendantNodeIds,
  groupCanvasSelection,
  groupLayerState,
  moveCanvasLayer,
  moveCanvasLayerByOffset,
  nextCanvasGroupName,
  nextRootLayerOrder,
  nodeLayerState,
  outermostGroupId,
  removeCanvasNodes,
  ungroupCanvasGroup,
  type CanvasLayerMoveDestination,
  type CanvasLayerRef,
} from "../domain/layer-tree";
import { placeNodeInCanvas } from "../domain/node-placement";
import { allCornerRadii } from "../domain/rectangle-border";
import { CanvasInspector } from "./CanvasInspector";
import { LayersPanel } from "./LayersPanel";
import { EditorToolsPanel, IconPickerDrawer, MediaPickerDrawer, TemplatePickerDrawer, type CanvasDropItem } from "./EditorToolsPanel";
import { CanvasStage } from "../ui/CanvasStage";
import { MediaModal, type MediaModalAsset } from "@/ui/MediaModal";

const KonvaCanvas = dynamic(() => import("./KonvaCanvas").then((module) => module.KonvaCanvas), { ssr: false });

export function CanvasEditor({ project, initialAssets, initialTemplates, restaurantName, restaurantSlug }: { project: MenuProjectView; initialAssets: MenuAssetView[]; initialTemplates: MenuTemplateView[]; restaurantName: string; restaurantSlug: string }) {
  const [document, setDocument] = useState(() => normalizeDocument(project.document));
  const [revision, setRevision] = useState(project.draftRevision);
  const [publishedRevision, setPublishedRevision] = useState(project.publishedRevision);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [deepSelectedId, setDeepSelectedId] = useState<string | null>(null);
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [layersOpen, setLayersOpen] = useState(true);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [imagesOpen, setImagesOpen] = useState(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<"insert" | "modal" | "background">("insert");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [assets, setAssets] = useState(initialAssets);
  const [templates, setTemplates] = useState(initialTemplates);
  const [history, setHistory] = useState<CanvasDocumentV1[]>([]);
  const [future, setFuture] = useState<CanvasDocumentV1[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [status, setStatus] = useState("Guardado");
  const [conflict, setConflict] = useState(false);
  const [viewport, setViewport] = useState(project.document.initialViewport);
  const [modal, setModal] = useState<EditorModalState>(null);
  const [modalName, setModalName] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [gridEnabled, setGridEnabled] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<MediaModalAsset | null>(null);
  const [clipboardNotice, setClipboardNotice] = useState<string | null>(null);
  const editVersionRef = useRef(0);
  const publishingRef = useRef(false);
  const canvasClipboardRef = useRef<{ snapshot: CanvasClipboardSnapshot; pasteSequence: number } | null>(null);
  const clipboardNoticeTimerRef = useRef<number | null>(null);

  const assetMap = useMemo(() => Object.fromEntries(assets.map((asset) => [asset.id, asset])), [assets]);
  const fontFaces = useMemo(() => assets.filter((asset) => asset.kind === "FONT").map((asset) => `@font-face{font-family:"editor-font-${asset.id}";src:url("${asset.url}") format("${asset.mimeType.includes("woff2") ? "woff2" : asset.mimeType.includes("woff") ? "woff" : "truetype"}");font-display:swap;}`).join(""), [assets]);
  const selectedGroup = document.groups.find((group) => group.id === selectedGroupId) ?? null;
  const selected = selectedGroup ? null : document.nodes.find((node) => node.id === selectedIds[0]) ?? null;
  const selectedNodeIds = selectedGroup ? descendantNodeIds(document, selectedGroup.id) : selectedIds;

  const commitTransform = (transform: (current: CanvasDocumentV1) => CanvasDocumentV1) => {
    editVersionRef.current += 1;
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
    // An explicit height comes from a manual resize/transform and must be
    // preserved (including the grid-snapped value). Content-only changes and
    // width/font changes made from the inspector still recalculate the wrap.
    if (next.type === "text" && !("height" in patch) && ("text" in patch || "width" in patch || "fontSize" in patch || "lineHeight" in patch || "letterSpacing" in patch)) next.height = estimateTextHeight(next);
    return next;
  }) }));
  const patchGroup = (id: string, patch: Partial<Pick<CanvasGroup, "name" | "visible" | "locked">>) => commitTransform((current) => ({ ...current, groups: current.groups.map((group) => group.id === id ? { ...group, ...patch } : group) }));
  const patchSelected = (patch: Partial<CanvasNode>) => commitTransform((current) => ({ ...current, nodes: current.nodes.map((node) => selectedIds.includes(node.id) && !nodeLayerState(current, node).effectiveLocked ? ({ ...node, ...patch } as CanvasNode) : node) }));
  const moveSelected = (ids: string[], delta: { x: number; y: number }, includeLocked = false) => commitTransform((current) => ({ ...current, nodes: current.nodes.map((node) => ids.includes(node.id) && (includeLocked || !nodeLayerState(current, node).effectiveLocked) ? ({ ...node, x: node.x + delta.x, y: node.y + delta.y } as CanvasNode) : node) }));
  const setCanvasSize = (dimension: "width" | "height", value: number) => { const nextValue = Math.max(100, Math.min(100_000, value || 100)); commitTransform((current) => ({ ...current, canvasBounds: { ...current.canvasBounds, [dimension]: nextValue } })); };
  const undo = () => { const previous = history.at(-1); if (!previous) return; editVersionRef.current += 1; setFuture((items) => [...items, document]); setHistory((items) => items.slice(0, -1)); setDocument(previous); setSelectedGroupId(null); setDeepSelectedId(null); setDirty(true); setStatus("Cambios pendientes"); };
  const redo = () => { const next = future.at(-1); if (!next) return; editVersionRef.current += 1; setHistory((items) => [...items, document]); setFuture((items) => items.slice(0, -1)); setDocument(next); setSelectedGroupId(null); setDeepSelectedId(null); setDirty(true); setStatus("Cambios pendientes"); };

  const selectLayerNode = (id: string, additive = false) => {
    setSelectedGroupId(null);
    setDeepSelectedId(additive ? null : id);
    setSelectedIds((ids) => additive ? ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] : [id]);
  };
  const selectGroup = (id: string) => {
    setSelectedGroupId(id);
    setDeepSelectedId(null);
    setSelectedIds(descendantNodeIds(document, id));
  };
  const selectCanvasNode = (id: string | null, additive: boolean, deep = false) => {
    if (!id) { setSelectedGroupId(null); setDeepSelectedId(null); setSelectedIds([]); return; }
    const groupId = deep ? null : outermostGroupId(document, id);
    if (groupId) { selectGroup(groupId); return; }
    selectLayerNode(id, additive);
  };

  const showClipboardNotice = (message: string) => {
    if (clipboardNoticeTimerRef.current !== null) window.clearTimeout(clipboardNoticeTimerRef.current);
    setClipboardNotice(message);
    clipboardNoticeTimerRef.current = window.setTimeout(() => {
      setClipboardNotice(null);
      clipboardNoticeTimerRef.current = null;
    }, 1_600);
  };
  const appendClipboardSnapshot = (snapshot: CanvasClipboardSnapshot, pasteSequence: number) => {
    const pasted = pasteCanvasSelection(snapshot, document, () => crypto.randomUUID(), pasteSequence);
    if (!pasted.nodes.length && !pasted.groups.length) return 0;
    commitTransform((current) => ({
      ...current,
      nodes: [...current.nodes, ...pasted.nodes],
      groups: [...current.groups, ...pasted.groups],
    }));
    if (pasted.rootGroupIds.length === 1) {
      setSelectedGroupId(pasted.rootGroupIds[0]);
      setDeepSelectedId(null);
      setSelectedIds(pasted.nodes.map((node) => node.id));
    } else {
      setSelectedGroupId(null);
      setDeepSelectedId(pasted.nodes.length === 1 ? pasted.nodes[0].id : null);
      setSelectedIds(pasted.nodes.map((node) => node.id));
    }
    return Math.max(1, pasted.nodes.length);
  };
  const copySelection = () => {
    const snapshot = copyCanvasSelection(document, selectedNodeIds, selectedGroup?.id ?? null);
    if (!snapshot) return false;
    canvasClipboardRef.current = { snapshot, pasteSequence: 0 };
    showClipboardNotice(snapshot.nodes.length === 1 ? "Objeto copiado" : `${snapshot.nodes.length} objetos copiados`);
    return true;
  };
  const pasteSelection = () => {
    const clipboard = canvasClipboardRef.current;
    if (!clipboard) return false;
    const pasteSequence = clipboard.pasteSequence + 1;
    const pastedCount = appendClipboardSnapshot(clipboard.snapshot, pasteSequence);
    if (!pastedCount) return false;
    clipboard.pasteSequence = pasteSequence;
    showClipboardNotice(pastedCount === 1 ? "Objeto pegado" : `${pastedCount} objetos pegados`);
    return true;
  };

  useEffect(() => () => {
    if (clipboardNoticeTimerRef.current !== null) window.clearTimeout(clipboardNoticeTimerRef.current);
  }, []);

  useEffect(() => {
    if (!dirty || saving || publishing || conflict) return;
    const timer = window.setTimeout(async () => {
      if (publishingRef.current) return;
      const savedEditVersion = editVersionRef.current;
      setSaving(true); setStatus("Guardando...");
      try {
        const response = await fetch("/api/editor/project", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision: revision, document }) });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          if (response.status === 409) setConflict(true);
          throw new Error(payload.error?.message ?? "No se pudo guardar");
        }
        setRevision(payload.data.draftRevision);
        if (editVersionRef.current === savedEditVersion) { setDirty(false); setStatus("Guardado"); }
        else { setDirty(true); setStatus("Cambios pendientes"); }
      } catch (error) { setStatus(error instanceof Error ? error.message : "No se pudo guardar"); }
      finally { setSaving(false); }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [dirty, document, revision, saving, publishing, conflict]);

  const reloadServerVersion = async () => {
    const response = await fetch("/api/editor/project");
    const payload = await response.json();
    if (!response.ok || !payload.success) return;
    setDocument(payload.data.document); setRevision(payload.data.draftRevision); setPublishedRevision(payload.data.publishedRevision); setHistory([]); setFuture([]); setDirty(false); setConflict(false); setSelectedGroupId(null); setDeepSelectedId(null); setSelectedIds([]); setStatus("Versión del servidor cargada");
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

  const addNode = (node: CanvasNode) => { commitTransform((current) => ({ ...current, nodes: [...current.nodes, node] })); setSelectedGroupId(null); setDeepSelectedId(node.id); setSelectedIds([node.id]); };
  const newNodeFrame = (preferredWidth: number, preferredHeight: number, point?: { x: number; y: number }) => { const frame = point ? { x: point.x - preferredWidth / 2, y: point.y - preferredHeight / 2, width: preferredWidth, height: preferredHeight } : placeNodeInCanvas(document.canvasBounds, viewport, preferredWidth, preferredHeight); return { x: finiteOr(frame.x, document.canvasBounds.x + document.canvasBounds.width / 2 - preferredWidth / 2), y: finiteOr(frame.y, document.canvasBounds.y + document.canvasBounds.height / 2 - preferredHeight / 2), width: finiteOr(frame.width, preferredWidth), height: finiteOr(frame.height, preferredHeight) }; };
  const duplicate = () => {
    if (!selected && !selectedGroup) return;
    if (selected && nodeLayerState(document, selected).effectiveLocked) return;
    if (selectedGroup && groupLayerState(document, selectedGroup).effectiveLocked) return;
    const snapshot = copyCanvasSelection(document, selected ? [selected.id] : selectedIds, selectedGroup?.id ?? null);
    if (snapshot) appendClipboardSnapshot(snapshot, 1);
  };
  const moveLayer = (delta: number) => {
    const active: CanvasLayerRef | null = selectedGroup ? { kind: "group", id: selectedGroup.id } : selected ? { kind: "node", id: selected.id } : null;
    if (!active) return;
    const next = moveCanvasLayerByOffset(document, active, delta);
    if (next !== document) commit(next);
  };
  const moveLayerRef = (active: CanvasLayerRef, destination: CanvasLayerMoveDestination) => {
    const next = moveCanvasLayer(document, active, destination);
    if (next !== document) commit(next);
  };
  const deleteSelected = () => {
    if (selectedGroup) { if (groupLayerState(document, selectedGroup).effectiveLocked) return; const descendants = descendantNodeIds(document, selectedGroup.id); commit(ungroupCanvasGroup(document, selectedGroup.id)); setSelectedGroupId(null); setDeepSelectedId(null); setSelectedIds(descendants); return; }
    const deletable = selectedIds.filter((id) => !nodeLayerState(document, id).effectiveLocked);
    if (!deletable.length) return;
    commit(removeCanvasNodes(document, deletable));
    if (deepSelectedId && deletable.includes(deepSelectedId)) setDeepSelectedId(null);
    setSelectedIds((ids) => ids.filter((id) => !deletable.includes(id)));
  };
  const createGroup = () => {
    if (selectedGroup && groupLayerState(document, selectedGroup).effectiveLocked) return;
    const id = crypto.randomUUID();
    const next = createCanvasGroup(document, id, nextCanvasGroupName(document), selectedGroupId);
    commit(next);
    setSelectedGroupId(id);
    setDeepSelectedId(null);
    setSelectedIds([]);
    setRenameGroupId(id);
  };
  const groupSelection = () => {
    if (selectedGroup && groupLayerState(document, selectedGroup).effectiveLocked) return;
    const refs: CanvasLayerRef[] = selectedGroup ? [{ kind: "group", id: selectedGroup.id }] : selectedIds.filter((id) => !nodeLayerState(document, id).effectiveLocked).map((id) => ({ kind: "node" as const, id }));
    if (!refs.length) return;
    const id = crypto.randomUUID();
    const next = groupCanvasSelection(document, refs, id, nextCanvasGroupName(document));
    if (next === document) return;
    commit(next);
    setSelectedGroupId(id);
    setDeepSelectedId(null);
    setSelectedIds(descendantNodeIds(next, id));
    setRenameGroupId(id);
  };
  const ungroup = (id: string) => {
    if (groupLayerState(document, id).effectiveLocked) return;
    const descendants = descendantNodeIds(document, id);
    const next = ungroupCanvasGroup(document, id);
    if (next === document) return;
    commit(next);
    setSelectedGroupId(null);
    setDeepSelectedId(null);
    setSelectedIds(descendants);
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const commandKey = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (commandKey && key === "c" && copySelection()) { event.preventDefault(); return; }
      if (commandKey && key === "v" && pasteSelection()) { event.preventDefault(); return; }
      if (commandKey && key === "g") { event.preventDefault(); if (event.shiftKey && selectedGroup) ungroup(selectedGroup.id); else groupSelection(); return; }
      if (commandKey && key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (commandKey && key === "y") { event.preventDefault(); redo(); return; }
      if ((event.key === "Delete" || event.key === "Backspace") && (selectedIds.length || selectedGroup)) { event.preventDefault(); deleteSelected(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const layerOrder = nextRootLayerOrder(document);
  const addText = (point?: { x: number; y: number }) => addNode({ id: crypto.randomUUID(), type: "text", ...newNodeFrame(360, 80, point), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, layerOrder, link: null, text: "Nuevo texto", modalAssetId: null, fontAssetId: null, fontSize: 42, fontWeight: "600", fontStyle: "normal", textDecoration: "none", align: "left", verticalAlign: "middle", lineHeight: 1.2, letterSpacing: 0, fill: "#171717", semanticRole: "paragraph" });
  const addShape = (shape: "rect" | "ellipse" | "line" | "arrow" | "triangle" | "star", point?: { x: number; y: number }) => addNode({ id: crypto.randomUUID(), type: "shape", shape, ...newNodeFrame(260, 160, point), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, layerOrder, link: null, fill: "#3A4824", stroke: null, strokeWidth: 0, strokeSides: [...STROKE_SIDES], cornerRadii: allCornerRadii(18), fillGradient: null, backgroundImage: null });
  const addIcon = (iconKey: string, point?: { x: number; y: number }) => addNode({ id: crypto.randomUUID(), type: "icon", iconKey, accessibleLabel: iconKey.replaceAll("-", " "), ...newNodeFrame(80, 80, point), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, layerOrder, link: null, fill: "#B8790A", strokeWidth: 2 });
  const addImage = (asset: MenuAssetView, point?: { x: number; y: number }) => addNode({ id: crypto.randomUUID(), type: "image", assetId: asset.id, ...newNodeFrame(280, 180, point), rotation: 0, opacity: 1, visible: true, locked: false, groupId: null, layerOrder, link: null, fit: "contain", cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1, cornerRadius: 12, alt: asset.name });
  const handleCanvasDrop = (item: CanvasDropItem, point: { x: number; y: number }) => { if (item.kind === "text") addText(point); if (item.kind === "shape" && item.shape) addShape(item.shape, point); if (item.kind === "icon" && item.iconKey) addIcon(item.iconKey, point); if (item.kind === "image" && item.assetId) { const asset = assets.find((candidate) => candidate.id === item.assetId); if (asset) addImage(asset, point); } };
  const uploadAsset = async (kind: "IMAGE" | "VIDEO" | "FONT", file: File) => { const form = new FormData(); form.set("kind", kind); form.set("file", file); if (kind === "FONT") form.set("name", file.name.replace(/\.[^.]+$/, "")); const response = await fetch("/api/editor/assets", { method: "POST", body: form }); const payload = await response.json(); if (response.ok && payload.success) setAssets((items) => [payload.data, ...items]); };
  const openModalMediaPicker = () => { setMediaPickerMode("modal"); setImagesOpen(true); setIconsOpen(false); setTemplatesOpen(false); setLayersOpen(true); };
  const openBackgroundImagePicker = () => { setMediaPickerMode("background"); setImagesOpen(true); setIconsOpen(false); setTemplatesOpen(false); setLayersOpen(true); };
  const selectMedia = (asset: MenuAssetView) => { if (mediaPickerMode === "modal" && selected?.type === "text") { patchNode(selected.id, { modalAssetId: asset.id }); setImagesOpen(false); return; } if (mediaPickerMode === "background" && selected?.type === "shape" && selected.shape === "rect" && asset.kind === "IMAGE") { patchNode(selected.id, { backgroundImage: { assetId: asset.id, fit: "cover", positionX: 0.5, positionY: 0.5, opacity: 1 } }); setImagesOpen(false); return; } if (asset.kind === "IMAGE") addImage(asset); };
  const deleteAsset = async (asset: MenuAssetView) => { const response = await fetch(`/api/editor/assets/${encodeURIComponent(asset.id)}`, { method: "DELETE" }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(payload?.error?.message ?? "No se pudo eliminar la imagen."); setAssets((items) => items.filter((item) => item.id !== asset.id)); };
  const publish = async () => {
    if (saving || publishingRef.current || conflict) return;
    const publishedEditVersion = editVersionRef.current;
    publishingRef.current = true;
    setPublishing(true);
    setStatus("Publicando...");
    try {
      const response = await fetch("/api/editor/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ baseRevision: revision, document }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        if (response.status === 409) setConflict(true);
        throw new Error(payload.error?.message ?? "No se pudo publicar");
      }
      setRevision(payload.data.draftRevision);
      setPublishedRevision(payload.data.publishedRevision);
      if (editVersionRef.current === publishedEditVersion) { setDirty(false); setStatus("Publicado"); }
      else { setDirty(true); setStatus("Publicado; hay cambios pendientes"); }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo publicar");
    } finally {
      publishingRef.current = false;
      setPublishing(false);
    }
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
    setHistory((items) => [...items.slice(-99), document]); setFuture([]); setDocument(nextProject.document); setRevision(nextProject.draftRevision); setPublishedRevision(nextProject.publishedRevision); setViewport(nextProject.document.initialViewport); setDirty(false); setStatus("Plantilla aplicada"); setSelectedGroupId(null); setDeepSelectedId(null); setSelectedIds([]);
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
      <div className="flex shrink-0 items-center gap-1.5"><button className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" onClick={undo} disabled={!history.length} aria-label="Deshacer"><Undo2 size={16} /></button><button className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 disabled:opacity-30" onClick={redo} disabled={!future.length} aria-label="Rehacer"><Redo2 size={16} /></button><label className="hidden cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 sm:flex"><Grid2X2 size={14} aria-hidden="true" /><span>Cuadrícula</span><input className="peer sr-only" type="checkbox" checked={gridEnabled} onChange={(event) => setGridEnabled(event.target.checked)} /><span aria-hidden="true" className={`relative h-4 w-7 rounded-full transition-colors ${gridEnabled ? "bg-emerald-700" : "bg-zinc-300"}`}><span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${gridEnabled ? "translate-x-3.5" : "translate-x-0.5"}`} /></span></label><button className="hidden rounded-lg border border-zinc-200 px-3 py-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 sm:block" onClick={() => commit({ ...document, initialViewport: viewport })}>Guardar vista inicial</button><button className="rounded-lg border border-emerald-200 px-3 py-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50" onClick={() => setPreviewOpen(true)}>Vista previa</button>{conflict && <><button className="rounded-lg border border-amber-300 px-2 py-1.5 text-[11px] text-amber-800" onClick={reloadServerVersion}>Cargar servidor</button><button className="rounded-lg border border-red-300 px-2 py-1.5 text-[11px] text-red-800" onClick={overwriteServerVersion}>Sobrescribir</button></>}<button className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-40" onClick={publish} disabled={saving || publishing || conflict || (!dirty && publishedRevision === revision)}>Publicar</button></div>
    </header>
    <div className="flex min-h-0 flex-1">
      <EditorToolsPanel background={document.background} layersOpen={layersOpen} onToggleLayers={() => { setIconsOpen(false); setImagesOpen(false); setTemplatesOpen(false); setLayersOpen((open) => !open); }} onOpenIcons={(open) => { setIconsOpen(open); setImagesOpen(false); setTemplatesOpen(false); if (open) setLayersOpen(true); }} onOpenImages={(open) => { setMediaPickerMode("insert"); setImagesOpen(open); setIconsOpen(false); setTemplatesOpen(false); if (open) setLayersOpen(true); }} onOpenTemplates={(open) => { setTemplatesOpen(open); setIconsOpen(false); setImagesOpen(false); if (open) setLayersOpen(true); }} onBackgroundChange={(value) => commit({ ...document, background: value })} onAddText={addText} onAddShape={addShape} onUpload={uploadAsset} />
      {layersOpen && (iconsOpen ? <IconPickerDrawer onClose={() => setIconsOpen(false)} onSelect={addIcon} /> : imagesOpen ? <MediaPickerDrawer images={assets.filter((asset) => mediaPickerMode === "background" ? asset.kind === "IMAGE" : asset.kind === "IMAGE" || asset.kind === "VIDEO")} onClose={() => setImagesOpen(false)} onSelect={selectMedia} onDelete={deleteAsset} /> : templatesOpen ? <TemplatePickerDrawer templates={templates} assets={assets} onClose={() => setTemplatesOpen(false)} onApply={applyTemplate} onSaveTemplate={saveTemplate} onDelete={deleteTemplate} /> : <LayersPanel key={restaurantSlug} document={document} selectedIds={selectedNodeIds} selectedGroupId={selectedGroup?.id ?? null} renameGroupId={renameGroupId} storageKey={`menu-editor:collapsed-groups:${restaurantSlug}`} onCreateGroup={createGroup} onGroupSelection={groupSelection} onSelectNode={selectLayerNode} onSelectGroup={selectGroup} onChangeNode={(id, patch) => patchNode(id, patch)} onChangeGroup={(id, patch) => patchGroup(id, patch)} onRenameGroup={(id, name) => patchGroup(id, { name })} onUngroup={ungroup} onMove={moveLayerRef} onRenameFinished={() => setRenameGroupId(null)} />)}
      <main className="relative min-w-0 flex-1 bg-zinc-100"><KonvaCanvas document={document} assets={assetMap} selectedIds={selectedNodeIds} selectedGroupId={selectedGroup?.id ?? null} deepSelectedId={deepSelectedId} showGrid={gridEnabled} onSelect={selectCanvasNode} onSelectMany={(ids) => { setSelectedGroupId(null); setDeepSelectedId(null); setSelectedIds(ids.filter((id) => !nodeLayerState(document, id).effectiveLocked)); }} onDropItem={handleCanvasDrop} onChange={patchNode} onChangeMany={moveSelected} viewport={viewport} onViewportChange={setViewport} /></main>
      <aside aria-label="Propiedades del objeto" className="w-80 shrink-0 overflow-hidden border-l border-zinc-200 bg-white"><CanvasInspector key={selectedGroup ? `group:${selectedGroup.id}` : selectedNodeIds.length > 1 ? "multiple" : selected?.id ?? "canvas"} node={selected} group={selectedGroup} selectedCount={selectedNodeIds.length} document={document} assets={assets} onCanvasSizeChange={setCanvasSize} onOpenModalMedia={openModalMediaPicker} onOpenBackgroundImage={openBackgroundImagePicker} onChange={(patch) => selected && (!nodeLayerState(document, selected).effectiveLocked || Object.keys(patch).every((key) => key === "locked")) && patchNode(selected.id, patch)} onChangeSelected={patchSelected} onDuplicate={duplicate} onMoveLayer={moveLayer} onDelete={deleteSelected} onRename={(name) => selected && !nodeLayerState(document, selected).effectiveLocked && patchNode(selected.id, { name })} onOpacityChange={(opacity) => selected && !nodeLayerState(document, selected).effectiveLocked && patchNode(selected.id, { opacity })} onGroupChange={(patch) => selectedGroup && patchGroup(selectedGroup.id, patch)} onUngroup={() => selectedGroup && ungroup(selectedGroup.id)} /></aside>
    </div>
    </div>
    {clipboardNotice && <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white shadow-xl">{clipboardNotice}</div>}
    {previewOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewOpen(false); }}><div className="relative h-[min(90vh,720px)] w-[min(92vw,1100px)] overflow-hidden rounded-xl bg-zinc-100 shadow-2xl" role="dialog" aria-modal="true" aria-label="Vista previa del menú"><button type="button" className="absolute right-3 top-3 z-10 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-800 shadow" onClick={() => setPreviewOpen(false)}>Cerrar vista previa</button><CanvasStage document={document} assets={assetMap} onTextModalOpen={setPreviewAsset} /></div></div>}
    <MediaModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
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

function normalizeDocument(document: CanvasDocumentV1): CanvasDocumentV1 {
  return { ...document, nodes: document.nodes.map((node) => {
    const width = Math.max(4, finiteOr(node.width, 4));
    const height = Math.max(4, finiteOr(node.height, 4));
    const normalized = { ...node, x: finiteOr(node.x, document.canvasBounds.x + (document.canvasBounds.width - width) / 2), y: finiteOr(node.y, document.canvasBounds.y + (document.canvasBounds.height - height) / 2), width, height, rotation: finiteOr(node.rotation, 0), opacity: Math.max(0, Math.min(1, finiteOr(node.opacity, 1))) } as CanvasNode;
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
