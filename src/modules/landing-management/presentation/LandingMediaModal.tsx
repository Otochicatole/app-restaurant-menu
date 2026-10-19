"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Image as ImageIcon,
  Link2,
  Loader2,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

type UploadedImageAsset = {
  id: string;
  name: string;
  mimeType: string;
  byteSize: number;
  width?: number | null;
  height?: number | null;
  createdAt: string;
};

type CuratedStockPhoto = {
  label: string;
  category: string;
  url: string;
};

const CURATED_STOCK_PHOTOS: CuratedStockPhoto[] = [
  {
    label: "Salón Gastronómico Cálido",
    category: "Ambiente",
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "Parrilla & Corte de Autor",
    category: "Platos",
    url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "Mesa Compartida & Tapas",
    category: "Platos",
    url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "Barra de Coctelería",
    category: "Bebidas",
    url: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "Cocina & Emplatado",
    category: "Ambiente",
    url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80",
  },
  {
    label: "Pastas & Cocina Italiana",
    category: "Platos",
    url: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1000&q=80",
  },
];

interface LandingMediaModalProps {
  open: boolean;
  tenantSlug: string;
  currentUrl?: string;
  title?: string;
  onClose: () => void;
  onSelectUrl: (url: string, altSuggestion?: string) => void;
}

export function LandingMediaModal({
  open,
  tenantSlug,
  currentUrl = "",
  title = "Biblioteca de Imágenes",
  onClose,
  onSelectUrl,
}: LandingMediaModalProps) {
  const [activeTab, setActiveTab] = useState<"library" | "stock" | "url">("library");
  const [assets, setAssets] = useState<UploadedImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [externalUrl, setExternalUrl] = useState(currentUrl);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const buildPublicAssetUrl = useCallback(
    (assetId: string) =>
      `/api/public/landing/${encodeURIComponent(tenantSlug)}/assets/${encodeURIComponent(assetId)}/file`,
    [tenantSlug],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/editor/assets?kind=IMAGE", {
          credentials: "same-origin",
        });
        const payload = (await res.json()) as {
          ok?: boolean;
          data?: UploadedImageAsset[];
          error?: { message?: string };
        };
        if (cancelled) return;
        if (!res.ok || !payload.ok) {
          setError(
            payload.error?.message ?? "No se pudieron cargar las imágenes.",
          );
        } else {
          setAssets(payload.data ?? []);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar la galería del restaurante.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("kind", "IMAGE");
      form.append("name", file.name.replace(/\.[^.]+$/, ""));
      form.append("file", file);

      const res = await fetch("/api/editor/assets", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        data?: UploadedImageAsset;
        error?: { message?: string };
      };

      if (!res.ok || !payload.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "No se pudo subir la imagen.",
        );
      }

      const uploaded = payload.data;
      setAssets((prev) => [uploaded, ...prev]);
      const publicUrl = buildPublicAssetUrl(uploaded.id);
      onSelectUrl(publicUrl, uploaded.name);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al subir el archivo.",
      );
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/45 p-4 backdrop-blur-xs">
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <ImageIcon className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
              <p className="text-[11px] text-zinc-500">
                Subí fotos de tu restaurante o seleccioná una de tu galería
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-500 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading ? "Subiendo..." : "Subir Imagen (JPG/PNG/WebP)"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-2.5">
          <div className="flex items-center gap-1 rounded-lg bg-zinc-200/75 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("library")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "library"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
              Mis Fotos ({assets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stock")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "stock"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Fotos Sugeridas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("url")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "url"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Link2 className="h-3.5 w-3.5 text-violet-600" />
              URL Externa
            </button>
          </div>

          {activeTab === "library" && (
            <div className="relative w-56">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar imagen..."
                className="w-full rounded-lg border border-zinc-300 bg-white py-1.5 pr-3 pl-8 text-xs text-zinc-800 placeholder-zinc-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "library" && (
            <>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
                  <Loader2 className="mb-2 h-6 w-6 animate-spin text-blue-600" />
                  <p className="text-xs">Cargando galería del restaurante...</p>
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/60 py-14 text-center">
                  <ImageIcon className="mb-2.5 h-9 w-9 text-zinc-300" />
                  <p className="text-sm font-semibold text-zinc-700">
                    {searchQuery
                      ? "No hay imágenes que coincidan con tu búsqueda"
                      : "Todavía no subiste imágenes"}
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-zinc-500">
                    Subí fotos en formato JPG, PNG o WebP (hasta 5 MB). También se comparten con el editor de tu carta digital.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                  >
                    <Upload className="h-3.5 w-3.5" /> Subir primera foto
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
                  {filteredAssets.map((asset) => {
                    const assetUrl = buildPublicAssetUrl(asset.id);
                    const isSelected = currentUrl === assetUrl;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          onSelectUrl(assetUrl, asset.name);
                          onClose();
                        }}
                        className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition ${
                          isSelected
                            ? "border-blue-600 ring-2 ring-blue-500/20"
                            : "border-zinc-200 hover:border-blue-400 hover:shadow-md"
                        }`}
                      >
                        <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={assetUrl}
                            alt={asset.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                          {isSelected && (
                            <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 bg-white p-2.5">
                          <span className="truncate text-xs font-semibold text-zinc-800">
                            {asset.name}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {asset.width && asset.height
                              ? `${asset.width}×${asset.height}px · `
                              : ""}
                            {Math.max(1, Math.round(asset.byteSize / 1024))} KB
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "stock" && (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              {CURATED_STOCK_PHOTOS.map((photo) => {
                const isSelected = currentUrl === photo.url;
                return (
                  <button
                    key={photo.url}
                    type="button"
                    onClick={() => {
                      onSelectUrl(photo.url, photo.label);
                      onClose();
                    }}
                    className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition ${
                      isSelected
                        ? "border-blue-600 ring-2 ring-blue-500/20"
                        : "border-zinc-200 hover:border-blue-400 hover:shadow-md"
                    }`}
                  >
                    <div className="relative aspect-4/3 w-full overflow-hidden bg-zinc-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.label}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <span className="absolute top-2 left-2 rounded-md bg-zinc-900/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                        {photo.category}
                      </span>
                    </div>
                    <div className="bg-white p-2.5">
                      <span className="block truncate text-xs font-semibold text-zinc-800">
                        {photo.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === "url" && (
            <div className="mx-auto max-w-lg space-y-4 py-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Pegar enlace directo de imagen (https://...)
                </label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://ejemplo.com/mi-plato.jpg"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              {externalUrl.trim() && (
                <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                  <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
                    Vista previa
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={externalUrl}
                    alt="Vista previa"
                    className="max-h-52 w-full rounded-lg object-cover"
                  />
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!externalUrl.trim()}
                  onClick={() => {
                    onSelectUrl(externalUrl.trim());
                    onClose();
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  Usar esta URL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
