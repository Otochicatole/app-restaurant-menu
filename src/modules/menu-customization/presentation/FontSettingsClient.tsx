"use client";

import { AlertCircle, Check, Info, Trash2, Upload, X } from "lucide-react";
import {
  FONT_CATEGORIES,
  FONT_CATEGORY_LABELS,
  FONT_TARGETS,
  FONT_TARGET_LABELS,
} from "../contracts";
import {
  AdminCard,
  AdminPageHeader,
  adminDangerButtonClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/ui/admin/AdminPrimitives";
import { AdminConfirmModal, AdminModal } from "@/ui/admin/AdminUI";
import {
  useFontSettingsController,
  type FontSettingsProps,
} from "./use-font-settings-controller";

export function FontSettingsClient(props: FontSettingsProps) {
  const controller = useFontSettingsController(props);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Configuración"
        title="Tipografía del menú"
        description="Elegí la fuente que se aplica al menú público. Podés instalar tus propias fuentes o usar las de Google."
        actions={
          <button type="button" className={adminPrimaryButtonClass} onClick={controller.openUpload}>
            <Upload size={16} /> Instalar fuente
          </button>
        }
      />

      {controller.actionError && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex items-center gap-2"><AlertCircle size={17} /> {controller.actionError}</span>
          <button type="button" onClick={controller.dismissActionError} aria-label="Cerrar error" className="rounded-lg p-1 hover:bg-red-100"><X size={15} /></button>
        </div>
      )}

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto border-b border-zinc-200 bg-zinc-50/70 px-3 py-3 sm:px-5">
          <p className="mb-2 px-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Aplicar a</p>
          <div className="flex min-w-max gap-2" aria-label="Sección tipográfica">
            {FONT_TARGETS.map((target) => (
              <button
                key={target}
                type="button"
                aria-pressed={controller.selectedTarget === target}
                onClick={() => controller.setSelectedTarget(target)}
                className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition ${controller.selectedTarget === target ? "bg-emerald-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"}`}
              >
                {FONT_TARGET_LABELS[target]}
              </button>
            ))}
          </div>
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden">
        <div className="overflow-x-auto border-b border-zinc-200 bg-zinc-50/70 px-3 py-3 sm:px-5">
          <div className="flex min-w-max gap-2" aria-label="Filtrar fuentes por categoría">
            <button type="button" aria-pressed={controller.filter === "all"} onClick={() => controller.setFilter("all")} className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition ${controller.filter === "all" ? "bg-emerald-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"}`}>
              Todas <span className="ml-1.5 text-xs opacity-70">{controller.fonts.length}</span>
            </button>
            {FONT_CATEGORIES.map((category) => (
              <button key={category} type="button" aria-pressed={controller.filter === category} onClick={() => controller.setFilter(category)} className={`cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition ${controller.filter === category ? "bg-emerald-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"}`}>
                {FONT_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>
        </div>
      </AdminCard>

      <FontList controller={controller} />

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <Info size={17} className="mt-0.5 shrink-0" />
        <span>
          Para instalar tu propia fuente: descargá un archivo <strong>.woff, .woff2, .ttf u .otf</strong> (por ejemplo desde <strong>fonts.google.com</strong>), luego usá el botón <strong>Instalar fuente</strong>, elegí un nombre y el tipo, y subí el archivo.
        </span>
      </div>

      <AdminModal open={controller.uploadOpen} title="Instalar fuente" description="Subí una fuente propia para usarla en tu menú." onClose={controller.closeUpload}>
        <form onSubmit={controller.uploadFont} className="space-y-4" aria-busy={controller.uploading}>
          <ol className="mb-4 list-decimal space-y-1 rounded-xl bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600">
            <li>Descargá una fuente en formato <strong>WOFF, WOFF2, TTF u OTF</strong> (por ejemplo desde <a className="underline" href="https://fonts.google.com" target="_blank" rel="noreferrer">fonts.google.com</a>).</li>
            <li>Ponele un <strong>nombre</strong> y elegí su <strong>tipo</strong>.</li>
            <li>Seleccioná el <strong>archivo</strong> y tocá <strong>Instalar</strong>.</li>
          </ol>
          <div>
            <label htmlFor="fontName" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Nombre</label>
            <input id="fontName" name="name" required maxLength={100} className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
          </div>
          <div>
            <label htmlFor="fontCategory" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Tipo de fuente</label>
            <select id="fontCategory" name="category" required className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100">
              {FONT_CATEGORIES.map((category) => <option key={category} value={category}>{FONT_CATEGORY_LABELS[category]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="fontFile" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Archivo</label>
            <input id="fontFile" name="file" type="file" required accept=".woff,.woff2,.ttf,.otf" className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100" />
          </div>
          {controller.uploadError && <p role="alert" className="text-sm text-red-600">{controller.uploadError}</p>}
          <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
            <button type="submit" disabled={controller.uploading} className={adminPrimaryButtonClass}>{controller.uploading ? "Instalando..." : "Instalar"}</button>
            <button type="button" disabled={controller.uploading} onClick={controller.closeUpload} className={adminSecondaryButtonClass}>Cancelar</button>
          </div>
        </form>
      </AdminModal>

      <AdminConfirmModal
        open={Boolean(controller.confirmFont)}
        title={`¿Eliminar ${controller.confirmFont?.name ?? "fuente"}?`}
        description="Se eliminará la fuente y su archivo. Esta acción no se puede deshacer."
        onClose={controller.closeDelete}
        onConfirm={controller.deleteFont}
        loading={Boolean(controller.deletingFontId)}
      />
    </div>
  );
}

function FontList({ controller }: { controller: ReturnType<typeof useFontSettingsController> }) {
  return (
    <AdminCard className="overflow-hidden">
      <div className="divide-y divide-zinc-100" aria-live="polite">
        <div className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${controller.activeFontIdForTarget === null ? "bg-emerald-50" : ""}`}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-semibold text-zinc-900">Fuente por defecto</p>
              {controller.activeFontIdForTarget === null && <span className="rounded-full bg-emerald-600 p-1 text-white" aria-label="En uso"><Check size={12} /></span>}
            </div>
            <p className="text-sm text-zinc-500">{controller.selectedTarget === "global" ? "Usa la tipografía original del menú (Arial / sans-serif)." : "Hereda la fuente global del menú."}</p>
          </div>
          <button type="button" disabled={controller.selectingKey !== null || controller.activeFontIdForTarget === null} onClick={() => controller.applyFont(null)} className={`${adminSecondaryButtonClass} w-full sm:w-auto`}>
            {controller.activeFontIdForTarget === null ? "En uso" : controller.selectingKey === "__default__" ? "Aplicando..." : "Aplicar"}
          </button>
        </div>

        {controller.visibleFonts.map((font) => {
          const isActive = font.id === controller.activeFontIdForTarget;
          return (
            <div key={font.id} className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${isActive ? "bg-emerald-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-zinc-900">{font.name}</p>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800">{FONT_CATEGORY_LABELS[font.category]}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-zinc-600">{font.source === "google" ? "Google" : "Propia"}</span>
                  {isActive && <span className="rounded-full bg-emerald-600 p-1 text-white" aria-label="En uso"><Check size={12} /></span>}
                </div>
                <p className="mt-0.5 truncate text-2xl leading-tight" style={{ fontFamily: font.fontFamily }}>Aa Bb Cc 0123</p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
                <button type="button" disabled={controller.selectingKey !== null || isActive} onClick={() => controller.applyFont(font.id)} className={`${adminPrimaryButtonClass} flex-1 sm:flex-none`}>
                  {isActive ? "En uso" : controller.selectingKey === font.id ? "Aplicando..." : "Aplicar"}
                </button>
                {font.canDelete && (
                  <button type="button" disabled={isActive || Boolean(controller.deletingFontId)} onClick={() => controller.requestDelete(font)} className={`${adminDangerButtonClass} flex-1 sm:flex-none`}>
                    <Trash2 size={15} /> Eliminar
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {controller.visibleFonts.length === 0 && <p className="px-5 py-10 text-center text-sm text-zinc-500">No hay fuentes en esta categoría.</p>}
      </div>
    </AdminCard>
  );
}
