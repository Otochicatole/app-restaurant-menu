import React, { useState, useRef } from "react";
import { Trash2, LayoutTemplate, Download, Upload, BookmarkPlus } from "lucide-react";
import { type LandingTemplateView } from "../contracts";
import { landingWorkspace } from "./landing-workspace";
import { type LandingRestaurant, saveLandingTemplate, removeLandingTemplate, applyLandingTemplate, exportLandingTemplate, importLandingTemplate } from "./landing-requests";

export function LandingTemplateDialogs({ restaurant }: { restaurant: LandingRestaurant }) {
  const isPending = landingWorkspace.useSelector((state) => state.write !== null || state.libraryRequests > 0);
  const store = landingWorkspace.useStore();
  const templates = landingWorkspace.useSelector((state) => state.templates);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [templateSubmitPublic, setTemplateSubmitPublic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const libraryDialog = landingWorkspace.useSelector((state) => state.libraryDialog);
  const handleApplyTemplate = (template: LandingTemplateView) => {
    if (window.confirm('¿Cargar la plantilla "' + template.name + '"? Reemplazará el diseño actual en el editor.')) {
      store.dispatch(applyLandingTemplate(restaurant, template));
    }
  };
  const handleCreateTemplate = async () => {
    if (!templateName.trim()) return;
    if (await store.dispatch(saveLandingTemplate(restaurant.id, templateName, templateDesc, templateSubmitPublic))) {
      setTemplateName("");
      setTemplateDesc("");
      setTemplateSubmitPublic(false);
    }
  };
  const handleDeleteTemplate = (id: string) => { void store.dispatch(removeLandingTemplate(restaurant.id, id)); };
  const handleExportTemplate = async (id: string) => {
    const result = await store.dispatch(exportLandingTemplate(restaurant.id, id));
    if (!result) return;
    const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.restaurant-menu.landing-template" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = result.filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  const handleImportTemplateFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let binary = "";
      for (const byte of new Uint8Array(reader.result as ArrayBuffer)) binary += String.fromCharCode(byte);
      void store.dispatch(importLandingTemplate(restaurant.id, btoa(binary)));
    };
    reader.readAsArrayBuffer(file);
    event.target.value = "";
  };
  return (
    <>
{libraryDialog === "saveTemplate" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-6 shadow-2xl space-y-4 text-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-emerald-600" />
              Guardar como Plantilla de Landing
            </h3>
            <p className="text-xs text-zinc-600">
              Guardá esta landing completa (todos sus módulos, estilos y tema)
              como plantilla privada o compartila con la comunidad.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nombre de la plantilla
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ej: Bistró de Autor Nocturno"
                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Ideal para parrillas, bares de vinos o restaurantes de autor."
                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={templateSubmitPublic}
                  onChange={(e) => setTemplateSubmitPublic(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600"
                />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-900 block">
                    Publicar para la comunidad
                  </span>
                  <span className="text-zinc-500">
                    Si lo activás, será revisada por un Superadmin antes de
                    aparecer como pública. Si no, quedará solo para tu negocio.
                  </span>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => store.dispatch(landingWorkspace.changed({ libraryDialog: null }))}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending || !templateName.trim()}
                onClick={handleCreateTemplate}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs disabled:opacity-50 transition-colors"
              >
                Guardar Plantilla
              </button>
            </div>
          </div>
        </div>
      )}
{libraryDialog === "templates" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white border border-zinc-200 shadow-2xl flex flex-col overflow-hidden text-zinc-900">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50/70">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-emerald-600" />
                  Biblioteca de Plantillas de Landing
                </h3>
                <p className="text-xs text-zinc-500">
                  Cargá plantillas del sistema, de la comunidad o tus propias
                  plantillas privadas (.landingtemplate).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".landingtemplate"
                  onChange={handleImportTemplateFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-2xs transition-colors"
                >
                  <Upload className="h-3.5 w-3.5 text-amber-600" />
                  Importar .landingtemplate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    store.dispatch(landingWorkspace.changed({ libraryDialog: "saveTemplate" }));
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  Guardar actual
                </button>
                <button
                  type="button"
                  onClick={() => store.dispatch(landingWorkspace.changed({ libraryDialog: null }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-zinc-50/30">
              {templates.map((tpl) => {
                const badge = tpl.isSystem
                  ? {
                      text: "Sistema",
                      cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
                    }
                  : tpl.visibility === "PUBLIC"
                  ? {
                      text:
                        tpl.status === "PUBLISHED"
                          ? "Comunidad"
                          : tpl.status === "PENDING"
                          ? "En revisión"
                          : tpl.status,
                      cls:
                        tpl.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200",
                    }
                  : {
                      text: "Privada",
                      cls: "bg-zinc-100 text-zinc-700 border-zinc-200",
                    };

                return (
                  <div
                    key={tpl.id}
                    className="flex flex-col justify-between rounded-xl border border-zinc-200/90 bg-white p-4 hover:border-zinc-300 hover:shadow-xs transition-all group"
                  >
                    <div>
                      {/* Mini Preview Banner representing the theme */}
                      <div
                        className="h-16 rounded-lg mb-3 p-3 flex flex-col justify-between relative overflow-hidden border border-black/5"
                        style={{
                          backgroundColor: tpl.document.theme.bgColor,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[11px] font-bold"
                            style={{
                              color: tpl.document.theme.primaryColor,
                              fontFamily: tpl.document.theme.fontHeading.split(",")[0].replace(/['"]/g, ""),
                            }}
                          >
                            {tpl.name.split(" ")[0]}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: tpl.document.theme.primaryColor }}
                            />
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: tpl.document.theme.accentColor }}
                            />
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/10"
                              style={{ backgroundColor: tpl.document.theme.cardBgColor }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[9px] font-medium"
                            style={{ color: tpl.document.theme.mutedTextColor }}
                          >
                            {tpl.document.theme.fontHeading.split(",")[0].replace(/['"]/g, "")}
                          </span>
                          <span
                            className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shadow-2xs"
                            style={{
                              backgroundColor: tpl.document.theme.cardBgColor,
                              color: tpl.document.theme.primaryColor,
                            }}
                          >
                            {tpl.document.blocks.length} Bloques
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.cls}`}
                        >
                          {badge.text}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-zinc-900 group-hover:text-emerald-700 transition-colors">
                        {tpl.name}
                      </h4>
                      <p className="text-xs text-zinc-600 mt-1 line-clamp-2 leading-relaxed">
                        {tpl.description || "Sin descripción"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        Usar plantilla
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportTemplate(tpl.id)}
                        className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 transition-colors cursor-pointer"
                        title="Descargar archivo .landingtemplate"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {!tpl.isSystem && tpl.restaurantId === restaurant.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id)}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-red-50 text-zinc-500 hover:text-red-600 transition-colors cursor-pointer"
                          title="Eliminar plantilla"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
</>
  );
}
