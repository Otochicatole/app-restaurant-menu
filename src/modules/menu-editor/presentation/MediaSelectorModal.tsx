"use client";

import { useId, useMemo, useState } from "react";
import { Check, Film, Image as ImageIcon, LoaderCircle, Search, Square, Trash2, Type, Upload, X } from "lucide-react";
import type { MenuAssetView } from "../contracts";
import { FloatingModalWindow } from "./FloatingModalWindow";
import { AssetThumbnail } from "./EditorToolsPanel";

export type MediaSelectorTarget = {
  nodeId: string;
  nodeType: "text" | "shape" | "image" | "icon";
  nodeName: string;
  role: "modal" | "background" | "imageAsset";
  currentAssetId: string | null;
};

export interface MediaSelectorModalProps {
  target: MediaSelectorTarget | null;
  assets: MenuAssetView[];
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: MenuAssetView) => void;
  onRemoveAsset: () => void;
  onUploadAsset: (kind: "IMAGE" | "VIDEO", file: File) => Promise<void>;
  zIndex?: number;
  onFocus?: () => void;
}

export function MediaSelectorModal({
  target,
  assets,
  isOpen,
  onClose,
  onSelectAsset,
  onRemoveAsset,
  onUploadAsset,
  zIndex = 80,
  onFocus,
}: MediaSelectorModalProps) {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"ALL" | "IMAGE" | "VIDEO">("ALL");
  const [uploading, setUploading] = useState<"IMAGE" | "VIDEO" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const searchInputId = useId();

  const isVideoAllowed = target?.role === "modal";

  const targetMeta = useMemo(() => {
    if (!target) return null;
    if (target.role === "modal") {
      return {
        roleTitle: "Multimedia emergente al hacer clic",
        roleDesc: "Se abrirá en pantalla completa cuando el cliente toque este texto en la carta digital.",
        formatLabel: "Imágenes o videos (JPG, PNG, WebP, MP4, WebM)",
        allowsVideo: true,
      };
    }
    if (target.role === "background") {
      return {
        roleTitle: "Imagen de fondo del rectángulo",
        roleDesc: "Se aplicará como fondo visible dentro de este rectángulo.",
        formatLabel: "Solo imágenes (JPG, PNG, WebP)",
        allowsVideo: false,
      };
    }
    return {
      roleTitle: "Imagen del elemento",
      roleDesc: "Reemplazará el archivo de imagen actual de este elemento en el lienzo.",
      formatLabel: "Solo imágenes (JPG, PNG, WebP)",
      allowsVideo: false,
    };
  }, [target]);

  const currentAsset = useMemo(() => {
    if (!target?.currentAssetId) return null;
    return assets.find((asset) => asset.id === target.currentAssetId) ?? null;
  }, [target, assets]);

  // Filter assets by target compatibility (images only vs image + video)
  const compatibleAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (!isVideoAllowed) return asset.kind === "IMAGE";
      return asset.kind === "IMAGE" || asset.kind === "VIDEO";
    });
  }, [assets, isVideoAllowed]);

  // Apply tab and text search
  const visibleAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return compatibleAssets.filter((asset) => {
      if (isVideoAllowed && kindFilter !== "ALL" && asset.kind !== kindFilter) return false;
      if (query && !asset.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [compatibleAssets, isVideoAllowed, kindFilter, search]);

  const handleUpload = async (kind: "IMAGE" | "VIDEO", file: File) => {
    setUploading(kind);
    setUploadError(null);
    try {
      await onUploadAsset(kind, file);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setUploading(null);
    }
  };

  const targetIcon = useMemo(() => {
    if (!target) return null;
    if (target.nodeType === "text") return <Type size={16} className="text-[#253621]" />;
    if (target.nodeType === "shape") return <Square size={16} className="text-[#253621]" />;
    return <ImageIcon size={16} className="text-[#253621]" />;
  }, [target]);

  const targetTypeBadge = useMemo(() => {
    if (!target) return "";
    if (target.nodeType === "text") return "Texto";
    if (target.nodeType === "shape") return "Rectángulo";
    return "Imagen";
  }, [target]);

  if (!target) return null;

  return (
    <FloatingModalWindow
      id="media-selector"
      title="Seleccionar multimedia"
      subtitle={`Asignar a ${targetTypeBadge.toLowerCase()}: ${target.nodeName}`}
      icon={targetIcon}
      isOpen={isOpen}
      onClose={onClose}
      initialPosition={{ x: 380, y: 70 }}
      initialSize={{ width: 480, height: 620 }}
      minWidth={360}
      minHeight={420}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50/50">
        {/* Banner with Target Details */}
        <section aria-label="Objeto de destino" className="shrink-0 border-b border-zinc-200 bg-white p-3.5 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#253621]/10 text-[#253621]">
                {targetIcon}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#253621]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#182618]">
                    {targetTypeBadge}
                  </span>
                  <p className="truncate text-xs font-semibold text-zinc-900" title={target.nodeName}>
                    {target.nodeName}
                  </p>
                </div>
                <p className="mt-1 text-[11px] font-medium text-zinc-800">
                  {targetMeta?.roleTitle}
                </p>
                <p className="text-[10px] leading-4 text-zinc-500">
                  {targetMeta?.roleDesc}
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium ${
                isVideoAllowed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              {targetMeta?.formatLabel}
            </span>
          </div>

          {/* Currently Assigned Asset Preview */}
          {currentAsset ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-emerald-300 bg-white">
                  <AssetThumbnail asset={currentAsset} />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                    <Check size={11} className="stroke-[3]" /> Asignado actualmente
                  </span>
                  <p className="truncate text-xs font-semibold text-zinc-800" title={currentAsset.name}>
                    {currentAsset.name}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {currentAsset.kind === "VIDEO" ? "Video" : "Imagen"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-red-700 shadow-2xs hover:bg-red-50 hover:border-red-300 transition"
                onClick={onRemoveAsset}
                title="Desvincular multimedia de este objeto"
              >
                <Trash2 size={12} /> Quitar
              </button>
            </div>
          ) : (
            <div className="mt-2.5 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-500">
              No hay multimedia asignada a este objeto. Seleccioná una abajo o subí un archivo nuevo.
            </div>
          )}
        </section>

        {/* Toolbar: Upload & Search */}
        <div className="shrink-0 space-y-2 border-b border-zinc-200 bg-white p-3">
          {/* Quick upload buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <label
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#253621]/30 bg-[#253621]/5 px-3 py-1.5 text-xs font-semibold text-[#182618] transition hover:border-[#253621] hover:bg-[#253621]/10 ${
                uploading !== null ? "pointer-events-none opacity-50" : "cursor-pointer"
              }`}
            >
              {uploading === "IMAGE" ? (
                <LoaderCircle size={14} className="animate-spin text-[#253621]" />
              ) : (
                <Upload size={14} className="text-[#253621]" />
              )}
              <span>{uploading === "IMAGE" ? "Subiendo..." : "Subir y asignar imagen"}</span>
              <input
                className="hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading !== null}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload("IMAGE", file);
                  e.currentTarget.value = "";
                }}
              />
            </label>

            {isVideoAllowed && (
              <label
                className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-[#253621] hover:bg-[#253621]/5 hover:text-[#182618] ${
                  uploading !== null ? "pointer-events-none opacity-50" : "cursor-pointer"
                }`}
              >
                {uploading === "VIDEO" ? (
                  <LoaderCircle size={14} className="animate-spin text-zinc-700" />
                ) : (
                  <Film size={14} className="text-zinc-600" />
                )}
                <span>{uploading === "VIDEO" ? "Subiendo..." : "Subir y asignar video"}</span>
                <input
                  className="hidden"
                  type="file"
                  accept="video/mp4,video/webm"
                  disabled={uploading !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload("VIDEO", file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            )}
          </div>

          {uploadError && (
            <p role="alert" className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
              {uploadError}
            </p>
          )}

          {/* Search bar and Kind filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                id={searchInputId}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-8 pr-7 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-[#253621] focus:bg-white focus:ring-1 focus:ring-[#253621]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-400 hover:text-zinc-600"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {isVideoAllowed && (
              <div className="flex shrink-0 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setKindFilter("ALL")}
                  className={`rounded-md px-2 py-1 font-medium transition ${
                    kindFilter === "ALL" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setKindFilter("IMAGE")}
                  className={`rounded-md px-2 py-1 font-medium transition ${
                    kindFilter === "IMAGE" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Fotos
                </button>
                <button
                  type="button"
                  onClick={() => setKindFilter("VIDEO")}
                  className={`rounded-md px-2 py-1 font-medium transition ${
                    kindFilter === "VIDEO" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Videos
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Assets Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {visibleAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-12 px-4 text-center">
              <ImageIcon size={32} className="mb-2 text-zinc-300" />
              <p className="text-xs font-semibold text-zinc-700">
                {search ? "No se encontraron archivos" : "No hay multimedia disponible"}
              </p>
              <p className="mt-0.5 max-w-xs text-[11px] text-zinc-400">
                {search
                  ? "Probá con otra búsqueda o limpiá el filtro para ver todos los archivos."
                  : isVideoAllowed
                  ? "Subí imágenes o videos para asignarlos a este elemento."
                  : "Subí imágenes para aplicarlas como fondo a este elemento."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(125px,1fr))] gap-2.5">
              {visibleAssets.map((asset) => {
                const isSelected = target.currentAssetId === asset.id;
                return (
                  <div
                    key={asset.id}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white transition hover:shadow-md ${
                      isSelected
                        ? "border-[#253621] ring-2 ring-[#253621]/20 bg-[#253621]/5"
                        : "border-zinc-200 hover:border-[#253621]/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectAsset(asset)}
                      className="flex flex-col p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#253621]"
                      title={`Asignar “${asset.name}” a ${target.nodeName}`}
                    >
                      <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-zinc-100">
                        <AssetThumbnail asset={asset} />
                        <span className="absolute right-1.5 top-1.5 rounded bg-zinc-900/80 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-2xs backdrop-blur-xs">
                          {asset.kind === "VIDEO" ? "Video" : "IMG"}
                        </span>
                        {isSelected && (
                          <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#182618] text-white shadow-md">
                            <Check size={12} className="stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <p className="mt-2 truncate text-xs font-medium text-zinc-800" title={asset.name}>
                        {asset.name}
                      </p>
                    </button>

                    <div className="mt-auto border-t border-zinc-100 bg-zinc-50/70 p-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectAsset(asset)}
                        className={`w-full rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                          isSelected
                            ? "bg-[#182618] text-white shadow-2xs"
                            : "bg-white text-zinc-700 border border-zinc-200 group-hover:bg-[#253621] group-hover:text-white group-hover:border-[#253621]"
                        }`}
                      >
                        {isSelected ? "Asignado" : "Asignar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="flex shrink-0 items-center justify-between border-t border-zinc-200 bg-white px-3.5 py-2.5">
          <p className="text-[11px] text-zinc-500">
            {compatibleAssets.length} {compatibleAssets.length === 1 ? "archivo disponible" : "archivos disponibles"}
          </p>
          <div className="flex items-center gap-2">
            {currentAsset && (
              <button
                type="button"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                onClick={onRemoveAsset}
              >
                Quitar asignación
              </button>
            )}
            <button
              type="button"
              className="rounded-lg bg-[#182618] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#253621] transition"
              onClick={onClose}
            >
              Listo
            </button>
          </div>
        </footer>
      </div>
    </FloatingModalWindow>
  );
}
