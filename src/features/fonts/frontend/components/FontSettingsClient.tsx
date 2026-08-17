"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Info, Trash2, Upload } from "lucide-react";
import {
  FONT_CATEGORIES,
  FONT_CATEGORY_LABELS,
  type FontCategory,
  type FontDTO,
} from "../types";
import {
  AdminCard,
  AdminConfirmModal,
  AdminModal,
  AdminPageHeader,
  adminDangerButtonClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/shared/frontend/components/admin/AdminUI";

export interface FontActionResult {
  success: boolean;
  error?: { message: string };
}

interface FontSettingsClientProps {
  fonts: FontDTO[];
  activeFontId: string | null;
  selectFont: (fontId: string | null) => Promise<FontActionResult>;
  removeFont: (id: string) => Promise<FontActionResult>;
}

export function FontSettingsClient({ fonts, activeFontId, selectFont, removeFont }: FontSettingsClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | FontCategory>("all");
  const [busyFontId, setBusyFontId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmFont, setConfirmFont] = useState<FontDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const visibleFonts = useMemo(
    () => (filter === "all" ? fonts : fonts.filter((font) => font.category === filter)),
    [fonts, filter],
  );

  const handleSelect = async (fontId: string | null) => {
    setBusyFontId(fontId);
    setActionError(null);
    const result = await selectFont(fontId);
    if (result.success) {
      router.refresh();
    } else {
      setActionError(result.error?.message ?? "No se pudo aplicar la fuente");
    }
    setBusyFontId(null);
  };

  const handleDelete = async () => {
    if (!confirmFont) return;
    setDeleting(true);
    setActionError(null);
    const result = await removeFont(confirmFont.id);
    if (result.success) {
      setConfirmFont(null);
      router.refresh();
    } else {
      setActionError(result.error?.message ?? "No se pudo eliminar la fuente");
      setConfirmFont(null);
    }
    setDeleting(false);
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadError(null);
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setUploadError("Seleccioná un archivo de fuente.");
      return;
    }

    setUploading(true);
    try {
      const response = await fetch("/api/fonts", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) {
        setUploadError(data?.error?.message ?? "No se pudo instalar la fuente");
        return;
      }
      setUploadOpen(false);
      router.refresh();
    } catch {
      setUploadError("Ocurrió un error inesperado");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Configuración"
        title="Tipografía del menú"
        description="Elegí la fuente que se aplica al menú público. Podés instalar tus propias fuentes o usar las de Google."
        actions={
          <button type="button" className={adminPrimaryButtonClass} onClick={() => { setUploadError(null); setUploadOpen(true); }}>
            <Upload size={16} /> Instalar fuente
          </button>
        }
      />

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={17} /> {actionError}
        </div>
      )}

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto border-b border-zinc-200 bg-zinc-50/70 px-3 py-3 sm:px-5">
          <div className="flex min-w-max gap-2">
            <button type="button" onClick={() => setFilter("all")} className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition ${filter === "all" ? "bg-emerald-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"}`}>
              Todas <span className="ml-1.5 text-xs opacity-70">{fonts.length}</span>
            </button>
            {FONT_CATEGORIES.map((category) => (
              <button key={category} type="button" onClick={() => setFilter(category)} className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition ${filter === category ? "bg-emerald-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"}`}>
                {FONT_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="divide-y divide-zinc-100">
          <div className={`flex items-center gap-4 px-5 py-4 ${activeFontId === null ? "bg-emerald-50" : ""}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-semibold text-zinc-900">Fuente por defecto</p>
                {activeFontId === null && <span className="rounded-full bg-emerald-600 p-1 text-white"><Check size={12} /></span>}
              </div>
              <p className="text-sm text-zinc-500">Usa la tipografía original del menú (Arial / sans-serif).</p>
            </div>
            <button
              type="button"
              disabled={busyFontId !== null}
              onClick={() => handleSelect(null)}
              className={adminSecondaryButtonClass}
            >
              {activeFontId === null ? "En uso" : busyFontId === null ? "Aplicar" : "Aplicando..."}
            </button>
          </div>

          {visibleFonts.map((font) => {
            const isActive = font.id === activeFontId;
            return (
              <div key={font.id} className={`flex items-center gap-4 px-5 py-4 ${isActive ? "bg-emerald-50" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-semibold text-zinc-900">{font.name}</p>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">{FONT_CATEGORY_LABELS[font.category]}</span>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-zinc-600">{font.source === "google" ? "Google" : "Propia"}</span>
                    {isActive && <span className="rounded-full bg-emerald-600 p-1 text-white"><Check size={12} /></span>}
                  </div>
                  <p className="mt-0.5 truncate text-2xl leading-tight" style={{ fontFamily: font.fontFamily }}>Aa Bb Cc 0123</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" disabled={busyFontId !== null || isActive} onClick={() => handleSelect(font.id)} className={adminPrimaryButtonClass}>
                    {isActive ? "En uso" : busyFontId === font.id ? "Aplicando..." : "Aplicar"}
                  </button>
                  <button type="button" disabled={isActive || deleting} onClick={() => setConfirmFont(font)} className={adminDangerButtonClass}>
                    <Trash2 size={15} /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}

          {visibleFonts.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-zinc-500">No hay fuentes en esta categoría.</p>
          )}
        </div>
      </AdminCard>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <Info size={17} className="mt-0.5 shrink-0" />
        <span>
          Para instalar tu propia fuente: descargá un archivo <strong>.woff, .woff2, .ttf u .otf</strong> (por ejemplo desde <strong>fonts.google.com</strong>), luego usá el botón <strong>Instalar fuente</strong>, elegí un nombre y el tipo, y subí el archivo.
        </span>
      </div>

      <AdminModal open={uploadOpen} title="Instalar fuente" description="Subí una fuente propia para usarla en tu menú." onClose={() => setUploadOpen(false)}>
        <form onSubmit={handleUpload} className="space-y-4">
          <ol className="mb-4 list-decimal space-y-1 rounded-xl bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600">
            <li>Descargá una fuente en formato <strong>WOFF, WOFF2, TTF u OTF</strong> (por ejemplo desde <a className="underline" href="https://fonts.google.com" target="_blank" rel="noreferrer">fonts.google.com</a>).</li>
            <li>Ponele un <strong>nombre</strong> y elegí su <strong>tipo</strong>.</li>
            <li>Seleccioná el <strong>archivo</strong> y tocá <strong>Instalar</strong>.</li>
          </ol>
          <div>
            <label htmlFor="fontName" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Nombre</label>
            <input id="fontName" name="name" required className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
          </div>
          <div>
            <label htmlFor="fontCategory" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Tipo de fuente</label>
            <select id="fontCategory" name="category" required className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100">
              {FONT_CATEGORIES.map((category) => (
                <option key={category} value={category}>{FONT_CATEGORY_LABELS[category]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="fontFile" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Archivo</label>
            <input id="fontFile" name="file" type="file" required accept=".woff,.woff2,.ttf,.otf" className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
          </div>
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
          <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
            <button type="submit" disabled={uploading} className={adminPrimaryButtonClass}>
              {uploading ? "Instalando..." : "Instalar"}
            </button>
            <button type="button" onClick={() => setUploadOpen(false)} className={adminSecondaryButtonClass}>Cancelar</button>
          </div>
        </form>
      </AdminModal>

      <AdminConfirmModal
        open={Boolean(confirmFont)}
        title={`¿Eliminar ${confirmFont?.name ?? "fuente"}?`}
        description="Se eliminará la fuente y su archivo. Esta acción no se puede deshacer."
        onClose={() => setConfirmFont(null)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
