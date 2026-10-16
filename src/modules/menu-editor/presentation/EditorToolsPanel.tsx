"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { CheckCircle2, ChevronDown, Circle, Download, Film, FileUp, ImagePlus, LayoutTemplate, Layers, LoaderCircle, Minus, Search, Square, Type, Upload, X } from "lucide-react";
import { DynamicIcon } from "lucide-react/dynamic";
import { LUCIDE_ICON_NAMES, humanizeLucideIconName, searchLucideIconNames, type LucideIconName } from "../domain/lucide-icon-catalog";
import { createCanvasLayerIndex } from "../domain/layer-tree";
import type { CanvasNode, MenuAssetView, MenuTemplateView } from "../contracts";

type Shape = "rect" | "ellipse" | "line" | "arrow" | "triangle" | "star";
export type CanvasDropItem = { kind: "text" | "shape" | "icon" | "image"; shape?: Shape; iconKey?: string; assetId?: string };

export function EditorToolsPanel({
  layersOpen,
  onToggleLayers,
  onOpenIcons,
  onOpenImages,
  onOpenTemplates,
  onAddText,
  onAddShape,
}: {
  layersOpen: boolean;
  onToggleLayers: () => void;
  onOpenIcons: (open: boolean) => void;
  onOpenImages: (open: boolean) => void;
  onOpenTemplates: (open: boolean) => void;
  onAddText: () => void;
  onAddShape: (shape: Shape) => void;
}) {
  const [openAdd, setOpenAdd] = useState(true);

  return (
    <aside className="w-56 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3 flex flex-col gap-3">
      <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Capas</p>
        <button
          type="button"
          onClick={onToggleLayers}
          aria-pressed={layersOpen}
          aria-label={layersOpen ? "Ocultar panel de capas" : "Mostrar panel de capas"}
          title={layersOpen ? "Ocultar panel de capas" : "Mostrar panel de capas"}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition shadow-xs ${
            layersOpen
              ? "border-[#253621]/25 bg-[#253621]/5 text-[#182618]"
              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Layers size={16} className={layersOpen ? "text-[#253621]" : "text-zinc-400"} />
            <span className="font-semibold text-zinc-800">Panel de capas</span>
          </span>
          <span
            aria-hidden="true"
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out ${
              layersOpen ? "bg-[#253621]" : "bg-zinc-200"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out ${
                layersOpen ? "translate-x-4.5" : "translate-x-1"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Direct Buttons for Media, Iconos, Plantillas (Opens Movable & Resizable Modals) */}
      <div className="space-y-1.5">
        <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Recursos</p>
        <button
          type="button"
          onClick={() => onOpenImages(true)}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-xs font-medium text-zinc-700 shadow-sm transition hover:border-[#253621]/40 hover:bg-[#253621]/5 hover:text-[#182618]"
        >
          <span className="flex items-center gap-2.5">
            <ImagePlus size={16} className="text-[#253621]" />
            <span className="font-semibold text-zinc-800">Media</span>
          </span>
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">Abrir</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenIcons(true)}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-xs font-medium text-zinc-700 shadow-sm transition hover:border-[#253621]/40 hover:bg-[#253621]/5 hover:text-[#182618]"
        >
          <span className="flex items-center gap-2.5">
            <Search size={16} className="text-[#253621]" />
            <span className="font-semibold text-zinc-800">Iconos</span>
          </span>
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">Abrir</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenTemplates(true)}
          className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left text-xs font-medium text-zinc-700 shadow-sm transition hover:border-[#253621]/40 hover:bg-[#253621]/5 hover:text-[#182618]"
        >
          <span className="flex items-center gap-2.5">
            <LayoutTemplate size={16} className="text-[#253621]" />
            <span className="font-semibold text-zinc-800">Plantillas</span>
          </span>
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">Abrir</span>
        </button>
      </div>

      <div className="border-t border-zinc-100 pt-1 space-y-2">
        <ToolSection label="Agregar formas" open={openAdd} onToggle={() => setOpenAdd(!openAdd)}>
          <div className="flex flex-col gap-1.5">
            <ToolButton dragData={{ kind: "text" }} icon={<Type size={16} />} label="Texto" onClick={() => onAddText()} />
            <ToolButton dragData={{ kind: "shape", shape: "rect" }} icon={<Square size={16} />} label="Rectángulo" onClick={() => onAddShape("rect")} />
            <ToolButton dragData={{ kind: "shape", shape: "ellipse" }} icon={<Circle size={16} />} label="Elipse" onClick={() => onAddShape("ellipse")} />
            <ToolButton dragData={{ kind: "shape", shape: "line" }} icon={<Minus size={16} />} label="Línea" onClick={() => onAddShape("line")} />
          </div>
        </ToolSection>
      </div>
    </aside>
  );
}

export function TemplatePickerDrawer({ templates, assets, onClose, onApply, onSaveTemplate, onDelete, onImport }: { templates: MenuTemplateView[]; assets: MenuAssetView[]; onClose: () => void; onApply: (template: MenuTemplateView) => void; onSaveTemplate: (submitPublic: boolean) => void; onDelete: (template: MenuTemplateView) => void; onImport: (file: File) => Promise<void> }) {
  return (
    <aside id="editor-templates" className="flex h-full w-80 min-w-72 shrink-0 flex-col border-r border-zinc-200 bg-white p-3">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Plantillas</p>
          <p className="mt-1 text-[10px] text-zinc-400">Diseños listos para tu carta</p>
        </div>
        <button className="rounded p-1 text-zinc-500 hover:bg-zinc-100" onClick={onClose} aria-label="Volver a capas"><X size={17} /></button>
      </div>
      <TemplateLibrary templates={templates} assets={assets} onApply={onApply} onSaveTemplate={onSaveTemplate} onDelete={onDelete} onImport={onImport} />
    </aside>
  );
}

export function TemplateLibrary({ templates, assets, onApply, onSaveTemplate, onDelete, onImport }: { templates: MenuTemplateView[]; assets: MenuAssetView[]; onApply: (template: MenuTemplateView) => void; onSaveTemplate: (submitPublic: boolean) => void; onDelete: (template: MenuTemplateView) => void; onImport: (file: File) => Promise<void> }) {
  const [filter, setFilter] = useState<"ALL" | "PUBLIC" | "PRIVATE">("ALL");
  const [importing, setImporting] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const visible = useMemo(() => templates.filter((template) => filter === "ALL" || template.visibility === filter || (filter === "PUBLIC" && template.isSystem)), [filter, templates]);
  const assetMap = useMemo(() => Object.fromEntries(assets.map((asset) => [asset.id, asset])), [assets]);
  const importFile = async (file: File) => {
    setImporting(true);
    setTransferError(null);
    setTransferSuccess(null);
    try { await onImport(file); setFilter("PRIVATE"); setTransferSuccess("Plantilla importada correctamente."); }
    catch (error) { setTransferError(error instanceof Error ? error.message : "No se pudo importar la plantilla."); }
    finally { setImporting(false); }
  };
  const exportFile = async (template: MenuTemplateView) => {
    setExportingId(template.id);
    setTransferError(null);
    setTransferSuccess(null);
    try {
      const response = await fetch(`/api/editor/templates/${encodeURIComponent(template.id)}/export`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message ?? "No se pudo exportar la plantilla.");
      }
      const blob = await response.blob();
      const filename = responseFilename(response.headers.get("Content-Disposition"), `${template.name}.menutemplate`);
      const url = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href = url;
      download.download = filename;
      download.hidden = true;
      document.body.appendChild(download);
      download.click();
      download.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setTransferSuccess(`Archivo listo: ${filename}`);
    } catch (error) {
      setTransferError(error instanceof Error ? error.message : "No se pudo exportar la plantilla.");
    } finally {
      setExportingId(null);
    }
  };
  const transferBusy = importing || exportingId !== null;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="grid shrink-0 grid-cols-3 gap-1">
        <button className={`rounded-lg px-1 py-1 text-[10px] transition-colors ${filter === "ALL" ? "bg-[#253621]/15 text-[#182618] font-medium" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"}`} onClick={() => setFilter("ALL")}>Todas</button>
        <button className={`rounded-lg px-1 py-1 text-[10px] transition-colors ${filter === "PUBLIC" ? "bg-[#253621]/15 text-[#182618] font-medium" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"}`} onClick={() => setFilter("PUBLIC")}>Públicas</button>
        <button className={`rounded-lg px-1 py-1 text-[10px] transition-colors ${filter === "PRIVATE" ? "bg-[#253621]/15 text-[#182618] font-medium" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100"}`} onClick={() => setFilter("PRIVATE")}>Privadas</button>
      </div>
      <label className={`relative flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed border-[#253621]/30 bg-[#253621]/5 px-3 py-2 text-[11px] font-semibold text-[#182618] transition-colors ${transferBusy ? "cursor-wait opacity-70" : "cursor-pointer hover:border-[#253621]/60"}`} aria-busy={importing}>
        {importing ? <LoaderCircle className="animate-spin motion-reduce:animate-none" size={14} aria-hidden="true" /> : <FileUp size={14} aria-hidden="true" />}
        {importing ? "Importando plantilla…" : "Importar archivo .menutemplate"}
        {importing && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-[#253621] motion-reduce:animate-none" />}
        <input className="sr-only" type="file" accept=".menutemplate,application/vnd.restaurant-menu.template" disabled={transferBusy} aria-label="Importar plantilla completa" onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) void importFile(file).finally(() => { input.value = ""; }); }} />
      </label>
      {transferError && <p role="alert" className="shrink-0 rounded-lg bg-red-50 px-2.5 py-2 text-[10px] leading-4 text-red-800">{transferError}</p>}
      {transferSuccess && <p role="status" className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#253621]/10 px-2.5 py-2 text-[10px] leading-4 text-[#253621]"><CheckCircle2 size={13} aria-hidden="true" /> <span className="min-w-0 truncate">{transferSuccess}</span></p>}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {visible.map((template) => {
          const exporting = exportingId === template.id;
          return (
            <article key={template.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white hover:border-[#253621]/30 transition">
              <TemplateMiniature document={template.document} assets={assetMap} />
              <div className="p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs font-semibold text-zinc-800">{template.name}</p>
                  <span className="shrink-0 rounded bg-zinc-100 px-1 py-0.5 text-[9px] text-zinc-500">{template.isSystem ? "Preset" : statusLabel(template.status)}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-zinc-500">{template.description}</p>
                <div className="mt-2.5 flex items-center justify-between gap-1">
                  <span className="text-[9px] uppercase tracking-wide text-zinc-400">{template.visibility === "PUBLIC" ? "Pública" : "Privada"}</span>
                  <div className="flex gap-1">
                    <button type="button" disabled={transferBusy} aria-busy={exporting} className="inline-flex min-w-[70px] items-center justify-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60" onClick={() => void exportFile(template)} aria-label={exporting ? `Exportando ${template.name}` : `Exportar ${template.name}`}>
                      {exporting ? <LoaderCircle className="animate-spin motion-reduce:animate-none" size={11} aria-hidden="true" /> : <Download size={11} aria-hidden="true" />}
                      {exporting ? "Exportando…" : "Exportar"}
                    </button>
                    <button className="rounded-lg bg-[#182618] px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-[#253621]" onClick={() => onApply(template)}>Usar</button>
                    {!template.isSystem && template.visibility === "PRIVATE" && <button className="rounded-lg border border-red-200 px-2 py-1 text-[10px] text-red-700 hover:bg-red-50" onClick={() => onDelete(template)} aria-label={`Eliminar ${template.name}`}>×</button>}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="grid shrink-0 grid-cols-2 gap-1.5 border-t border-zinc-100 pt-2">
        <button className="rounded-lg border border-zinc-200 px-2 py-1.5 text-[10px] font-medium hover:bg-zinc-50 text-zinc-700" onClick={() => onSaveTemplate(false)}>Guardar borrador</button>
        <button className="rounded-lg border border-[#253621]/20 px-2 py-1.5 text-[10px] font-medium text-[#253621] hover:bg-[#253621]/5" onClick={() => onSaveTemplate(true)}>Enviar comunidad</button>
      </div>
    </div>
  );
}

function responseFilename(contentDisposition: string | null, fallback: string): string {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quoted = contentDisposition?.match(/filename="([^"]+)"/i)?.[1];
  let candidate = quoted ?? fallback;
  if (encoded) { try { candidate = decodeURIComponent(encoded); } catch { candidate = fallback; } }
  const safe = candidate.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").trim();
  return safe || "plantilla.menutemplate";
}

function statusLabel(status: MenuTemplateView["status"]): string {
  return ({ DRAFT: "Borrador", PENDING: "Pendiente", PUBLISHED: "Publicada", REJECTED: "Rechazada", ARCHIVED: "Archivada" })[status];
}

export function TemplateMiniature({ document, assets = {}, large = false, preview = false }: { document: MenuTemplateView["document"]; assets?: Record<string, { url: string }>; large?: boolean; preview?: boolean }) {
  const scale = preview ? Math.min(0.42, 680 / Math.max(document.canvasBounds.width, document.canvasBounds.height)) : large ? 0.18 : 0.12;
  const height = preview ? "min(62vh, 620px)" : large ? "11rem" : "6rem";
  const layerIndex = useMemo(() => createCanvasLayerIndex(document), [document]);
  const visibleNodes = useMemo(() => document.nodes.filter((node) => layerIndex.nodeStates.get(node.id)?.effectiveVisible).slice(0, 30), [document.nodes, layerIndex]);
  return (
    <div className="relative overflow-hidden border-b border-zinc-100 bg-zinc-100" style={{ height }}>
      <div className="absolute left-1/2 top-1/2 origin-center" style={{ width: document.canvasBounds.width * scale, height: document.canvasBounds.height * scale, transform: "translate(-50%,-50%)", background: document.background }}>
        <div className="relative h-full w-full">{visibleNodes.map((node) => <MiniatureNode key={node.id} node={node} origin={document.canvasBounds} scale={scale} assets={assets} />)}</div>
      </div>
    </div>
  );
}

function MiniatureNode({ node, origin, scale, assets }: { node: CanvasNode; origin: { x: number; y: number }; scale: number; assets: Record<string, { url: string }> }) {
  const backgroundImage = node.type === "shape" && node.shape === "rect" && node.backgroundImage ? node.backgroundImage : null;
  const imageAsset = backgroundImage ? assets[backgroundImage.assetId] : undefined;
  const gradient = node.type === "shape" && node.shape === "rect" ? node.fillGradient : null;
  const outerStyle: CSSProperties = { left: (node.x - origin.x) * scale, top: (node.y - origin.y) * scale, width: Math.max(2, node.width * scale), height: Math.max(2, node.height * scale), transform: `rotate(${node.rotation}deg)`, color: node.type === "text" || node.type === "icon" ? node.fill : undefined, background: node.type === "shape" && node.shape !== "line" && node.shape !== "arrow" ? node.fill ?? "transparent" : undefined, ...miniatureStrokeStyle(node, scale), borderRadius: node.type === "shape" && node.shape === "ellipse" ? "50%" : node.type === "shape" ? `${node.cornerRadii.topLeft * scale}px ${node.cornerRadii.topRight * scale}px ${node.cornerRadii.bottomRight * scale}px ${node.cornerRadii.bottomLeft * scale}px` : undefined, fontSize: node.type === "text" ? Math.max(3, node.fontSize * scale) : undefined, fontFamily: node.type === "text" ? node.fontFamily : undefined, fontStyle: node.type === "text" ? node.fontStyle : undefined, fontWeight: node.type === "text" ? node.fontWeight : undefined, whiteSpace: "pre-wrap" };
  return <span className="absolute block overflow-hidden" style={outerStyle}>{backgroundImage && imageAsset && <span className="absolute inset-0 block" style={{ backgroundImage: `url(${imageAsset.url})`, backgroundPosition: `${backgroundImage.positionX * 100}% ${backgroundImage.positionY * 100}%`, backgroundRepeat: "no-repeat", backgroundSize: backgroundImage.fit === "stretch" ? "100% 100%" : backgroundImage.fit, opacity: backgroundImage.opacity }} />}{gradient && <span className="absolute inset-0 block" style={{ backgroundImage: `linear-gradient(${gradient.angle}deg, ${gradient.stops[0].color} ${gradient.stops[0].offset * 100}%, ${gradient.stops[1].color} ${gradient.stops[1].offset * 100}%)` }} />}{node.type === "text" ? node.text : node.type === "icon" ? "✦" : ""}</span>;
}

function miniatureStrokeStyle(node: CanvasNode, scale: number) {
  if (node.type !== "shape" || !node.stroke || node.strokeWidth <= 0) return {};
  const border = `${Math.max(1, node.strokeWidth * scale)}px solid ${node.stroke}`;
  if (node.shape !== "rect") return { border };
  return {
    borderTop: node.strokeSides.includes("top") ? border : undefined,
    borderRight: node.strokeSides.includes("right") ? border : undefined,
    borderBottom: node.strokeSides.includes("bottom") ? border : undefined,
    borderLeft: node.strokeSides.includes("left") ? border : undefined,
  };
}

function ToolSection({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="border-b border-zinc-100 py-1">
      <button type="button" className="flex w-full items-center justify-between px-1 py-2 text-left text-xs font-semibold text-zinc-700" onClick={onToggle} aria-expanded={open}>
        {label}
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="pb-3 pt-1">{children}</div>}
    </section>
  );
}

function ToolButton({ icon, label, onClick, dragData }: { icon: React.ReactNode; label: string; onClick: () => void; dragData?: CanvasDropItem }) {
  return (
    <button
      type="button"
      draggable={Boolean(dragData)}
      onDragStart={(event) => {
        if (dragData) {
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData("application/x-menu-editor-item", JSON.stringify(dragData));
        }
      }}
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-xs font-medium text-zinc-700 shadow-2xs transition hover:border-[#253621]/40 hover:bg-[#253621]/5 hover:text-[#182618]"
    >
      <span className="flex items-center gap-2.5">
        <span className="text-[#253621]">{icon}</span>
        <span className="font-semibold text-zinc-800">{label}</span>
      </span>
      <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">Agregar</span>
    </button>
  );
}

function UploadButton({ label, accept, onUpload }: { label: string; accept: string; onUpload: (file: File) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:border-[#253621] hover:bg-[#253621]/5 hover:text-[#182618]">
      <Upload size={14} /> {label}
      <input className="hidden" type="file" accept={accept} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.currentTarget.value = ""; }} />
    </label>
  );
}

export function IconPickerDrawer({ onClose, onSelect }: { onClose: () => void; onSelect: (name: string) => void }) {
  return (
    <aside id="editor-icons" className="w-72 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Iconos</p>
          <p className="mt-1 text-[10px] text-zinc-400">{LUCIDE_ICON_NAMES.length} diseños</p>
        </div>
        <button className="rounded p-1 text-zinc-500 hover:bg-zinc-100" onClick={onClose} aria-label="Volver a capas"><X size={17} /></button>
      </div>
      <IconPickerContent onSelect={onSelect} />
    </aside>
  );
}

export function IconPickerContent({ onSelect }: { onSelect: (name: string) => void }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(72);
  const names = useMemo(() => searchLucideIconNames(query).slice(0, limit), [query, limit]);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <label className="mb-3 flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-xs focus-within:border-[#253621] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#253621]/10 transition">
        <Search size={15} className="text-zinc-400 shrink-0" />
        <input
          autoFocus
          className="min-w-0 flex-1 bg-transparent text-xs outline-none text-zinc-800 placeholder-zinc-400"
          placeholder="Buscar entre 1,500+ iconos..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(72);
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="rounded p-0.5 text-zinc-400 hover:text-zinc-600"
            aria-label="Limpiar búsqueda"
          >
            <X size={13} />
          </button>
        )}
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
          {names.map((name) => (
            <button
              key={name}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "copy";
                event.dataTransfer.setData(
                  "application/x-menu-editor-item",
                  JSON.stringify({ kind: "icon", iconKey: name } satisfies CanvasDropItem)
                );
              }}
              className="group flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border border-zinc-100 bg-white p-2 text-center text-[10px] text-zinc-600 transition hover:border-[#253621]/40 hover:bg-[#253621]/5 hover:text-[#182618] hover:shadow-sm"
              onClick={() => onSelect(name)}
              title={humanizeLucideIconName(name)}
              aria-label={`Agregar icono ${humanizeLucideIconName(name)}`}
            >
              <DynamicIcon name={name as LucideIconName} size={22} strokeWidth={1.8} className="group-hover:scale-110 transition-transform" />
              <span className="line-clamp-2 max-w-full text-[9px] leading-tight font-medium text-zinc-700">
                {humanizeLucideIconName(name)}
              </span>
            </button>
          ))}
        </div>
        {limit < LUCIDE_ICON_NAMES.length && (
          <button
            type="button"
            className="mt-3 w-full rounded-xl border border-zinc-200 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
            onClick={() => setLimit((value) => value + 72)}
          >
            Cargar más iconos
          </button>
        )}
      </div>
    </div>
  );
}

