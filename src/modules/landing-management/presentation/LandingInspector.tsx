import React, { useMemo } from "react";
import { Code2, Check, Sparkles, Paintbrush, Layers, Trash2, Copy, ChevronUp, ChevronDown, ChevronRight, ChevronLeft, Palette, BookmarkPlus, AlignLeft, AlignCenter, AlignRight, Sliders, Box, Type, Image as ImageIcon, X, ArrowLeft, ArrowRight, CornerLeftUp, Link2, MousePointerClick, Columns, Rows, Scan, Square } from "lucide-react";
import { type SubElementStyleOverride } from "../contracts";
import { landingPreviewSource } from "../domain/landing-asset-urls";
import { parseSubElementStyles, resolveDocumentBlockAnchors, sanitizeAnchorSlug } from "../domain/landing-compiler";
import { landingWorkspace } from "./landing-workspace";
import { type LandingRestaurant } from "./landing-requests";
import { type LandingDocumentCommands } from "./landing-document-commands";
import { STUDIO_THEME_PRESETS } from "./landing-studio-catalog";
import { DirectionalInput, BoxModelSpacingEditor, StudioInspectorSection, StudioAlphaColorField, StudioElementOpacityField } from "./LandingInspectorFields";
import { StudioBordersAndCornersEditor, StudioLayoutAndDisplayEditor, StudioDimensionsAndPositionEditor } from "./LandingLayoutControls";

