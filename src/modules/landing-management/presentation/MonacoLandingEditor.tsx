"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Code2,
  ExternalLink,
  Eye,
  FileCode2,
  Globe,
  Laptop,
  Layers,
  Loader2,
  Moon,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Smartphone,
  Sun,
  Tablet,
} from "lucide-react";
import type { LandingEditorView } from "../application/landing-use-cases";
import { compileLandingDocument, createDefaultLandingTemplate } from "../domain/landing-compiler";
import { publishLandingAction, saveLandingDraftAction } from "./actions";

// Monaco Editor client dynamic import configured with local static assets
const Editor = dynamic(
  async () => {
    const monacoReact = await import("@monaco-editor/react");
    monacoReact.loader.config({
      paths: {
        vs: "/api/monaco/vs",
      },
    });
    return monacoReact.default;
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-zinc-400">
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="animate-spin text-emerald-400" />
          <span className="text-sm font-medium">Cargando editor Monaco...</span>
        </div>
      </div>
    ),
  },
);

type TabType = "html" | "css" | "js";
type ViewportSize = "desktop" | "tablet" | "mobile";

type Props = {
  initialData: LandingEditorView;
  isSuperAdmin?: boolean;
};

export function MonacoLandingEditor({ initialData, isSuperAdmin = false }: Props) {
  const { tenant } = initialData;
  const [activeTab, setActiveTab] = useState<TabType>("html");
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [viewport, setViewport] = useState<ViewportSize>("desktop");

  const [htmlContent, setHtmlContent] = useState(initialData.landingPage.htmlContent);
  const [cssContent, setCssContent] = useState(initialData.landingPage.cssContent);
  const [jsContent, setJsContent] = useState(initialData.landingPage.jsContent);

  const [savedHtml, setSavedHtml] = useState(initialData.landingPage.htmlContent);
  const [savedCss, setSavedCss] = useState(initialData.landingPage.cssContent);
  const [savedJs, setSavedJs] = useState(initialData.landingPage.jsContent);

  const [isPublished, setIsPublished] = useState(initialData.landingPage.published);
  const [publishedAt, setPublishedAt] = useState(initialData.landingPage.publishedAt);

  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  // Debounced preview content
  const [debouncedCode, setDebouncedCode] = useState({
    html: htmlContent,
    css: cssContent,
    js: jsContent,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode({
        html: htmlContent,
        css: cssContent,
        js: jsContent,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [htmlContent, cssContent, jsContent]);

  const compiledPreviewDoc = useMemo(() => {
    return compileLandingDocument({
      htmlContent: debouncedCode.html,
      cssContent: debouncedCode.css,
      jsContent: debouncedCode.js,
      title: tenant.name,
    });
  }, [debouncedCode, tenant.name]);

  const isDirty =
    htmlContent !== savedHtml || cssContent !== savedCss || jsContent !== savedJs;

  const showToast = useCallback((text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const result = await saveLandingDraftAction({
        tenantId: tenant.id,
        htmlContent,
        cssContent,
        jsContent,
      });

      if (!result.success) {
        showToast(result.error.message || "Error al guardar borrador", "error");
        return;
      }

      setSavedHtml(htmlContent);
      setSavedCss(cssContent);
      setSavedJs(jsContent);
      showToast("Borrador guardado exitosamente");
    } catch {
      showToast("Error de conexión al guardar", "error");
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const result = await publishLandingAction({
        tenantId: tenant.id,
        htmlContent,
        cssContent,
        jsContent,
      });

      if (!result.success) {
        showToast(result.error.message || "Error al publicar la landing", "error");
        return;
      }

      setSavedHtml(htmlContent);
      setSavedCss(cssContent);
      setSavedJs(jsContent);
      setIsPublished(true);
      setPublishedAt(result.data.publishedAt);
      showToast("¡Landing publicada con éxito! Disponible en /l/" + tenant.slug);
    } catch {
      showToast("Error de conexión al publicar", "error");
    } finally {
      setPublishing(false);
    }
  };

  const handleResetToTemplate = () => {
    if (
      !window.confirm(
        "¿Restablecer el código de la landing a la plantilla base recomendada? Se perderán las modificaciones no guardadas.",
      )
    ) {
      return;
    }
    const template = createDefaultLandingTemplate(tenant.name, tenant.slug);
    setHtmlContent(template.html);
    setCssContent(template.css);
    setJsContent(template.js);
    showToast("Plantilla inicial cargada");
  };

  const getCurrentCode = () => {
    if (activeTab === "html") return htmlContent;
    if (activeTab === "css") return cssContent;
    return jsContent;
  };

  const handleCodeChange = (value: string | undefined) => {
    const val = value ?? "";
    if (activeTab === "html") setHtmlContent(val);
    else if (activeTab === "css") setCssContent(val);
    else setJsContent(val);
  };

  const getLanguage = () => {
    if (activeTab === "html") return "html";
    if (activeTab === "css") return "css";
    return "javascript";
  };

  const publicUrl = `/l/${tenant.slug}`;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.type === "success"
              ? "border border-emerald-500/30 bg-emerald-950/95 text-emerald-200"
              : "border border-red-500/30 bg-red-950/95 text-red-200"
          }`}
        >
          {toastMessage.type === "success" ? <Check size={16} /> : null}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          {isSuperAdmin ? (
            <Link
              href="/superadmin/clientes"
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              <span>Clientes</span>
              <ChevronRight size={12} />
            </Link>
          ) : null}

          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Globe size={15} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-sm font-semibold text-zinc-100">
                  {tenant.name}
                </h1>
                <span className="hidden font-mono text-xs text-zinc-500 sm:inline">
                  /l/{tenant.slug}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden h-4 w-px bg-zinc-800 sm:block" />

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            {isPublished ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300"
                title={publishedAt ? `Última publicación: ${new Date(publishedAt).toLocaleString("es-AR")}` : undefined}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {isDirty ? "Publicado (con cambios)" : "Publicado en vivo"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Borrador sin publicar
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Public Link */}
          <Link
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-700 hover:text-white md:inline-flex"
            title="Abrir landing pública en nueva pestaña"
          >
            <ExternalLink size={13} />
            <span>Ver /l/{tenant.slug}</span>
          </Link>

          {/* Save Draft */}
          <button
            type="button"
            disabled={savingDraft || publishing || !isDirty}
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {savingDraft ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{savingDraft ? "Guardando..." : "Guardar borrador"}</span>
          </button>

          {/* Publish Button */}
          <button
            type="button"
            disabled={savingDraft || publishing}
            onClick={handlePublish}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {publishing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            <span>{publishing ? "Publicando..." : "Publicar"}</span>
          </button>
        </div>
      </header>

      {/* Editor & Preview Split Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane: Code Editor */}
        <section className="flex w-1/2 flex-col border-r border-zinc-800 bg-zinc-950">
          {/* Editor Sub-Header: Tabs & Tools */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("html")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
                  activeTab === "html"
                    ? "bg-zinc-800 text-orange-400 shadow-xs"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <Code2 size={13} />
                <span>HTML</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("css")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
                  activeTab === "css"
                    ? "bg-zinc-800 text-sky-400 shadow-xs"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <FileCode2 size={13} />
                <span>CSS</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("js")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
                  activeTab === "js"
                    ? "bg-zinc-800 text-amber-400 shadow-xs"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
                }`}
              >
                <Layers size={13} />
                <span>JavaScript</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Reset to template */}
              <button
                type="button"
                onClick={handleResetToTemplate}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                title="Restablecer plantilla inicial con diseño completo"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Restablecer base</span>
              </button>

              {/* Theme toggle */}
              <button
                type="button"
                onClick={() => setEditorTheme((prev) => (prev === "vs-dark" ? "light" : "vs-dark"))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                title={`Cambiar a tema ${editorTheme === "vs-dark" ? "claro" : "oscuro"}`}
              >
                {editorTheme === "vs-dark" ? <Sun size={13} /> : <Moon size={13} />}
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="relative flex-1 overflow-hidden">
            <Editor
              height="100%"
              path={`landing.${activeTab}`}
              language={getLanguage()}
              theme={editorTheme}
              value={getCurrentCode()}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, Monaco, Consolas, monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                tabSize: 2,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                smoothScrolling: true,
                renderWhitespace: "selection",
              }}
            />
          </div>
        </section>

        {/* Right Pane: Live Preview */}
        <section className="flex w-1/2 flex-col bg-zinc-900/40">
          {/* Preview Sub-Header: Responsive Controls & Refresh */}
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Eye size={13} className="text-emerald-400" />
                <span>Vista previa en vivo</span>
              </span>
            </div>

            {/* Viewport Width Switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                className={`flex h-6 w-7 items-center justify-center rounded-md transition ${
                  viewport === "desktop"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Vista Escritorio (100%)"
              >
                <Laptop size={13} />
              </button>
              <button
                type="button"
                onClick={() => setViewport("tablet")}
                className={`flex h-6 w-7 items-center justify-center rounded-md transition ${
                  viewport === "tablet"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Vista Tablet (768px)"
              >
                <Tablet size={13} />
              </button>
              <button
                type="button"
                onClick={() => setViewport("mobile")}
                className={`flex h-6 w-7 items-center justify-center rounded-md transition ${
                  viewport === "mobile"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                title="Vista Móvil (375px)"
              >
                <Smartphone size={13} />
              </button>
            </div>

            {/* Refresh Frame */}
            <button
              type="button"
              onClick={() => setPreviewKey((k) => k + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
              title="Recargar vista previa"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Preview Viewport Frame */}
          <div className="flex flex-1 items-center justify-center overflow-auto bg-zinc-900/60 p-2 sm:p-4">
            <div
              className={`h-full bg-white shadow-2xl transition-all duration-300 ${
                viewport === "mobile"
                  ? "w-[375px] rounded-2xl border-4 border-zinc-800 overflow-hidden"
                  : viewport === "tablet"
                  ? "w-[768px] rounded-xl border-2 border-zinc-800 overflow-hidden"
                  : "w-full rounded-lg border border-zinc-800 overflow-hidden"
              }`}
            >
              <iframe
                key={previewKey}
                title="Vista previa de Landing"
                srcDoc={compiledPreviewDoc}
                className="h-full w-full border-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
