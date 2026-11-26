import { useState, useMemo } from "react";
import Editor, { loader } from "@monaco-editor/react";
import { Code2, Check, FileCode2, Paintbrush, Braces, X } from "lucide-react";
import { type LandingDocumentV1, landingDocumentSchema } from "../contracts";
import { landingWorkspace } from "./landing-workspace";
import { type LandingRestaurant, compileLandingForSave } from "./landing-requests";
import { type LandingDocumentCommands } from "./landing-document-commands";

loader.config({ paths: { vs: "/api/monaco/vs" } });

export function LandingCodeDrawer({ restaurant, commands }: { restaurant: LandingRestaurant; commands: LandingDocumentCommands }) {
  const { handleUpdateBlockCode, updateDocument, commitSnapshot } = commands;
  const store = landingWorkspace.useStore();
  const { document: documentState, rawHtml, rawCss, rawJs } = landingWorkspace.useSelector((state) => state.snapshot);
  const selectedBlockId = landingWorkspace.useSelector((state) => state.selectedBlockId);
  const [codeDrawerMode, setCodeDrawerMode] = landingWorkspace.useField("codeDrawerMode");
  const [codeTab, setCodeTab] = landingWorkspace.useField("codeTab");
  const selectedBlock = useMemo(
    () => documentState.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [documentState.blocks, selectedBlockId],
  );
  const [jsonDraft, setJsonDraft] = useState<{ base: LandingDocumentV1; text: string } | null>(null);
  const updateJsonText = (text: string) => {
    let base = store.getState().snapshot.document;
    try {
      const parsed = landingDocumentSchema.safeParse(JSON.parse(text));
      if (parsed.success) {
        updateDocument(parsed.data, false);
        base = store.getState().snapshot.document;
      }
    } catch {
      // Monaco retains intermediate JSON until it validates.
    }
    setJsonDraft({ base, text });
  };
  const htmlForEditor = useMemo(() => {
    if (codeDrawerMode !== "global" || codeTab !== "html") return "";
    return documentState.mode === "raw" ? rawHtml : compileLandingForSave(documentState, restaurant).htmlContent;
  }, [codeDrawerMode, codeTab, documentState, rawHtml, restaurant]);
  if (codeDrawerMode === "closed") return null;
  const jsonEditorText = jsonDraft?.base === documentState ? jsonDraft.text : JSON.stringify(documentState, null, 2);
  return (
    <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white animate-in fade-in-50 duration-150 overflow-hidden"
        >
          {/* Top Modal Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0 gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
                  <Code2 className="h-4 w-4" />
                </span>
                <span className="text-sm font-bold text-white hidden sm:inline">
                  Editor de Código
                </span>
              </div>

              {/* Mode Switcher: Selected Block vs Full Page / JSON */}
              <div className="flex items-center bg-zinc-800 p-0.5 rounded-lg border border-zinc-700 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCodeDrawerMode("block");
                    if (codeTab === "json") setCodeTab("html");
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    codeDrawerMode === "block"
                      ? "bg-zinc-700 text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Módulo: {selectedBlock?.name ?? "Seleccionado"}
                </button>
                <button
                  type="button"
                  onClick={() => setCodeDrawerMode("global")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    codeDrawerMode === "global"
                      ? "bg-zinc-700 text-white shadow-xs"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Página Global / JSON
                </button>
              </div>

              {/* Language Tabs: HTML | CSS | JS | JSON */}
              <div className="flex items-center gap-1 bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-700/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setCodeTab("html")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    codeTab === "html"
                      ? "bg-orange-500/25 text-orange-300 font-semibold border border-orange-500/40"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <FileCode2 className="h-3.5 w-3.5 text-orange-400" />
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab("css")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    codeTab === "css"
                      ? "bg-sky-500/25 text-sky-300 font-semibold border border-sky-500/40"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Paintbrush className="h-3.5 w-3.5 text-sky-400" />
                  CSS
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab("js")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    codeTab === "js"
                      ? "bg-yellow-500/25 text-yellow-300 font-semibold border border-yellow-500/40"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Braces className="h-3.5 w-3.5 text-yellow-400" />
                  JS
                </button>
                {codeDrawerMode === "global" && (
                  <button
                    type="button"
                    onClick={() => setCodeTab("json")}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      codeTab === "json"
                        ? "bg-emerald-500/25 text-emerald-300 font-semibold border border-emerald-500/40"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                    JSON Config
                  </button>
                )}
              </div>
            </div>

            {/* Right side of header */}
            <div className="flex items-center gap-2.5 shrink-0">
              {codeDrawerMode === "block" && (
                <span className="text-[11px] text-zinc-400 hidden xl:inline">
                  Tip: escribí{" "}
                  <code className="text-amber-300 bg-zinc-800 px-1 py-0.5 rounded border border-zinc-700">
                    {"{{miVariable}}"}
                  </code>{" "}
                  en el HTML para crear campos visuales automáticos
                </span>
              )}
              <span className="text-[11px] text-zinc-500 hidden md:inline font-mono">
                <kbd className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-700">
                  Esc
                </kbd>{" "}
                para salir
              </span>
              <button
                type="button"
                onClick={() => setCodeDrawerMode("closed")}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Check className="h-3.5 w-3.5" />
                Listo y Volver
              </button>
              <button
                type="button"
                onClick={() => setCodeDrawerMode("closed")}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Cerrar editor de código (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Monaco Editor Container - 100% full screen height */}
          <div className="flex-1 min-h-0 bg-[#1e1e1e] relative">
            {codeDrawerMode === "block" && selectedBlock ? (
              <Editor
                height="100%"
                theme="vs-dark"
                path={`block-${selectedBlock.id}.${codeTab}`}
                language={
                  codeTab === "html"
                    ? "html"
                    : codeTab === "css"
                    ? "css"
                    : "javascript"
                }
                value={
                  codeTab === "html"
                    ? selectedBlock.htmlTemplate
                    : codeTab === "css"
                    ? selectedBlock.cssTemplate
                    : selectedBlock.jsTemplate
                }
                onChange={(val) => {
                  const nextVal = val ?? "";
                  if (codeTab === "html") {
                    handleUpdateBlockCode(selectedBlock.id, {
                      htmlTemplate: nextVal,
                    });
                  } else if (codeTab === "css") {
                    handleUpdateBlockCode(selectedBlock.id, {
                      cssTemplate: nextVal,
                    });
                  } else {
                    handleUpdateBlockCode(selectedBlock.id, {
                      jsTemplate: nextVal,
                    });
                  }
                }}
                options={{
                  minimap: { enabled: true },
                  fontSize: 13.5,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  padding: { top: 12 },
                }}
              />
            ) : (
              <Editor
                height="100%"
                theme="vs-dark"
                path={`global-landing.${codeTab}`}
                language={
                  codeTab === "html"
                    ? "html"
                    : codeTab === "css"
                    ? "css"
                    : codeTab === "json"
                    ? "json"
                    : "javascript"
                }
                value={
                  codeTab === "json"
                    ? jsonEditorText
                    : codeTab === "html"
                    ? htmlForEditor
                    : codeTab === "css"
                    ? (documentState.mode === "raw" ? rawCss : documentState.globalCss)
                    : (documentState.mode === "raw" ? rawJs : documentState.globalJs)
                }
                onChange={(val) => {
                  const nextVal = val ?? "";
                  if (codeTab === "json") {
                    updateJsonText(nextVal);
                  } else if (codeTab === "html") {
                    const snapshot = store.getState().snapshot;
                    commitSnapshot({ ...snapshot, document: { ...snapshot.document, mode: "raw" }, rawHtml: nextVal });
                  } else if (codeTab === "css") {
                    const snapshot = store.getState().snapshot;
                    if (snapshot.document.mode === "raw") commitSnapshot({ ...snapshot, rawCss: nextVal });
                    else updateDocument((prev) => ({ ...prev, globalCss: nextVal }));
                  } else {
                    const snapshot = store.getState().snapshot;
                    if (snapshot.document.mode === "raw") commitSnapshot({ ...snapshot, rawJs: nextVal });
                    else updateDocument((prev) => ({ ...prev, globalJs: nextVal }));
                  }
                }}
                options={{
                  minimap: { enabled: true },
                  fontSize: 13.5,
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  padding: { top: 12 },
                }}
              />
            )}
          </div>

          {/* Bottom Status / Footer Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-zinc-950 text-zinc-400 border-t border-zinc-850 text-xs shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Sincronización en vivo con el lienzo
              </span>
              <span className="text-zinc-700">|</span>
              <span className="text-zinc-400">
                {codeDrawerMode === "block"
                  ? `Módulo: ${selectedBlock?.name ?? "Bloque"}`
                  : `Documento completo: ${documentState.blocks.length} módulos`}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-zinc-500">
                {codeTab.toUpperCase()} • Monaco IDE
              </span>
              <button
                type="button"
                onClick={() => setCodeDrawerMode("closed")}
                className="px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                Cerrar Editor
              </button>
            </div>
          </div>
        </div>
  );
}