export function MediaPickerDrawer({ images, onClose, onSelect, onDelete }: { images: MenuAssetView[]; onClose: () => void; onSelect: (asset: MenuAssetView) => void; onDelete: (asset: MenuAssetView) => Promise<void> }) {
  return (
    <aside id="editor-images" className="w-72 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Multimedia</p>
          <p className="mt-1 text-[10px] text-zinc-400">{images.length} archivos</p>
        </div>
        <button className="rounded p-1 text-zinc-500 hover:bg-zinc-100" onClick={onClose} aria-label="Volver a capas"><X size={17} /></button>
      </div>
      <MediaPickerContent images={images} onSelect={onSelect} onDelete={onDelete} />
    </aside>
  );
}

export function MediaPickerContent({
  images,
  onSelect,
  onDelete,
  onUpload,
}: {
  images: MenuAssetView[];
  onSelect: (asset: MenuAssetView) => void;
  onDelete: (asset: MenuAssetView) => Promise<void>;
  onUpload?: (kind: "IMAGE" | "VIDEO" | "FONT", file: File) => Promise<void>;
}) {
  const [pending, setPending] = useState<MenuAssetView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(40);
  const [uploading, setUploading] = useState(false);
  const visible = images.slice(0, limit);

  const handleUpload = async (kind: "IMAGE" | "VIDEO" | "FONT", file: File) => {
    if (!onUpload) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(kind, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir archivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      {onUpload && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <UploadButton
            label={uploading ? "Subiendo..." : "Subir imagen"}
            accept="image/jpeg,image/png,image/webp"
            onUpload={(file) => void handleUpload("IMAGE", file)}
          />
          <UploadButton
            label={uploading ? "Subiendo..." : "Subir video"}
            accept="video/mp4,video/webm"
            onUpload={(file) => void handleUpload("VIDEO", file)}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          {error}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-12 px-4 text-center">
            <ImagePlus size={32} className="text-zinc-300 mb-2" />
            <p className="text-xs font-semibold text-zinc-700">No hay multimedia disponible</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Sube imágenes o videos para tu carta</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2.5">
            {visible.map((asset) => (
              <div
                key={asset.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white hover:border-[#253621]/40 hover:shadow-md transition"
              >
                <button
                  type="button"
                  draggable={asset.kind === "IMAGE"}
                  onDragStart={(event) => {
                    if (asset.kind !== "IMAGE") return;
                    event.dataTransfer.effectAllowed = "copy";
                    event.dataTransfer.setData(
                      "application/x-menu-editor-item",
                      JSON.stringify({ kind: "image", assetId: asset.id } satisfies CanvasDropItem)
                    );
                  }}
                  className="flex flex-col w-full text-left p-1.5 focus:outline-none"
                  onClick={() => onSelect(asset)}
                  title={`Insertar ${asset.name}`}
                >
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-100 flex items-center justify-center">
                    <AssetThumbnail asset={asset} />
                    <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[8px] font-semibold text-white">
                      {asset.kind === "VIDEO" ? "Video" : "Foto"}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-[11px] font-medium text-zinc-800">
                    {asset.name}
                  </p>
                </button>

                <div className="border-t border-zinc-100 px-2 py-1 flex items-center justify-between bg-zinc-50/50">
                  <span className="text-[9px] text-zinc-400 truncate">
                    {asset.kind === "IMAGE" ? "Arrastrable" : "Click para ver"}
                  </span>
                  <button
                    type="button"
                    className="text-[10px] text-red-600 hover:text-red-800 font-medium px-1 py-0.5 rounded hover:bg-red-50 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      setError(null);
                      setPending(asset);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {limit < images.length && (
          <button
            type="button"
            className="mt-3 w-full rounded-xl border border-zinc-200 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition"
            onClick={() => setLimit((value) => value + 40)}
          >
            Cargar más multimedia
          </button>
        )}
      </div>

      {pending && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-image-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h2 id="delete-image-title" className="text-sm font-semibold text-zinc-900">¿Eliminar multimedia?</h2>
            <p className="mt-2 text-xs leading-5 text-zinc-600">Se eliminará “{pending.name}” de la biblioteca. Esta acción no se puede deshacer.</p>
            {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-xl border border-zinc-200 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50" onClick={() => { setPending(null); setError(null); }}>Cancelar</button>
              <button className="rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700" onClick={async () => {
                if (!pending) return;
                try {
                  await onDelete(pending);
                  setPending(null);
                  setError(null);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "No se pudo eliminar el multimedia.");
                }
              }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AssetThumbnail({ asset }: { asset: MenuAssetView }) {
  if (asset.kind === "VIDEO") return <span className="flex h-full w-full items-center justify-center bg-zinc-900 text-white"><Film size={22} /></span>;
  // The authenticated asset URL must be fetched by the browser; lazy loading avoids decoding the full library at once.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={asset.url} alt={asset.name} loading="lazy" decoding="async" className="h-full w-full bg-zinc-100 object-cover" />;
}