export function LandingInspector({ restaurant, commands }: { restaurant: LandingRestaurant; commands: LandingDocumentCommands }) {
  const { selectSubElementOnStudio, handleResetSubElementStyles, handleMoveSubElement, handleDuplicateSubElement, handleDeleteSubElement, handleUpdateBlockValue, handleUpdateSubElementAttribute, handleUpdateSubElementStyle, handlePreviewScrollToAnchor, handleMoveBlock, handleDuplicateBlock, handleDeleteBlock, handleUpdateBlockName, handleUpdateBlockValues, handleUpdateTheme } = commands;
  const store = landingWorkspace.useStore();
  const documentState = landingWorkspace.useSelector((state) => state.snapshot.document);
  const selectedBlockId = landingWorkspace.useSelector((state) => state.selectedBlockId);
  const selectedSubElement = landingWorkspace.useSelector((state) => state.selectedSubElement);
  const setMediaPickerTarget = landingWorkspace.useFieldSetter("mediaPickerTarget");
  const [rightTab, setRightTab] = landingWorkspace.useField("rightTab");
  const [isRightSidebarOpen, setIsRightSidebarOpen] = landingWorkspace.useField("isRightSidebarOpen");
  const [codeDrawerMode, setCodeDrawerMode] = landingWorkspace.useField("codeDrawerMode");
  const setCodeTab = landingWorkspace.useFieldSetter("codeTab");
  const selectedBlock = useMemo(
    () => documentState.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [documentState.blocks, selectedBlockId],
  );
  const activeSubElement = useMemo(
    () =>
      selectedBlock &&
      selectedSubElement &&
      selectedSubElement.blockId === selectedBlock.id
        ? selectedSubElement
        : null,
    [selectedBlock, selectedSubElement],
  );
  const curStyle = useMemo<SubElementStyleOverride>(() => {
    if (!selectedBlock || !activeSubElement) return {};
    const map = parseSubElementStyles(selectedBlock.values.__subStyles);
    return map[activeSubElement.selector] ?? {};
  }, [selectedBlock, activeSubElement]);
  const hasSubStyleOverrides = useMemo(
    () => Object.keys(curStyle).length > 0,
    [curStyle],
  );
  const repeatableParent = useMemo(() => {
    if (!activeSubElement) return undefined;
    return [...(activeSubElement.ancestors ?? [])]
      .reverse()
      .find((a) => a.isRepeatable);
  }, [activeSubElement]);
  const effectiveSrc = useMemo(() => {
    if (!selectedBlock || !activeSubElement) return "";
    return activeSubElement.boundSrcField
      ? selectedBlock.values[activeSubElement.boundSrcField] ??
          activeSubElement.currentSrc
      : activeSubElement.currentSrc;
  }, [selectedBlock, activeSubElement]);
  const effectiveAlt = useMemo(() => {
    if (!selectedBlock || !activeSubElement) return "";
    return activeSubElement.boundAltField
      ? selectedBlock.values[activeSubElement.boundAltField] ??
          activeSubElement.currentAlt
      : activeSubElement.currentAlt;
  }, [selectedBlock, activeSubElement]);
  const effectiveHref = useMemo(() => {
    if (!selectedBlock || !activeSubElement) return "";
    return activeSubElement.boundHrefField
      ? selectedBlock.values[activeSubElement.boundHrefField] ??
          activeSubElement.currentHref
      : activeSubElement.currentHref;
  }, [selectedBlock, activeSubElement]);
  const pageAnchors = useMemo(
    () => resolveDocumentBlockAnchors(documentState.blocks),
    [documentState.blocks],
  );
  const selectedBlockAnchor = useMemo(
    () => pageAnchors.find((a) => a.blockId === selectedBlock?.id) ?? null,
    [pageAnchors, selectedBlock],
  );

  return (
    <div className="relative flex shrink-0">
          {/* Flechita flotante en el medio del borde para cerrar/abrir */}
          <button
            type="button"
            onClick={() => setIsRightSidebarOpen((prev) => !prev)}
            className="absolute top-1/2 -translate-y-1/2 right-full z-40 flex h-8 w-4.5 items-center justify-center bg-white border-y border-l border-zinc-300 border-r-0 rounded-l-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 hover:w-5 shadow-xs active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            title={
              isRightSidebarOpen
                ? "Ocultar panel lateral (Propiedades y Diseño)"
                : "Mostrar panel lateral (Propiedades y Diseño)"
            }
            aria-label={
              isRightSidebarOpen
                ? "Ocultar panel lateral"
                : "Mostrar panel lateral"
            }
          >
            {isRightSidebarOpen ? (
              <ChevronRight className="h-3.5 w-3.5 -mr-0.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5 -mr-0.5" />
            )}
          </button>

          <aside
            className={`bg-white border-l border-zinc-200 flex flex-col shrink-0 min-h-0 transition-[width,opacity] duration-200 ease-in-out overflow-hidden ${
              isRightSidebarOpen
                ? "w-96 opacity-100"
                : "w-0 border-l-0 opacity-0"
            }`}
          >
            <div className="w-96 h-full flex flex-col shrink-0 min-h-0">
          {/* Top Tabs: Propiedades | Diseño Global */}
          <div className="grid grid-cols-2 border-b border-zinc-200 bg-white">
            <button
              type="button"
              onClick={() => setRightTab("properties")}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                rightTab === "properties"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Propiedades
            </button>
            <button
              type="button"
              onClick={() => setRightTab("design")}
              className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                rightTab === "design"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              Diseño Global
            </button>
          </div>

          {rightTab === "properties" ? (
            /* ============================================================= */
            /* PROPERTIES TAB (Block & Granular Sub-Element Inspector)       */
            /* ============================================================= */
            selectedBlock ? (
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-200">
                {/* Breadcrumb Hierarchy Bar + Ver Código Action */}
                <div className="bg-zinc-50 border-b border-zinc-200/70 px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1 text-[11px] min-w-0">
                    <button
                      type="button"
                      onClick={() => selectSubElementOnStudio(selectedBlock.id, null)}
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold transition shrink-0 ${
                        !activeSubElement
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900"
                      }`}
                      title="Seleccionar sección completa"
                    >
                      <Layers className="h-3 w-3" />
                      <span className="max-w-28 truncate">{selectedBlock.name}</span>
                    </button>

                    {activeSubElement?.ancestors.map((anc) => (
                      <React.Fragment key={anc.selector}>
                        <span className="text-zinc-400">›</span>
                        <button
                          type="button"
                          onClick={() =>
                            selectSubElementOnStudio(selectedBlock.id, anc.selector)
                          }
                          className="rounded px-1.5 py-0.5 font-medium text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900 truncate max-w-24"
                        >
                          {anc.label}
                        </button>
                      </React.Fragment>
                    ))}

                    {activeSubElement && (
                      <>
                        <span className="text-zinc-400">›</span>
                        <span className="inline-flex items-center gap-1 rounded bg-violet-600 px-1.5 py-0.5 font-semibold text-white shadow-2xs truncate max-w-28">
                          {activeSubElement.label}
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCodeDrawerMode("block");
                      setCodeTab("html");
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200 text-xs font-semibold shrink-0 shadow-2xs transition-colors"
                    title="Ver y editar el código HTML/CSS/JS de este bloque a pantalla completa"
                  >
                    <Code2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Ver Código</span>
                  </button>
                </div>

                {activeSubElement ? (
                  /* ========================================================= */
                  /* GRANULAR SUB-ELEMENT INSPECTOR                            */
                  /* ========================================================= */
                  <div key={activeSubElement.selector} className="divide-y divide-zinc-200">
                    {/* Sub-Element Header & Structural Actions */}
                    <div className="p-3.5 space-y-3 bg-violet-50/35 border-b border-zinc-200">
                      <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-violet-100 text-violet-900 border border-violet-200 truncate max-w-[280px]" title={activeSubElement.label}>
                                {activeSubElement.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {hasSubStyleOverrides && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleResetSubElementStyles(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                    )
                                  }
                                  className="text-[10px] text-violet-700 hover:text-red-600 font-semibold px-2 py-0.5 rounded border border-violet-200 bg-white hover:bg-red-50 transition-colors"
                                  title="Restablecer todos los estilos personalizados de este elemento"
                                >
                                  Reset estilos
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  selectSubElementOnStudio(selectedBlock.id, null)
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100"
                                title="Volver a las propiedades del bloque"
                              >
                                <CornerLeftUp className="h-3 w-3" />
                                Bloque
                              </button>
                            </div>
                          </div>

                          {/* Structural Actions: Move, Duplicate, Delete */}
                          <div className="grid grid-cols-4 gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveSubElement(
                                  selectedBlock.id,
                                  activeSubElement.selector,
                                  "prev",
                                )
                              }
                              className="flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white py-1.5 px-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                              title="Mover antes del elemento anterior"
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                              Antes
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleMoveSubElement(
                                  selectedBlock.id,
                                  activeSubElement.selector,
                                  "next",
                                )
                              }
                              className="flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white py-1.5 px-2 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                              title="Mover después del elemento siguiente"
                            >
                              Después
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDuplicateSubElement(
                                  selectedBlock.id,
                                  activeSubElement.selector,
                                )
                              }
                              className="flex items-center justify-center gap-1 rounded-lg border border-violet-200 bg-violet-600 py-1.5 px-2 text-[11px] font-semibold text-white hover:bg-violet-500"
                              title="Duplicar este elemento con variables propias"
                            >
                              <Copy className="h-3 w-3" />
                              Duplicar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSubElement(
                                  selectedBlock.id,
                                  activeSubElement.selector,
                                )
                              }
                              className="flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-white py-1.5 px-2 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                              title="Eliminar este elemento"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Parent Repeatable Card Helper */}
                          {repeatableParent && (
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-violet-200/80 bg-white px-2.5 py-2">
                              <div className="min-w-0">
                                <span className="block text-[10px] font-semibold text-zinc-500">
                                  Contenedor: {repeatableParent.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    selectSubElementOnStudio(
                                      selectedBlock.id,
                                      repeatableParent.selector,
                                    )
                                  }
                                  className="rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  Seleccionar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDuplicateSubElement(
                                      selectedBlock.id,
                                      repeatableParent.selector,
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded bg-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-800 hover:bg-violet-200"
                                >
                                  <Copy className="h-2.5 w-2.5" />
                                  Duplicar {repeatableParent.label}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Direct Content / Attributes (Text, Image, Link) */}
                        {(activeSubElement.boundTextField ||
                          activeSubElement.isImage ||
                          activeSubElement.isLink) && (
                          <StudioInspectorSection
                            title="Contenido del Elemento"
                            description="Textos, enlaces e imágenes vinculadas"
                            icon={<Type className="h-3.5 w-3.5" />}
                          >
                            {activeSubElement.boundTextField && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[11px] font-medium text-zinc-700">
                                    Texto visible
                                  </label>
                                  <code className="text-[10px] text-zinc-400 font-mono">
                                    {`{{${activeSubElement.boundTextField}}}`}
                                  </code>
                                </div>
                                <textarea
                                  rows={2}
                                  value={
                                    selectedBlock.values[
                                      activeSubElement.boundTextField
                                    ] ?? ""
                                  }
                                  onChange={(e) =>
                                    handleUpdateBlockValue(
                                      selectedBlock.id,
                                      activeSubElement.boundTextField!,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-violet-500 focus:bg-white"
                                />
                              </div>
                            )}

                            {activeSubElement.isImage && (
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                                  <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                                    {effectiveSrc ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={landingPreviewSource(effectiveSrc, restaurant.id, restaurant.landingSlug)}
                                        alt={effectiveAlt || "Imagen"}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-zinc-300">
                                        <ImageIcon className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMediaPickerTarget({
                                          kind: "sub-img",
                                          blockId: selectedBlock.id,
                                          selector: activeSubElement.selector,
                                          boundSrcField:
                                            activeSubElement.boundSrcField,
                                          boundAltField:
                                            activeSubElement.boundAltField,
                                          currentUrl: effectiveSrc,
                                          title: "Seleccionar o Subir Imagen",
                                        })
                                      }
                                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 shadow-2xs"
                                    >
                                      <ImageIcon className="h-3.5 w-3.5" />
                                      Elegir / Subir Imagen
                                    </button>
                                    <p className="mt-1 text-[10px] text-zinc-500 truncate">
                                      Galeria del restaurante o URL
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                                    URL de imagen (src)
                                  </label>
                                  <input
                                    type="text"
                                    value={effectiveSrc}
                                    onChange={(e) => {
                                      if (activeSubElement.boundSrcField) {
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          activeSubElement.boundSrcField,
                                          e.target.value,
                                        );
                                      } else {
                                        handleUpdateSubElementAttribute(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          "src",
                                          e.target.value,
                                        );
                                      }
                                    }}
                                    className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                                      Texto alternativo (alt)
                                    </label>
                                    <input
                                      type="text"
                                      value={effectiveAlt}
                                      onChange={(e) => {
                                        if (activeSubElement.boundAltField) {
                                          handleUpdateBlockValue(
                                            selectedBlock.id,
                                            activeSubElement.boundAltField,
                                            e.target.value,
                                          );
                                        } else {
                                          handleUpdateSubElementAttribute(
                                            selectedBlock.id,
                                            activeSubElement.selector,
                                            "alt",
                                            e.target.value,
                                          );
                                        }
                                      }}
                                      className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-900 focus:bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                                      Encuadre (Fit)
                                    </label>
                                    <select
                                      value={curStyle.objectFit || "cover"}
                                      onChange={(e) =>
                                        handleUpdateSubElementStyle(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          { objectFit: e.target.value },
                                        )
                                      }
                                      className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                                    >
                                      <option value="cover">Cubrir (Cover)</option>
                                      <option value="contain">Ajustar (Contain)</option>
                                      <option value="fill">Estirar (Fill)</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeSubElement.isLink && (
                              <div className="space-y-2.5">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-[11px] font-medium text-zinc-700 flex items-center gap-1">
                                      <Link2 className="h-3 w-3 text-zinc-400" />
                                      Destino del Botón / Enlace (href)
                                    </label>
                                    {effectiveHref.startsWith("#") &&
                                      effectiveHref.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handlePreviewScrollToAnchor(
                                              effectiveHref,
                                            )
                                          }
                                          className="inline-flex items-center gap-1 rounded bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100"
                                          title="Desplazar el lienzo hasta esta sección para probar el ancla"
                                        >
                                          Probar scroll ⤵
                                        </button>
                                      )}
                                  </div>
                                  <input
                                    type="text"
                                    value={effectiveHref}
                                    onChange={(e) => {
                                      if (activeSubElement.boundHrefField) {
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          activeSubElement.boundHrefField,
                                          e.target.value,
                                        );
                                      } else {
                                        handleUpdateSubElementAttribute(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          "href",
                                          e.target.value,
                                        );
                                      }
                                    }}
                                    placeholder="/m/mi-restaurante o #destacados"
                                    className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                                  />
                                </div>

                                {/* Selector directo de secciones reales de la página */}
                                <div>
                                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mb-1">
                                    Ir a una sección de tu página (Scroll):
                                  </label>
                                  <select
                                    value={
                                      pageAnchors.some(
                                        (a) => a.href === effectiveHref,
                                      )
                                        ? effectiveHref
                                        : ""
                                    }
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (!val) return;
                                      if (activeSubElement.boundHrefField) {
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          activeSubElement.boundHrefField,
                                          val,
                                        );
                                      } else {
                                        handleUpdateSubElementAttribute(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          "href",
                                          val,
                                        );
                                      }
                                      handlePreviewScrollToAnchor(val);
                                    }}
                                    className="w-full rounded-lg bg-white border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-violet-500"
                                  >
                                    <option value="">
                                      — Elegir sección de la página —
                                    </option>
                                    {pageAnchors.map((anc) => (
                                      <option key={anc.blockId} value={anc.href}>
                                        📍 {anc.blockName} ({anc.href})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = `/m/${restaurant.slug}`;
                                      if (activeSubElement.boundHrefField) {
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          activeSubElement.boundHrefField,
                                          url,
                                        );
                                      } else {
                                        handleUpdateSubElementAttribute(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          "href",
                                          url,
                                        );
                                      }
                                    }}
                                    className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition ${
                                      effectiveHref === `/m/${restaurant.slug}`
                                        ? "border-blue-300 bg-blue-50 text-blue-800"
                                        : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                    }`}
                                  >
                                    Carta Digital
                                  </button>
                                  {pageAnchors.map((anc) => (
                                    <button
                                      key={anc.blockId}
                                      type="button"
                                      onClick={() => {
                                        if (activeSubElement.boundHrefField) {
                                          handleUpdateBlockValue(
                                            selectedBlock.id,
                                            activeSubElement.boundHrefField,
                                            anc.href,
                                          );
                                        } else {
                                          handleUpdateSubElementAttribute(
                                            selectedBlock.id,
                                            activeSubElement.selector,
                                            "href",
                                            anc.href,
                                          );
                                        }
                                        handlePreviewScrollToAnchor(anc.href);
                                      }}
                                      title={`Hacer scroll a: ${anc.blockName}`}
                                      className={`rounded-md border px-2 py-0.5 text-[10px] font-medium transition ${
                                        effectiveHref === anc.href
                                          ? "border-violet-300 bg-violet-100 text-violet-900 font-semibold"
                                          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                      }`}
                                    >
                                      {anc.href}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const url = "https://wa.me/";
                                      if (activeSubElement.boundHrefField) {
                                        handleUpdateBlockValue(
                                          selectedBlock.id,
                                          activeSubElement.boundHrefField,
                                          url,
                                        );
                                      } else {
                                        handleUpdateSubElementAttribute(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          "href",
                                          url,
                                        );
                                      }
                                    }}
                                    className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                                  >
                                    WhatsApp
                                  </button>
                                </div>
                              </div>
                            )}
                          </StudioInspectorSection>
                        )}

                        {/* Disposición (Display, Flexbox y CSS Grid) */}
                        <StudioInspectorSection
                          title="Disposición (Display, Flex y Grid)"
                          description="Modo de caja, alineación de hijos, columnas y gap"
                          icon={<Rows className="h-3.5 w-3.5" />}
                          badge={
                            Boolean(
                              curStyle.display ||
                                curStyle.flexDirection ||
                                curStyle.justifyContent ||
                                curStyle.alignItems ||
                                curStyle.flexWrap ||
                                curStyle.gridTemplateColumns ||
                                curStyle.gap ||
                                curStyle.rowGap ||
                                curStyle.columnGap ||
                                curStyle.flexGrow ||
                                curStyle.alignSelf ||
                                curStyle.gridColumn,
                            ) ? (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-violet-500"
                                title="Disposición Flex/Grid personalizada"
                              />
                            ) : undefined
                          }
                          action={
                            Boolean(
                              curStyle.display ||
                                curStyle.flexDirection ||
                                curStyle.justifyContent ||
                                curStyle.alignItems ||
                                curStyle.flexWrap ||
                                curStyle.gridTemplateColumns ||
                                curStyle.gap ||
                                curStyle.rowGap ||
                                curStyle.columnGap ||
                                curStyle.flexGrow ||
                                curStyle.alignSelf ||
                                curStyle.gridColumn,
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      display: "",
                                      flexDirection: "",
                                      flexWrap: "",
                                      justifyContent: "",
                                      alignItems: "",
                                      justifyItems: "",
                                      gridTemplateColumns: "",
                                      gap: "",
                                      rowGap: "",
                                      columnGap: "",
                                      flexGrow: "",
                                      flexShrink: "",
                                      alignSelf: "",
                                      gridColumn: "",
                                    },
                                  )
                                }
                                className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                title="Restablecer disposición"
                              >
                                Reset
                              </button>
                            ) : undefined
                          }
                        >
                          <StudioLayoutAndDisplayEditor
                            style={curStyle}
                            computedStyles={activeSubElement.computedStyles}
                            onUpdateStyle={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                          />
                        </StudioInspectorSection>

                        {/* Granular CSS Style Overrides for Sub-Element */}
                        {!activeSubElement.isImage && (
                          <StudioInspectorSection
                            title="Tipografía y Alineación"
                            description="Fuente, tamaño, grosor, interlineado, color y estilo"
                            icon={<Type className="h-3.5 w-3.5" />}
                            badge={
                              Boolean(
                                curStyle.fontFamily ||
                                  curStyle.fontSize ||
                                  curStyle.fontWeight ||
                                  curStyle.fontStyle ||
                                  curStyle.lineHeight ||
                                  curStyle.letterSpacing ||
                                  curStyle.textTransform ||
                                  curStyle.textDecoration ||
                                  curStyle.color ||
                                  curStyle.textAlign,
                              ) ? (
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                  title="Estilos tipográficos personalizados"
                                />
                              ) : undefined
                            }
                            action={
                              Boolean(
                                curStyle.fontFamily ||
                                  curStyle.fontSize ||
                                  curStyle.fontWeight ||
                                  curStyle.fontStyle ||
                                  curStyle.lineHeight ||
                                  curStyle.letterSpacing ||
                                  curStyle.textTransform ||
                                  curStyle.textDecoration ||
                                  curStyle.color ||
                                  curStyle.textAlign,
                              ) ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSubElementStyle(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                      {
                                        fontFamily: "",
                                        fontSize: "",
                                        fontWeight: "",
                                        fontStyle: "",
                                        lineHeight: "",
                                        letterSpacing: "",
                                        textTransform: "",
                                        textDecoration: "",
                                        color: "",
                                        textAlign: "",
                                      },
                                    )
                                  }
                                  className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                  title="Restablecer tipografía"
                                >
                                  Reset
                                </button>
                              ) : undefined
                            }
                          >
                            {/* Font Family */}
                            <div>
                              <span className="block text-[11px] text-zinc-600 mb-1">
                                Familia Tipográfica
                              </span>
                              <select
                                value={curStyle.fontFamily || ""}
                                onChange={(e) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    { fontFamily: e.target.value },
                                  )
                                }
                                className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                              >
                                <option value="">Heredar del tema</option>
                                <option value="var(--font-heading)">
                                  Fuente de Títulos (Tema)
                                </option>
                                <option value="var(--font-body)">
                                  Fuente de Cuerpo (Tema)
                                </option>
                                <option value="'Playfair Display', Georgia, serif">
                                  Playfair Display (Serif)
                                </option>
                                <option value="'Plus Jakarta Sans', system-ui, sans-serif">
                                  Plus Jakarta Sans
                                </option>
                                <option value="'Inter', system-ui, sans-serif">
                                  Inter (Sans-Serif)
                                </option>
                                <option value="ui-monospace, SFMono-Regular, monospace">
                                  Monospace (Código / Precio)
                                </option>
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Tamaño de Letra
                                </span>
                                <div className="flex items-center gap-1">
                                  <select
                                    value={curStyle.fontSize || ""}
                                    onChange={(e) =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        { fontSize: e.target.value },
                                      )
                                    }
                                    className="flex-1 min-w-0 rounded-lg bg-zinc-50 border border-zinc-200 px-1.5 py-1.5 text-xs text-zinc-800"
                                  >
                                    <option value="">Auto</option>
                                    <option value="12px">12px</option>
                                    <option value="14px">14px</option>
                                    <option value="16px">16px</option>
                                    <option value="18px">18px</option>
                                    <option value="20px">20px</option>
                                    <option value="24px">24px</option>
                                    <option value="32px">32px</option>
                                    <option value="40px">40px</option>
                                    <option value="48px">48px</option>
                                    <option value="56px">56px</option>
                                    <option value="64px">64px</option>
                                  </select>
                                  <DirectionalInput
                                    value={curStyle.fontSize}
                                    placeholder={
                                      activeSubElement.computedStyles?.fontSize ||
                                      "16px"
                                    }
                                    title="Tamaño exacto (px, rem, clamp)"
                                    onChange={(val) =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        { fontSize: val },
                                      )
                                    }
                                  />
                                </div>
                              </div>
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Peso (Grosor)
                                </span>
                                <select
                                  value={curStyle.fontWeight || ""}
                                  onChange={(e) =>
                                    handleUpdateSubElementStyle(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                      { fontWeight: e.target.value },
                                    )
                                  }
                                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
                                >
                                  <option value="">Por defecto</option>
                                  <option value="300">300 Light</option>
                                  <option value="400">400 Normal</option>
                                  <option value="500">500 Medium</option>
                                  <option value="600">600 Semibold</option>
                                  <option value="700">700 Bold</option>
                                  <option value="800">800 ExtraBold</option>
                                </select>
                              </div>
                            </div>

                            {/* Line Height & Letter Spacing */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Interlineado (Line Height)
                                </span>
                                <select
                                  value={curStyle.lineHeight || ""}
                                  onChange={(e) =>
                                    handleUpdateSubElementStyle(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                      { lineHeight: e.target.value },
                                    )
                                  }
                                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
                                >
                                  <option value="">Auto</option>
                                  <option value="1">1.0 (Compacto)</option>
                                  <option value="1.15">1.15 (Titular)</option>
                                  <option value="1.3">1.3 (Subtítulo)</option>
                                  <option value="1.5">1.5 (Normal)</option>
                                  <option value="1.7">1.7 (Lectura amplia)</option>
                                </select>
                              </div>
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Espaciado Letras (Tracking)
                                </span>
                                <select
                                  value={curStyle.letterSpacing || ""}
                                  onChange={(e) =>
                                    handleUpdateSubElementStyle(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                      { letterSpacing: e.target.value },
                                    )
                                  }
                                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
                                >
                                  <option value="">Normal</option>
                                  <option value="-0.03em">-0.03em (Ajustado)</option>
                                  <option value="-0.015em">-0.015em (Suave)</option>
                                  <option value="0.04em">+0.04em (Abierto)</option>
                                  <option value="0.1em">+0.10em (Etiqueta)</option>
                                  <option value="0.18em">+0.18em (Kicker)</option>
                                </select>
                              </div>
                            </div>

                            {/* Transform, Decoration & Style */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Transformación
                                </span>
                                <div className="grid grid-cols-4 gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                                  {[
                                    { val: "", label: "Aa" },
                                    { val: "uppercase", label: "AA" },
                                    { val: "capitalize", label: "Ab" },
                                    { val: "lowercase", label: "aa" },
                                  ].map((tt) => (
                                    <button
                                      key={tt.label}
                                      type="button"
                                      onClick={() =>
                                        handleUpdateSubElementStyle(
                                          selectedBlock.id,
                                          activeSubElement.selector,
                                          { textTransform: tt.val },
                                        )
                                      }
                                      className={`py-1 rounded text-[10px] font-semibold transition-colors ${
                                        (curStyle.textTransform || "") === tt.val
                                          ? "bg-white text-zinc-900 shadow-2xs"
                                          : "text-zinc-500 hover:text-zinc-800"
                                      }`}
                                    >
                                      {tt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className="block text-[11px] text-zinc-600 mb-1">
                                  Estilo y Subrayado
                                </span>
                                <div className="grid grid-cols-3 gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        {
                                          fontStyle:
                                            curStyle.fontStyle === "italic"
                                              ? ""
                                              : "italic",
                                        },
                                      )
                                    }
                                    className={`py-1 rounded text-[10px] italic font-serif font-semibold transition-colors ${
                                      curStyle.fontStyle === "italic"
                                        ? "bg-white text-zinc-900 shadow-2xs"
                                        : "text-zinc-500 hover:text-zinc-800"
                                    }`}
                                    title="Cursiva (Italic)"
                                  >
                                    I
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        {
                                          textDecoration:
                                            curStyle.textDecoration ===
                                            "underline"
                                              ? ""
                                              : "underline",
                                        },
                                      )
                                    }
                                    className={`py-1 rounded text-[10px] underline font-semibold transition-colors ${
                                      curStyle.textDecoration === "underline"
                                        ? "bg-white text-zinc-900 shadow-2xs"
                                        : "text-zinc-500 hover:text-zinc-800"
                                    }`}
                                    title="Subrayado (Underline)"
                                  >
                                    U
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        {
                                          textDecoration:
                                            curStyle.textDecoration === "none"
                                              ? ""
                                              : "none",
                                        },
                                      )
                                    }
                                    className={`py-1 rounded text-[10px] font-semibold transition-colors ${
                                      curStyle.textDecoration === "none"
                                        ? "bg-white text-zinc-900 shadow-2xs"
                                        : "text-zinc-500 hover:text-zinc-800"
                                    }`}
                                    title="Sin subrayado (text-decoration: none)"
                                  >
                                    Sin U
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Text Color with Alpha */}
                            <div className="pt-1 border-t border-zinc-100">
                              <StudioAlphaColorField
                                label="Color de Texto"
                                value={curStyle.color ?? ""}
                                defaultColor={documentState.theme.textColor}
                                onChange={(val) =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    { color: val },
                                  )
                                }
                              />
                            </div>

                            {/* Text Align */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                              <span className="text-xs text-zinc-600">
                                Alineación de Texto
                              </span>
                              <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                                {[
                                  { val: "left", icon: AlignLeft },
                                  { val: "center", icon: AlignCenter },
                                  { val: "right", icon: AlignRight },
                                ].map(({ val, icon: AlignIcon }) => (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        {
                                          textAlign:
                                            curStyle.textAlign === val
                                              ? ""
                                              : val,
                                        },
                                      )
                                    }
                                    className={`p-1.5 rounded-md transition-colors ${
                                      curStyle.textAlign === val
                                        ? "bg-white text-zinc-900 shadow-2xs"
                                        : "text-zinc-500 hover:text-zinc-800"
                                    }`}
                                  >
                                    <AlignIcon className="h-3.5 w-3.5" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </StudioInspectorSection>
                        )}

                        {/* Background Color, Transparency & Opacity */}
                        <StudioInspectorSection
                          title="Fondo y Transparencia"
                          description="Color de relleno, desenfoque y opacidad de capa"
                          icon={<Paintbrush className="h-3.5 w-3.5" />}
                          badge={
                            Boolean(
                              curStyle.backgroundColor ||
                                curStyle.backgroundImage ||
                                curStyle.backdropFilter ||
                                (curStyle.opacity && curStyle.opacity !== "1"),
                            ) ? (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                title="Fondo u opacidad personalizada"
                              />
                            ) : undefined
                          }
                          action={
                            Boolean(
                              curStyle.backgroundColor ||
                                curStyle.backgroundImage ||
                                curStyle.backdropFilter ||
                                (curStyle.opacity && curStyle.opacity !== "1"),
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      backgroundColor: "",
                                      backgroundImage: "",
                                      backdropFilter: "",
                                      opacity: "",
                                    },
                                  )
                                }
                                className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                title="Restablecer fondo y opacidad"
                              >
                                Reset
                              </button>
                            ) : undefined
                          }
                        >
                          {/* Background Color with Alpha & Transparency Controls */}
                          <StudioAlphaColorField
                            label="Color de Fondo"
                            value={curStyle.backgroundColor ?? ""}
                            defaultColor={documentState.theme.cardBgColor}
                            onChange={(val) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                { backgroundColor: val },
                              )
                            }
                          />

                          {/* Background Image for Container / Card */}
                          {!activeSubElement.isImage && (
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                              <span className="text-xs text-zinc-600">
                                Imagen de Fondo
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMediaPickerTarget({
                                      kind: "sub-bg",
                                      blockId: selectedBlock.id,
                                      selector: activeSubElement.selector,
                                      currentUrl:
                                        curStyle.backgroundImage ?? "",
                                      title: "Imagen de Fondo del Elemento",
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
                                >
                                  <ImageIcon className="h-3 w-3 text-blue-600" />
                                  {curStyle.backgroundImage
                                    ? "Cambiar fondo"
                                    : "Elegir imagen"}
                                </button>
                                {curStyle.backgroundImage && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateSubElementStyle(
                                        selectedBlock.id,
                                        activeSubElement.selector,
                                        { backgroundImage: "" },
                                      )
                                    }
                                    className="p-1 text-zinc-400 hover:text-red-600"
                                    title="Quitar imagen de fondo"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Backdrop Blur (Glassmorphism) */}
                          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-zinc-100">
                            <span className="text-xs text-zinc-600">
                              Efecto Cristal (Blur)
                            </span>
                            <div className="flex items-center gap-1">
                              {[
                                { label: "No", val: "" },
                                { label: "Suave", val: "blur(6px)" },
                                { label: "Medio", val: "blur(12px)" },
                                { label: "Fuerte", val: "blur(20px)" },
                              ].map((bf) => (
                                <button
                                  key={bf.label}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSubElementStyle(
                                      selectedBlock.id,
                                      activeSubElement.selector,
                                      { backdropFilter: bf.val },
                                    )
                                  }
                                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                    (curStyle.backdropFilter || "") === bf.val
                                      ? "bg-blue-600 text-white font-semibold"
                                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-600"
                                  }`}
                                >
                                  {bf.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Whole Element Opacity / Layer Transparency */}
                          <div className="pt-2 border-t border-zinc-100">
                            <StudioElementOpacityField
                              label="Opacidad del Elemento"
                              description="Transparencia de toda la capa y su contenido"
                              value={curStyle.opacity ?? ""}
                              onChange={(val) =>
                                handleUpdateSubElementStyle(
                                  selectedBlock.id,
                                  activeSubElement.selector,
                                  { opacity: val },
                                )
                              }
                            />
                          </div>
                        </StudioInspectorSection>

                        {/* Espaciado del Elemento */}
                        <StudioInspectorSection
                          title="Espaciado (Padding y Margen)"
                          description="Espacio interno y separación externa"
                          icon={<Scan className="h-3.5 w-3.5" />}
                          badge={
                            Boolean(
                              curStyle.paddingTop ||
                                curStyle.paddingRight ||
                                curStyle.paddingBottom ||
                                curStyle.paddingLeft ||
                                curStyle.marginTop ||
                                curStyle.marginRight ||
                                curStyle.marginBottom ||
                                curStyle.marginLeft,
                            ) ? (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                title="Espaciado personalizado"
                              />
                            ) : undefined
                          }
                          action={
                            Boolean(
                              curStyle.paddingTop ||
                                curStyle.paddingRight ||
                                curStyle.paddingBottom ||
                                curStyle.paddingLeft ||
                                curStyle.marginTop ||
                                curStyle.marginRight ||
                                curStyle.marginBottom ||
                                curStyle.marginLeft,
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      paddingTop: "",
                                      paddingRight: "",
                                      paddingBottom: "",
                                      paddingLeft: "",
                                      marginTop: "",
                                      marginRight: "",
                                      marginBottom: "",
                                      marginLeft: "",
                                    },
                                  )
                                }
                                className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                title="Limpiar espaciado"
                              >
                                Reset
                              </button>
                            ) : undefined
                          }
                        >
                          <BoxModelSpacingEditor
                            paddingTop={curStyle.paddingTop}
                            paddingRight={curStyle.paddingRight}
                            paddingBottom={curStyle.paddingBottom}
                            paddingLeft={curStyle.paddingLeft}
                            marginTop={curStyle.marginTop}
                            marginRight={curStyle.marginRight}
                            marginBottom={curStyle.marginBottom}
                            marginLeft={curStyle.marginLeft}
                            computedStyles={activeSubElement.computedStyles}
                            onUpdatePadding={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                            onUpdateMargin={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                          />
                        </StudioInspectorSection>

                        {/* Dimensiones y Posición */}
                        <StudioInspectorSection
                          title="Dimensiones y Posición"
                          description="Ancho, alto, proporción, overflow y posición"
                          icon={<Columns className="h-3.5 w-3.5" />}
                          badge={
                            Boolean(
                              curStyle.width ||
                                curStyle.minWidth ||
                                curStyle.maxWidth ||
                                curStyle.height ||
                                curStyle.minHeight ||
                                curStyle.maxHeight ||
                                curStyle.aspectRatio ||
                                curStyle.overflow ||
                                curStyle.position ||
                                curStyle.top ||
                                curStyle.right ||
                                curStyle.bottom ||
                                curStyle.left ||
                                curStyle.zIndex,
                            ) ? (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                title="Dimensiones o posición personalizada"
                              />
                            ) : undefined
                          }
                          action={
                            Boolean(
                              curStyle.width ||
                                curStyle.minWidth ||
                                curStyle.maxWidth ||
                                curStyle.height ||
                                curStyle.minHeight ||
                                curStyle.maxHeight ||
                                curStyle.aspectRatio ||
                                curStyle.overflow ||
                                curStyle.position ||
                                curStyle.top ||
                                curStyle.right ||
                                curStyle.bottom ||
                                curStyle.left ||
                                curStyle.zIndex,
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      width: "",
                                      minWidth: "",
                                      maxWidth: "",
                                      height: "",
                                      minHeight: "",
                                      maxHeight: "",
                                      aspectRatio: "",
                                      overflow: "",
                                      position: "",
                                      top: "",
                                      right: "",
                                      bottom: "",
                                      left: "",
                                      zIndex: "",
                                    },
                                  )
                                }
                                className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                title="Restablecer dimensiones y posición"
                              >
                                Reset
                              </button>
                            ) : undefined
                          }
                        >
                          <StudioDimensionsAndPositionEditor
                            style={curStyle}
                            computedStyles={activeSubElement.computedStyles}
                            onUpdateStyle={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                          />
                        </StudioInspectorSection>

                        {/* Border & Corner Radius */}
                        <StudioInspectorSection
                          title="Bordes y Esquinas"
                          description="Grosor por lado, esquinas redondeadas y elevación"
                          icon={<Square className="h-3.5 w-3.5" />}
                          badge={
                            Boolean(
                              curStyle.borderWidth ||
                                curStyle.borderTopWidth ||
                                curStyle.borderRightWidth ||
                                curStyle.borderBottomWidth ||
                                curStyle.borderLeftWidth ||
                                curStyle.borderRadius ||
                                curStyle.borderTopLeftRadius ||
                                curStyle.borderTopRightRadius ||
                                curStyle.borderBottomRightRadius ||
                                curStyle.borderBottomLeftRadius ||
                                curStyle.borderColor ||
                                curStyle.boxShadow,
                            ) ? (
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-blue-500"
                                title="Bordes o esquinas personalizadas"
                              />
                            ) : undefined
                          }
                          action={
                            Boolean(
                              curStyle.borderWidth ||
                                curStyle.borderTopWidth ||
                                curStyle.borderRightWidth ||
                                curStyle.borderBottomWidth ||
                                curStyle.borderLeftWidth ||
                                curStyle.borderRadius ||
                                curStyle.borderTopLeftRadius ||
                                curStyle.borderTopRightRadius ||
                                curStyle.borderBottomRightRadius ||
                                curStyle.borderBottomLeftRadius ||
                                curStyle.borderColor ||
                                curStyle.boxShadow,
                            ) ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateSubElementStyle(
                                    selectedBlock.id,
                                    activeSubElement.selector,
                                    {
                                      borderWidth: "",
                                      borderTopWidth: "",
                                      borderRightWidth: "",
                                      borderBottomWidth: "",
                                      borderLeftWidth: "",
                                      borderStyle: "",
                                      borderRadius: "",
                                      borderTopLeftRadius: "",
                                      borderTopRightRadius: "",
                                      borderBottomRightRadius: "",
                                      borderBottomLeftRadius: "",
                                      borderColor: "",
                                      boxShadow: "",
                                    },
                                  )
                                }
                                className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                                title="Restablecer bordes y esquinas"
                              >
                                Reset
                              </button>
                            ) : undefined
                          }
                        >
                          <StudioBordersAndCornersEditor
                            borderWidth={curStyle.borderWidth}
                            borderTopWidth={curStyle.borderTopWidth}
                            borderRightWidth={curStyle.borderRightWidth}
                            borderBottomWidth={curStyle.borderBottomWidth}
                            borderLeftWidth={curStyle.borderLeftWidth}
                            borderColor={curStyle.borderColor}
                            borderStyle={curStyle.borderStyle}
                            defaultBorderColor={documentState.theme.borderColor}
                            borderRadius={curStyle.borderRadius}
                            borderTopLeftRadius={curStyle.borderTopLeftRadius}
                            borderTopRightRadius={curStyle.borderTopRightRadius}
                            borderBottomRightRadius={curStyle.borderBottomRightRadius}
                            borderBottomLeftRadius={curStyle.borderBottomLeftRadius}
                            boxShadow={curStyle.boxShadow}
                            showShadow={true}
                            onUpdateBorders={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                            onUpdateRadius={(patch) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                patch,
                              )
                            }
                            onUpdateShadow={(shadow) =>
                              handleUpdateSubElementStyle(
                                selectedBlock.id,
                                activeSubElement.selector,
                                { boxShadow: shadow },
                              )
                            }
                          />
                        </StudioInspectorSection>
                      </div>
                ) : (
                  /* ========================================================= */
                  /* BLOCK ROOT INSPECTOR                                      */
                  /* ========================================================= */
                  <div key={selectedBlock.id} className="divide-y divide-zinc-200">
                    {/* Block Header & Module Actions */}
                    <div className="p-3.5 space-y-3 border-b border-zinc-200">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {selectedBlock.moduleKey}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveBlock(selectedBlock.id, "up")}
                            className="p-1 rounded bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600 hover:text-zinc-900"
                            title="Subir bloque"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveBlock(selectedBlock.id, "down")
                            }
                            className="p-1 rounded bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600 hover:text-zinc-900"
                            title="Bajar bloque"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateBlock(selectedBlock)}
                            className="p-1 rounded bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600 hover:text-zinc-900"
                            title="Duplicar bloque"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(selectedBlock.id)}
                            className="p-1 rounded bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-600"
                            title="Eliminar bloque"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                          Nombre de la Capa
                        </label>
                        <input
                          type="text"
                          value={selectedBlock.name}
                          onChange={(e) =>
                            handleUpdateBlockName(
                              selectedBlock.id,
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-zinc-600 flex items-center gap-1">
                            <Link2 className="h-3 w-3 text-zinc-400" />
                            Ancla de Scroll (ID de esta sección)
                          </label>
                          {selectedBlockAnchor && (
                            <code className="text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                              {selectedBlockAnchor.href}
                            </code>
                          )}
                        </div>
                        <div className="flex items-center rounded-lg bg-zinc-50 border border-zinc-200 focus-within:border-blue-500 focus-within:bg-white overflow-hidden">
                          <span className="px-2.5 py-1.5 text-xs font-mono font-bold text-zinc-400 bg-zinc-100 border-r border-zinc-200">
                            #
                          </span>
                          <input
                            type="text"
                            value={
                              selectedBlock.values.__anchorId ??
                              selectedBlockAnchor?.anchorId ??
                              ""
                            }
                            onChange={(e) =>
                              handleUpdateBlockValue(
                                selectedBlock.id,
                                "__anchorId",
                                sanitizeAnchorSlug(e.target.value),
                              )
                            }
                            placeholder="ej: destacados, galeria, contacto"
                            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs font-mono text-zinc-900 focus:outline-none"
                          />
                        </div>
                        <p className="mt-1 text-[10px] text-zinc-500">
                          Cualquier botón con destino{" "}
                          <strong>{selectedBlockAnchor?.href ?? "#seccion"}</strong>{" "}
                          hará scroll suave hasta este bloque.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg border border-violet-200/80 bg-violet-50/50 px-2.5 py-2 text-[11px] text-violet-900">
                        <MousePointerClick className="h-4 w-4 shrink-0 text-violet-600" />
                        <span>
                          Estás editando la <strong>sección completa</strong>. Para modificar un elemento hijo específico (texto, botón, imagen), haz clic directamente en él en el lienzo o selecciónalo en el árbol de <strong>Capas</strong>.
                        </span>
                      </div>

                      {/* Quick Buttons: Edit Module Code & Save as Reusable Module */}
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setCodeDrawerMode("block");
                            setCodeTab("html");
                          }}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                            codeDrawerMode === "block"
                              ? "bg-blue-50 text-blue-800 border-blue-300 shadow-2xs"
                              : "bg-blue-50/60 hover:bg-blue-100 text-blue-700 border-blue-200"
                          }`}
                        >
                          <Code2 className="h-3.5 w-3.5 text-blue-600" />
                          Ver Código HTML/JS
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            store.dispatch(landingWorkspace.changed({ libraryDialog: "saveModule" }));
                          }}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-colors"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5 text-emerald-600" />
                          Guardar Módulo
                        </button>
                      </div>
                    </div>

                    {/* Dropdown 1: Section Appearance & Colors */}
                    <StudioInspectorSection
                      title="Apariencia y Colores"
                      description="Fondo, opacidad, imagen y color del texto"
                      icon={<Paintbrush className="h-3.5 w-3.5" />}
                      badge={
                        Boolean(
                          selectedBlock.values.__bgColor ||
                            selectedBlock.values.__bgImage ||
                            selectedBlock.values.__textColor ||
                            selectedBlock.values.__textAlign ||
                            (selectedBlock.values.__opacity &&
                              selectedBlock.values.__opacity !== "1"),
                        ) ? (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-blue-500"
                            title="Apariencia u opacidad personalizada"
                          />
                        ) : undefined
                      }
                      action={
                        Boolean(
                          selectedBlock.values.__bgColor ||
                            selectedBlock.values.__bgImage ||
                            selectedBlock.values.__textColor ||
                            selectedBlock.values.__textAlign ||
                            (selectedBlock.values.__opacity &&
                              selectedBlock.values.__opacity !== "1"),
                        ) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBlockValues(selectedBlock.id, {
                                __bgColor: "",
                                __bgImage: "",
                                __textColor: "",
                                __textAlign: "",
                                __opacity: "",
                              })
                            }
                            className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                            title="Restablecer apariencia y opacidad"
                          >
                            Reset
                          </button>
                        ) : undefined
                      }
                    >
                      {/* Background Color with Alpha & Transparency Controls */}
                      <StudioAlphaColorField
                        label="Color de Fondo"
                        value={
                          typeof selectedBlock.values.__bgColor === "string"
                            ? selectedBlock.values.__bgColor
                            : ""
                        }
                        defaultColor={documentState.theme.bgColor}
                        onChange={(val) =>
                          handleUpdateBlockValue(
                            selectedBlock.id,
                            "__bgColor",
                            val,
                          )
                        }
                      />

                      {/* Background Image */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                        <span className="text-xs text-zinc-600">
                          Imagen de Fondo
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setMediaPickerTarget({
                                kind: "block-bg",
                                blockId: selectedBlock.id,
                                currentUrl:
                                  selectedBlock.values.__bgImage ?? "",
                                title: `Fondo de ${selectedBlock.name}`,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
                          >
                            <ImageIcon className="h-3 w-3 text-blue-600" />
                            {selectedBlock.values.__bgImage
                              ? "Cambiar foto"
                              : "Elegir foto"}
                          </button>
                          {selectedBlock.values.__bgImage && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__bgImage",
                                  "",
                                )
                              }
                              className="p-1 text-zinc-400 hover:text-red-600"
                              title="Quitar imagen de fondo"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Text Color */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                        <span className="text-xs text-zinc-600">Color de Texto</span>
                        <div className="flex items-center gap-1.5">
                          <label
                            className="relative flex items-center justify-center h-6 w-6 rounded-md border border-zinc-300 shadow-2xs cursor-pointer overflow-hidden transition-transform hover:scale-105 shrink-0"
                            style={{
                              backgroundColor:
                                selectedBlock.values.__textColor ||
                                documentState.theme.textColor,
                            }}
                            title="Elegir color de texto de la sección"
                          >
                            <input
                              type="color"
                              value={
                                selectedBlock.values.__textColor ||
                                documentState.theme.textColor
                              }
                              onChange={(e) =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__textColor",
                                  e.target.value,
                                )
                              }
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                          </label>
                          <input
                            type="text"
                            placeholder="Por defecto"
                            value={selectedBlock.values.__textColor ?? ""}
                            onChange={(e) =>
                              handleUpdateBlockValue(
                                selectedBlock.id,
                                "__textColor",
                                e.target.value,
                              )
                            }
                            className="w-22 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono font-medium text-zinc-800 uppercase focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                          />
                          {selectedBlock.values.__textColor && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__textColor",
                                  "",
                                )
                              }
                              className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                              title="Quitar color personalizado"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Text Alignment */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                        <span className="text-xs text-zinc-600">
                          Alineación de Texto
                        </span>
                        <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
                          {[
                            { val: "left", icon: AlignLeft },
                            { val: "center", icon: AlignCenter },
                            { val: "right", icon: AlignRight },
                          ].map(({ val, icon: AlignIcon }) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__textAlign",
                                  selectedBlock.values.__textAlign === val
                                    ? ""
                                    : val,
                                )
                              }
                              className={`p-1.5 rounded-md transition-colors ${
                                selectedBlock.values.__textAlign === val
                                  ? "bg-white text-zinc-900 shadow-2xs"
                                  : "text-zinc-500 hover:text-zinc-800"
                              }`}
                            >
                              <AlignIcon className="h-3.5 w-3.5" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Whole Section Opacity / Layer Transparency */}
                      <div className="pt-2 border-t border-zinc-100">
                        <StudioElementOpacityField
                          label="Opacidad de la Sección"
                          description="Transparencia de todo el bloque y sus elementos"
                          value={
                            typeof selectedBlock.values.__opacity === "string"
                              ? selectedBlock.values.__opacity
                              : ""
                          }
                          onChange={(val) =>
                            handleUpdateBlockValue(
                              selectedBlock.id,
                              "__opacity",
                              val,
                            )
                          }
                        />
                      </div>
                    </StudioInspectorSection>

                    {/* Dropdown 2: Section Layout & Display */}
                    <StudioInspectorSection
                      title="Disposición y Tamaño de la Sección"
                      description="Display Flex/Grid, alineación, gap y alto mínimo"
                      icon={<Rows className="h-3.5 w-3.5" />}
                      badge={
                        Boolean(
                          selectedBlock.values.__display ||
                            selectedBlock.values.__flexDirection ||
                            selectedBlock.values.__justifyContent ||
                            selectedBlock.values.__alignItems ||
                            selectedBlock.values.__gridTemplateColumns ||
                            selectedBlock.values.__gap ||
                            selectedBlock.values.__minHeight ||
                            selectedBlock.values.__overflow ||
                            selectedBlock.values.__position ||
                            selectedBlock.values.__top ||
                            selectedBlock.values.__right ||
                            selectedBlock.values.__bottom ||
                            selectedBlock.values.__left ||
                            selectedBlock.values.__zIndex,
                        ) ? (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-violet-500"
                            title="Disposición, tamaño o posición de sección personalizada"
                          />
                        ) : undefined
                      }
                      action={
                        Boolean(
                          selectedBlock.values.__display ||
                            selectedBlock.values.__flexDirection ||
                            selectedBlock.values.__justifyContent ||
                            selectedBlock.values.__alignItems ||
                            selectedBlock.values.__gridTemplateColumns ||
                            selectedBlock.values.__gap ||
                            selectedBlock.values.__minHeight ||
                            selectedBlock.values.__overflow ||
                            selectedBlock.values.__position ||
                            selectedBlock.values.__top ||
                            selectedBlock.values.__right ||
                            selectedBlock.values.__bottom ||
                            selectedBlock.values.__left ||
                            selectedBlock.values.__zIndex,
                        ) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBlockValues(selectedBlock.id, {
                                __display: "",
                                __flexDirection: "",
                                __flexWrap: "",
                                __justifyContent: "",
                                __alignItems: "",
                                __gridTemplateColumns: "",
                                __gap: "",
                                __minHeight: "",
                                __overflow: "",
                                __position: "",
                                __top: "",
                                __right: "",
                                __bottom: "",
                                __left: "",
                                __zIndex: "",
                              })
                            }
                            className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                            title="Restablecer disposición de sección"
                          >
                            Reset
                          </button>
                        ) : undefined
                      }
                    >
                      <StudioLayoutAndDisplayEditor
                        style={{
                          display: selectedBlock.values.__display || "",
                          flexDirection:
                            selectedBlock.values.__flexDirection || "",
                          flexWrap: selectedBlock.values.__flexWrap || "",
                          justifyContent:
                            selectedBlock.values.__justifyContent || "",
                          alignItems: selectedBlock.values.__alignItems || "",
                          gridTemplateColumns:
                            selectedBlock.values.__gridTemplateColumns || "",
                          gap: selectedBlock.values.__gap || "",
                        }}
                        showChildControls={false}
                        onUpdateStyle={(patch) =>
                          handleUpdateBlockValues(selectedBlock.id, {
                            ...(patch.display !== undefined && {
                              __display: patch.display,
                            }),
                            ...(patch.flexDirection !== undefined && {
                              __flexDirection: patch.flexDirection,
                            }),
                            ...(patch.flexWrap !== undefined && {
                              __flexWrap: patch.flexWrap,
                            }),
                            ...(patch.justifyContent !== undefined && {
                              __justifyContent: patch.justifyContent,
                            }),
                            ...(patch.alignItems !== undefined && {
                              __alignItems: patch.alignItems,
                            }),
                            ...(patch.gridTemplateColumns !== undefined && {
                              __gridTemplateColumns: patch.gridTemplateColumns,
                            }),
                            ...(patch.gap !== undefined && {
                              __gap: patch.gap,
                            }),
                          })
                        }
                      />

                      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-800">
                            Alto Mínimo de Sección (min-height)
                          </span>
                          <div className="w-22">
                            <DirectionalInput
                              value={selectedBlock.values.__minHeight ?? ""}
                              placeholder="auto"
                              title="Alto mínimo de la sección (px, dvh)"
                              onChange={(val) =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__minHeight",
                                  val,
                                )
                              }
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                          {[
                            { label: "Auto", val: "" },
                            { label: "320px", val: "320px" },
                            { label: "480px", val: "480px" },
                            { label: "640px", val: "640px" },
                            { label: "80dvh", val: "80dvh" },
                            { label: "100dvh", val: "100dvh" },
                          ].map((mh) => (
                            <button
                              key={mh.label}
                              type="button"
                              onClick={() =>
                                handleUpdateBlockValue(
                                  selectedBlock.id,
                                  "__minHeight",
                                  mh.val,
                                  )
                              }
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                (selectedBlock.values.__minHeight || "") ===
                                mh.val
                                  ? "bg-teal-600 text-white font-semibold"
                                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
                              }`}
                            >
                              {mh.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Posición de la Sección */}
                      <div className="rounded-xl border border-zinc-200/90 bg-white p-2.5 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-800">
                            Posicionamiento de Sección (Position)
                          </span>
                          {selectedBlock.values.__position && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-indigo-700 uppercase">
                              {selectedBlock.values.__position}
                            </span>
                          )}
                        </div>
                        <select
                          value={selectedBlock.values.__position || ""}
                          onChange={(e) =>
                            handleUpdateBlockValue(
                              selectedBlock.id,
                              "__position",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 font-medium"
                        >
                          <option value="">Normal (static)</option>
                          <option value="relative">Relativa (relative)</option>
                          <option value="sticky">Pegajosa al Scroll (sticky)</option>
                          <option value="fixed">Fija en pantalla (fixed)</option>
                          <option value="absolute">Absoluta (absolute)</option>
                        </select>
                        {(selectedBlock.values.__position || "") && (
                          <div className="pt-1.5 border-t border-zinc-100 grid grid-cols-5 gap-1">
                            <div>
                              <span className="block text-[9px] font-semibold uppercase text-zinc-400 mb-0.5 text-center">Top</span>
                              <DirectionalInput
                                value={selectedBlock.values.__top ?? ""}
                                placeholder="auto"
                                title="Posición Superior (top)"
                                variant="position"
                                onChange={(val) => handleUpdateBlockValue(selectedBlock.id, "__top", val)}
                                className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800"
                              />
                            </div>
                            <div>
                              <span className="block text-[9px] font-semibold uppercase text-zinc-400 mb-0.5 text-center">Der</span>
                              <DirectionalInput
                                value={selectedBlock.values.__right ?? ""}
                                placeholder="auto"
                                title="Posición Derecha (right)"
                                variant="position"
                                onChange={(val) => handleUpdateBlockValue(selectedBlock.id, "__right", val)}
                                className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800"
                              />
                            </div>
                            <div>
                              <span className="block text-[9px] font-semibold uppercase text-zinc-400 mb-0.5 text-center">Abajo</span>
                              <DirectionalInput
                                value={selectedBlock.values.__bottom ?? ""}
                                placeholder="auto"
                                title="Posición Inferior (bottom)"
                                variant="position"
                                onChange={(val) => handleUpdateBlockValue(selectedBlock.id, "__bottom", val)}
                                className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800"
                              />
                            </div>
                            <div>
                              <span className="block text-[9px] font-semibold uppercase text-zinc-400 mb-0.5 text-center">Izq</span>
                              <DirectionalInput
                                value={selectedBlock.values.__left ?? ""}
                                placeholder="auto"
                                title="Posición Izquierda (left)"
                                variant="position"
                                onChange={(val) => handleUpdateBlockValue(selectedBlock.id, "__left", val)}
                                className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800"
                              />
                            </div>
                            <div>
                              <span className="block text-[9px] font-semibold uppercase text-zinc-400 mb-0.5 text-center">Z-Index</span>
                              <input
                                type="text"
                                value={selectedBlock.values.__zIndex ?? ""}
                                placeholder="auto"
                                title="Capa Z (z-index)"
                                onChange={(e) => handleUpdateBlockValue(selectedBlock.id, "__zIndex", e.target.value)}
                                className="w-full h-6 text-center text-[10px] font-mono rounded-md border border-zinc-200 bg-zinc-50 text-zinc-800"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </StudioInspectorSection>

                    {/* Dropdown 3: Section Spacing */}
                    <StudioInspectorSection
                      title="Espaciado de la Sección"
                      description="Padding interno y margen exterior"
                      icon={<Scan className="h-3.5 w-3.5" />}
                      badge={
                        Boolean(
                          selectedBlock.values.__paddingTop ||
                            selectedBlock.values.__paddingBottom ||
                            selectedBlock.values.__paddingLeft ||
                            selectedBlock.values.__paddingRight ||
                            selectedBlock.values.__paddingY ||
                            selectedBlock.values.__paddingX ||
                            selectedBlock.values.__marginTop ||
                            selectedBlock.values.__marginBottom ||
                            selectedBlock.values.__marginLeft ||
                            selectedBlock.values.__marginRight,
                        ) ? (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-blue-500"
                            title="Espaciado personalizado"
                          />
                        ) : undefined
                      }
                      action={
                        Boolean(
                          selectedBlock.values.__paddingTop ||
                            selectedBlock.values.__paddingBottom ||
                            selectedBlock.values.__paddingLeft ||
                            selectedBlock.values.__paddingRight ||
                            selectedBlock.values.__paddingY ||
                            selectedBlock.values.__paddingX ||
                            selectedBlock.values.__marginTop ||
                            selectedBlock.values.__marginBottom ||
                            selectedBlock.values.__marginLeft ||
                            selectedBlock.values.__marginRight,
                        ) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBlockValues(selectedBlock.id, {
                                __paddingTop: "",
                                __paddingBottom: "",
                                __paddingLeft: "",
                                __paddingRight: "",
                                __paddingY: "",
                                __paddingX: "",
                                __marginTop: "",
                                __marginBottom: "",
                                __marginLeft: "",
                                __marginRight: "",
                              })
                            }
                            className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                            title="Restablecer espaciado"
                          >
                            Reset
                          </button>
                        ) : undefined
                      }
                    >
                      <BoxModelSpacingEditor
                        paddingTop={
                          selectedBlock.values.__paddingTop ||
                          selectedBlock.values.__paddingY
                        }
                        paddingRight={
                          selectedBlock.values.__paddingRight ||
                          selectedBlock.values.__paddingX
                        }
                        paddingBottom={
                          selectedBlock.values.__paddingBottom ||
                          selectedBlock.values.__paddingY
                        }
                        paddingLeft={
                          selectedBlock.values.__paddingLeft ||
                          selectedBlock.values.__paddingX
                        }
                        marginTop={selectedBlock.values.__marginTop}
                        marginRight={selectedBlock.values.__marginRight}
                        marginBottom={selectedBlock.values.__marginBottom}
                        marginLeft={selectedBlock.values.__marginLeft}
                        onUpdatePadding={(patch) =>
                          handleUpdateBlockValues(selectedBlock.id, {
                            __paddingTop: patch.paddingTop ?? "",
                            __paddingRight: patch.paddingRight ?? "",
                            __paddingBottom: patch.paddingBottom ?? "",
                            __paddingLeft: patch.paddingLeft ?? "",
                            __paddingY: "",
                            __paddingX: "",
                          })
                        }
                        onUpdateMargin={(patch) =>
                          handleUpdateBlockValues(selectedBlock.id, {
                            __marginTop: patch.marginTop ?? "",
                            __marginRight: patch.marginRight ?? "",
                            __marginBottom: patch.marginBottom ?? "",
                            __marginLeft: patch.marginLeft ?? "",
                          })
                        }
                      />
                    </StudioInspectorSection>

                    {/* Dropdown 3: Border & Corner Radius */}
                    <StudioInspectorSection
                      title="Bordes y Esquinas"
                      description="Grosor por lado y redondeo de esquinas"
                      icon={<Square className="h-3.5 w-3.5" />}
                      badge={
                        Boolean(
                          selectedBlock.values.__borderWidth ||
                            selectedBlock.values.__borderTopWidth ||
                            selectedBlock.values.__borderRightWidth ||
                            selectedBlock.values.__borderBottomWidth ||
                            selectedBlock.values.__borderLeftWidth ||
                            selectedBlock.values.__borderRadius ||
                            selectedBlock.values.__borderTopLeftRadius ||
                            selectedBlock.values.__borderTopRightRadius ||
                            selectedBlock.values.__borderBottomRightRadius ||
                            selectedBlock.values.__borderBottomLeftRadius ||
                            selectedBlock.values.__borderColor,
                        ) ? (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-blue-500"
                            title="Bordes o esquinas personalizadas"
                          />
                        ) : undefined
                      }
                      action={
                        Boolean(
                          selectedBlock.values.__borderWidth ||
                            selectedBlock.values.__borderTopWidth ||
                            selectedBlock.values.__borderRightWidth ||
                            selectedBlock.values.__borderBottomWidth ||
                            selectedBlock.values.__borderLeftWidth ||
                            selectedBlock.values.__borderRadius ||
                            selectedBlock.values.__borderTopLeftRadius ||
                            selectedBlock.values.__borderTopRightRadius ||
                            selectedBlock.values.__borderBottomRightRadius ||
                            selectedBlock.values.__borderBottomLeftRadius ||
                            selectedBlock.values.__borderColor,
                        ) ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBlockValues(selectedBlock.id, {
                                __borderWidth: "",
                                __borderTopWidth: "",
                                __borderRightWidth: "",
                                __borderBottomWidth: "",
                                __borderLeftWidth: "",
                                __borderStyle: "",
                                __borderRadius: "",
                                __borderTopLeftRadius: "",
                                __borderTopRightRadius: "",
                                __borderBottomRightRadius: "",
                                __borderBottomLeftRadius: "",
                                __borderColor: "",
                              })
                            }
                            className="text-[10px] text-zinc-400 hover:text-red-600 font-medium transition-colors"
                            title="Restablecer bordes y esquinas"
                          >
                            Reset
                          </button>
                        ) : undefined
                      }
                    >
                      <StudioBordersAndCornersEditor
                        borderWidth={
                          typeof selectedBlock.values.__borderWidth === "string"
                            ? selectedBlock.values.__borderWidth
                            : ""
                        }
                        borderTopWidth={
                          typeof selectedBlock.values.__borderTopWidth ===
                          "string"
                            ? selectedBlock.values.__borderTopWidth
                            : ""
                        }
                        borderRightWidth={
                          typeof selectedBlock.values.__borderRightWidth ===
                          "string"
                            ? selectedBlock.values.__borderRightWidth
                            : ""
                        }
                        borderBottomWidth={
                          typeof selectedBlock.values.__borderBottomWidth ===
                          "string"
                            ? selectedBlock.values.__borderBottomWidth
                            : ""
                        }
                        borderLeftWidth={
                          typeof selectedBlock.values.__borderLeftWidth ===
                          "string"
                            ? selectedBlock.values.__borderLeftWidth
                            : ""
                        }
                        borderColor={
                          typeof selectedBlock.values.__borderColor === "string"
                            ? selectedBlock.values.__borderColor
                            : ""
                        }
                        borderStyle={
                          typeof selectedBlock.values.__borderStyle === "string"
                            ? selectedBlock.values.__borderStyle
                            : ""
                        }
                        defaultBorderColor={documentState.theme.borderColor}
                        borderRadius={
                          typeof selectedBlock.values.__borderRadius ===
                          "string"
                            ? selectedBlock.values.__borderRadius
                            : ""
                        }
                        borderTopLeftRadius={
                          typeof selectedBlock.values.__borderTopLeftRadius ===
                          "string"
                            ? selectedBlock.values.__borderTopLeftRadius
                            : ""
                        }
                        borderTopRightRadius={
                          typeof selectedBlock.values.__borderTopRightRadius ===
                          "string"
                            ? selectedBlock.values.__borderTopRightRadius
                            : ""
                        }
                        borderBottomRightRadius={
                          typeof selectedBlock.values
                            .__borderBottomRightRadius === "string"
                            ? selectedBlock.values.__borderBottomRightRadius
                            : ""
                        }
                        borderBottomLeftRadius={
                          typeof selectedBlock.values
                            .__borderBottomLeftRadius === "string"
                            ? selectedBlock.values.__borderBottomLeftRadius
                            : ""
                        }
                        showShadow={false}
                        onUpdateBorders={(patch) =>
                          handleUpdateBlockValues(selectedBlock.id, {
                            ...(patch.borderWidth !== undefined && {
                              __borderWidth: patch.borderWidth,
                            }),
                            ...(patch.borderTopWidth !== undefined && {
                              __borderTopWidth: patch.borderTopWidth,
                            }),
                            ...(patch.borderRightWidth !== undefined && {
                              __borderRightWidth: patch.borderRightWidth,
                            }),
                            ...(patch.borderBottomWidth !== undefined && {
                              __borderBottomWidth: patch.borderBottomWidth,
                            }),
                            ...(patch.borderLeftWidth !== undefined && {
                              __borderLeftWidth: patch.borderLeftWidth,
                            }),
                            ...(patch.borderColor !== undefined && {
                              __borderColor: patch.borderColor,
                            }),
                            ...(patch.borderStyle !== undefined && {
                              __borderStyle: patch.borderStyle,
                            }),
                          })
                        }
                        onUpdateRadius={(patch) =>
                          handleUpdateBlockValues(selectedBlock.id, {
                            ...(patch.borderRadius !== undefined && {
                              __borderRadius: patch.borderRadius,
                            }),
                            ...(patch.borderTopLeftRadius !== undefined && {
                              __borderTopLeftRadius: patch.borderTopLeftRadius,
                            }),
                            ...(patch.borderTopRightRadius !== undefined && {
                              __borderTopRightRadius:
                                patch.borderTopRightRadius,
                            }),
                            ...(patch.borderBottomRightRadius !== undefined && {
                              __borderBottomRightRadius:
                                patch.borderBottomRightRadius,
                            }),
                            ...(patch.borderBottomLeftRadius !== undefined && {
                              __borderBottomLeftRadius:
                                patch.borderBottomLeftRadius,
                            }),
                          })
                        }
                      />
                    </StudioInspectorSection>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                <Layers className="h-8 w-8 mb-2 text-zinc-300" />
                <p className="text-xs font-semibold text-zinc-700">
                  Ningún bloque seleccionado
                </p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Hacé clic en cualquier bloque o elemento del lienzo central
                  para editar sus propiedades.
                </p>
              </div>
            )
          ) : (
            /* ============================================================= */
            /* DESIGN TAB (Global Theme Presets & System Tokens)            */
            /* ============================================================= */
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* PRESETS DE TEMA */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                    Presets de Tema
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {STUDIO_THEME_PRESETS.length} paletas
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {STUDIO_THEME_PRESETS.map((preset) => {
                    const isCurrent =
                      documentState.theme.bgColor.toLowerCase() ===
                        preset.theme.bgColor.toLowerCase() &&
                      documentState.theme.primaryColor.toLowerCase() ===
                        preset.theme.primaryColor.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleUpdateTheme(preset.theme)}
                        className={`group relative flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                          isCurrent
                            ? "bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-2xs"
                            : "bg-white hover:bg-zinc-50 border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        {isCurrent && (
                          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xs">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                        <div className="flex items-center gap-1 mb-2">
                          {preset.dots.map((dot, i) => (
                            <span
                              key={i}
                              className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-2xs"
                              style={{ backgroundColor: dot }}
                            />
                          ))}
                        </div>
                        <span
                          className={`text-xs font-semibold leading-tight truncate w-full ${
                            isCurrent ? "text-blue-900" : "text-zinc-800"
                          }`}
                        >
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SUPERFICIES Y FONDOS */}
              <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 flex items-center gap-1.5">
                    <Layers className="h-3 w-3 text-zinc-400" />
                    Superficies y Fondos
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-black/10"
                      style={{ backgroundColor: documentState.theme.bgColor }}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-black/10"
                      style={{
                        backgroundColor: documentState.theme.cardBgColor,
                      }}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-black/10"
                      style={{
                        backgroundColor: documentState.theme.borderColor,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {(
                    [
                      { key: "bgColor", label: "Fondo de Página (Base)" },
                      { key: "cardBgColor", label: "Tarjetas y Contenedores" },
                      { key: "borderColor", label: "Bordes y Divisores" },
                    ] as const
                  ).map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-zinc-600">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <label
                          className="relative flex items-center justify-center h-6 w-6 rounded-md border border-zinc-300 shadow-2xs cursor-pointer overflow-hidden transition-transform hover:scale-105 shrink-0"
                          style={{ backgroundColor: documentState.theme[key] }}
                          title={`Elegir color para ${label}`}
                        >
                          <input
                            type="color"
                            value={documentState.theme[key]}
                            onChange={(e) =>
                              handleUpdateTheme({ [key]: e.target.value })
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                        <input
                          type="text"
                          value={documentState.theme[key]}
                          onChange={(e) =>
                            handleUpdateTheme({ [key]: e.target.value })
                          }
                          className="w-22 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono font-medium text-zinc-800 uppercase focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COLORES DE MARCA */}
              <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Colores de Marca
                </span>
                <div className="space-y-2">
                  {(
                    [
                      { key: "primaryColor", label: "Color Primario (Botones)" },
                      { key: "primaryLightColor", label: "Hover Primario" },
                      { key: "accentColor", label: "Color de Acento" },
                    ] as const
                  ).map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-zinc-600">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <label
                          className="relative flex items-center justify-center h-6 w-6 rounded-md border border-zinc-300 shadow-2xs cursor-pointer overflow-hidden transition-transform hover:scale-105 shrink-0"
                          style={{ backgroundColor: documentState.theme[key] }}
                          title={`Elegir color para ${label}`}
                        >
                          <input
                            type="color"
                            value={documentState.theme[key]}
                            onChange={(e) =>
                              handleUpdateTheme({ [key]: e.target.value })
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                        <input
                          type="text"
                          value={documentState.theme[key]}
                          onChange={(e) =>
                            handleUpdateTheme({ [key]: e.target.value })
                          }
                          className="w-22 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono font-medium text-zinc-800 uppercase focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* COLORES DE TEXTO */}
              <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 flex items-center gap-1.5">
                  <Type className="h-3 w-3 text-zinc-400" />
                  Colores de Texto
                </span>
                <div className="space-y-2">
                  {(
                    [
                      { key: "textColor", label: "Texto Principal" },
                      { key: "mutedTextColor", label: "Texto Secundario" },
                    ] as const
                  ).map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-zinc-600">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <label
                          className="relative flex items-center justify-center h-6 w-6 rounded-md border border-zinc-300 shadow-2xs cursor-pointer overflow-hidden transition-transform hover:scale-105 shrink-0"
                          style={{ backgroundColor: documentState.theme[key] }}
                          title={`Elegir color para ${label}`}
                        >
                          <input
                            type="color"
                            value={documentState.theme[key]}
                            onChange={(e) =>
                              handleUpdateTheme({ [key]: e.target.value })
                            }
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                        </label>
                        <input
                          type="text"
                          value={documentState.theme[key]}
                          onChange={(e) =>
                            handleUpdateTheme({ [key]: e.target.value })
                          }
                          className="w-22 rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono font-medium text-zinc-800 uppercase focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TIPOGRAFÍA GLOBAL */}
              <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 flex items-center gap-1.5">
                  <Type className="h-3 w-3 text-zinc-400" />
                  Tipografía Global
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Fuente de Títulos
                    </label>
                    <input
                      type="text"
                      value={documentState.theme.fontHeading}
                      onChange={(e) =>
                        handleUpdateTheme({ fontHeading: e.target.value })
                      }
                      className="w-full rounded-md bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        {
                          label: "Playfair (Serif)",
                          val: "'Playfair Display', Georgia, serif",
                        },
                        {
                          label: "Jakarta (Sans)",
                          val: "'Plus Jakarta Sans', system-ui, sans-serif",
                        },
                        {
                          label: "Inter",
                          val: "'Inter', system-ui, sans-serif",
                        },
                        { label: "Outfit", val: "'Outfit', sans-serif" },
                      ].map((f) => (
                        <button
                          key={f.label}
                          type="button"
                          onClick={() =>
                            handleUpdateTheme({ fontHeading: f.val })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                            documentState.theme.fontHeading === f.val
                              ? "bg-blue-100 text-blue-800 font-semibold border border-blue-200"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 border border-zinc-200"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Fuente de Párrafos
                    </label>
                    <input
                      type="text"
                      value={documentState.theme.fontBody}
                      onChange={(e) =>
                        handleUpdateTheme({ fontBody: e.target.value })
                      }
                      className="w-full rounded-md bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        {
                          label: "Plus Jakarta",
                          val: "'Plus Jakarta Sans', system-ui, sans-serif",
                        },
                        {
                          label: "Inter",
                          val: "'Inter', system-ui, sans-serif",
                        },
                        { label: "Roboto", val: "'Roboto', sans-serif" },
                      ].map((f) => (
                        <button
                          key={f.label}
                          type="button"
                          onClick={() =>
                            handleUpdateTheme({ fontBody: f.val })
                          }
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition ${
                            documentState.theme.fontBody === f.val
                              ? "bg-blue-100 text-blue-800 font-semibold border border-blue-200"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 border border-zinc-200"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* REDONDEO DE ESQUINAS */}
              <div className="pt-4 border-t border-zinc-200/80 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400 flex items-center gap-1.5">
                  <Box className="h-3 w-3 text-zinc-400" />
                  Redondeo de Esquinas
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Tarjetas (Radius MD)
                    </label>
                    <input
                      type="text"
                      value={documentState.theme.radiusMd}
                      onChange={(e) =>
                        handleUpdateTheme({ radiusMd: e.target.value })
                      }
                      placeholder="12px"
                      className="w-full rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono text-zinc-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 mb-1">
                      Botones (Radius LG)
                    </label>
                    <input
                      type="text"
                      value={documentState.theme.radiusLg}
                      onChange={(e) =>
                        handleUpdateTheme({ radiusLg: e.target.value })
                      }
                      placeholder="20px"
                      className="w-full rounded-md bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-mono text-zinc-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    { label: "Recto (0px)", md: "0px", lg: "0px" },
                    { label: "Suave (8px)", md: "8px", lg: "14px" },
                    { label: "Moderno (14px)", md: "14px", lg: "24px" },
                    { label: "Píldora", md: "16px", lg: "9999px" },
                  ].map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() =>
                        handleUpdateTheme({ radiusMd: r.md, radiusLg: r.lg })
                      }
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
            </div>
          </aside>
        </div>
  );
}
