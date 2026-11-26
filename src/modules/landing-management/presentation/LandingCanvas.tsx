import { BUILTIN_LANDING_MODULES } from "../domain/landing-module-catalog";
import { type InsertableInnerElementKind } from "../domain/landing-compiler";
import { landingWorkspace } from "./landing-workspace";
import { type LandingRestaurant } from "./landing-requests";
import { type LandingDocumentCommands } from "./landing-document-commands";
import { type LandingCanvasPort } from "./landing-canvas-port";
import { useLandingCanvasBridge } from "./useLandingCanvasBridge";
import { getDragWindow } from "./LandingLayerTree";

export function LandingCanvas({ restaurant, commands, port }: { restaurant: LandingRestaurant; commands: LandingDocumentCommands; port: LandingCanvasPort }) {
  const { setIsDraggingComponentOverCanvas, draggedComponentKindRef, selectedBlockIdRef, selectedSubElementRef, setDraggedComponentKind, draggedBuiltinKeyRef, setDraggedBuiltinKey, draggedCustomIdRef, setDraggedCustomId, isDraggingComponentOverCanvas } = port;
  const { handleInsertInnerElement, selectSubElementOnStudio, handleCreateContainerSection, handleAddBuiltinBlock, handleAddCustomBlock, updateDocument } = commands;
  const documentState = landingWorkspace.useSelector((state) => state.snapshot.document);
  const viewport = landingWorkspace.useSelector((state) => state.viewport);
  const interactiveCanvas = landingWorkspace.useSelector((state) => state.interactiveCanvas);
  const customModules = landingWorkspace.useSelector((state) => state.customModules);
  const lastSavedAt = landingWorkspace.useSelector((state) => state.lastSavedAt);
  const { iframeRef, debouncedSrcDoc, onLoad } = useLandingCanvasBridge(restaurant, commands, port);
  return (
    <div
          className="flex-1 flex flex-col min-w-0 min-h-0 relative"
          style={{
            backgroundColor: "#f4f4f7",
            backgroundImage:
              "radial-gradient(rgba(0,0,0,0.08) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
          onDragOver={(e) => {
            e.preventDefault();
            try {
              e.dataTransfer.dropEffect = "copy";
            } catch {
              // ignore
            }
            setIsDraggingComponentOverCanvas(true);
          }}
          onDragLeave={() => setIsDraggingComponentOverCanvas(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingComponentOverCanvas(false);
            const dragWin = getDragWindow();
            let plainText = "";
            try {
              plainText = e.dataTransfer.getData("text/plain") || "";
            } catch {
              // ignore
            }

            let compKind = (e.dataTransfer.getData(
              "application/x-landing-component",
            ) ||
              draggedComponentKindRef.current ||
              dragWin?.__draggedComponentKind) as InsertableInnerElementKind | null;
            if (!compKind && plainText.startsWith("landing-component:")) {
              compKind = plainText.slice(
                "landing-component:".length,
              ) as InsertableInnerElementKind;
            }

            if (compKind) {
              if (selectedBlockIdRef.current) {
                const newSel = handleInsertInnerElement(
                  selectedBlockIdRef.current,
                  selectedSubElementRef.current?.selector ?? null,
                  compKind,
                );
                if (newSel) {
                  selectSubElementOnStudio(selectedBlockIdRef.current, newSel);
                }
              } else {
                handleCreateContainerSection(compKind);
              }
              setDraggedComponentKind(null);
              if (dragWin) {
                dragWin.__draggedComponentKind = null;
              }
              return;
            }

            let builtinKey =
              e.dataTransfer.getData("application/x-landing-builtin") ||
              draggedBuiltinKeyRef.current ||
              dragWin?.__draggedBuiltinKey;
            if (!builtinKey && plainText.startsWith("landing-builtin:")) {
              builtinKey = plainText.slice("landing-builtin:".length);
            }
            if (builtinKey) {
              const found = BUILTIN_LANDING_MODULES.find(
                (m) => m.moduleKey === builtinKey,
              );
              if (found) {
                const rect = e.currentTarget.getBoundingClientRect();
                const isTopHalf = rect ? e.clientY < rect.top + rect.height / 3 : false;
                const headerBlock = documentState.blocks.find((b) => b.moduleKey === "header");
                const footerBlock = documentState.blocks.find((b) => b.moduleKey === "footer");
                if (isTopHalf && headerBlock) {
                  handleAddBuiltinBlock(found, headerBlock.id, "after");
                } else if (footerBlock) {
                  handleAddBuiltinBlock(found, footerBlock.id, "before");
                } else {
                  handleAddBuiltinBlock(found);
                }
              }
              setDraggedBuiltinKey(null);
              if (dragWin) {
                dragWin.__draggedBuiltinKey = null;
              }
              return;
            }

            let customId =
              e.dataTransfer.getData("application/x-landing-custom") ||
              draggedCustomIdRef.current ||
              dragWin?.__draggedCustomId;
            if (!customId && plainText.startsWith("landing-custom:")) {
              customId = plainText.slice("landing-custom:".length);
            }
            if (customId) {
              const found = customModules.find((m) => m.id === customId);
              if (found) {
                const rect = e.currentTarget.getBoundingClientRect();
                const isTopHalf = rect ? e.clientY < rect.top + rect.height / 3 : false;
                const headerBlock = documentState.blocks.find((b) => b.moduleKey === "header");
                const footerBlock = documentState.blocks.find((b) => b.moduleKey === "footer");
                if (isTopHalf && headerBlock) {
                  handleAddCustomBlock(found, headerBlock.id, "after");
                } else if (footerBlock) {
                  handleAddCustomBlock(found, footerBlock.id, "before");
                } else {
                  handleAddCustomBlock(found);
                }
              }
              setDraggedCustomId(null);
              if (dragWin) {
                dragWin.__draggedCustomId = null;
              }
            }
          }}
        >
          {/* Top Canvas Hint Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 text-[11px] text-zinc-600 border-b border-zinc-200 bg-white/90 backdrop-blur-xs shrink-0 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                  documentState.mode === "raw"
                    ? "bg-amber-500"
                    : interactiveCanvas
                    ? "bg-blue-500"
                    : "bg-zinc-400"
                }`}
              />
              <span className="truncate">
                {documentState.mode === "raw"
                  ? "Modo HTML Libre activo: estás editando el documento completo manualmente"
                  : interactiveCanvas
                  ? "Lienzo Interactivo: hacé clic en cualquier bloque para seleccionarlo o editá los textos directamente sobre la página"
                  : "Vista previa limpia como visitante"}
              </span>
              {documentState.mode === "raw" && (
                <button
                  type="button"
                  onClick={() =>
                    updateDocument((prev) => ({ ...prev, mode: "visual" }))
                  }
                  className="ml-2 px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-semibold shrink-0 transition-colors"
                >
                  Volver al Modo Visual Modular
                </button>
              )}
            </div>
            {lastSavedAt && (
              <span className="text-zinc-400 hidden sm:inline shrink-0" suppressHydrationWarning>
                Guardado{" "}
                {new Date(lastSavedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          {/* Center Artboard Container */}
          <div className="flex-1 overflow-auto flex items-start justify-center p-4 sm:p-6 min-h-0">
            <div
              className={`bg-white rounded-xl overflow-hidden shadow-[0_16px_45px_rgba(0,0,0,0.12)] border transition-all duration-300 flex flex-col ${
                isDraggingComponentOverCanvas
                  ? "border-blue-400 ring-4 ring-blue-400/20"
                  : "border-zinc-300"
              } ${
                viewport === "desktop"
                  ? "w-full h-full"
                  : viewport === "tablet"
                  ? "w-[768px] h-full max-w-full"
                  : "w-[390px] h-[780px] max-w-full my-auto rounded-[28px] border-[6px] border-zinc-700"
              }`}
            >
              {/* Subtle Browser Top Chrome on Desktop/Tablet */}
              {viewport !== "mobile" && (
                <div className="flex items-center justify-between px-3.5 py-2 bg-zinc-100 border-b border-zinc-200 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="px-3 py-0.5 rounded-md bg-white border border-zinc-200 text-[11px] font-mono text-zinc-600 shadow-2xs">
                    /l/{restaurant.landingSlug}
                  </div>
                  <div className="w-10" />
                </div>
              )}

              <iframe
                ref={iframeRef}
                title="Lienzo Visual de Landing"
                srcDoc={debouncedSrcDoc}
                sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                onLoad={onLoad}
                className="w-full flex-1 border-0 bg-white"
              />
            </div>
          </div>
        </div>
  );
}
