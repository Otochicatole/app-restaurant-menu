import { useEffect } from "react";
import { Code2, Eye, Save, Globe, ExternalLink, Smartphone, Monitor, Tablet, LayoutTemplate, Undo2, Redo2, MousePointerClick } from "lucide-react";
import { landingWorkspace } from "./landing-workspace";
import { type LandingRestaurant } from "./landing-requests";
import { type LandingDocumentCommands } from "./landing-document-commands";

export function LandingEditorToolbar({ restaurant, commands }: { restaurant: LandingRestaurant; commands: LandingDocumentCommands }) {
  const { handleUndo, handleRedo, handleSaveDraft, handlePublish } = commands;
  const isPending = landingWorkspace.useSelector((state) => state.write !== null || state.libraryRequests > 0);
  const store = landingWorkspace.useStore();
  const history = landingWorkspace.useSelector((state) => state.history);
  const selectedBlockId = landingWorkspace.useSelector((state) => state.selectedBlockId);
  const [viewport, setViewport] = landingWorkspace.useField("viewport");
  const [interactiveCanvas, setInteractiveCanvas] = landingWorkspace.useField("interactiveCanvas");
  const [codeDrawerMode, setCodeDrawerMode] = landingWorkspace.useField("codeDrawerMode");
  const isPublished = landingWorkspace.useSelector((state) => state.isPublished);
  const isDirty = landingWorkspace.useSelector((state) => state.editVersion !== state.savedVersion);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && codeDrawerMode !== "closed") {
        e.preventDefault();
        setCodeDrawerMode("closed");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveDraft();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.key.toLowerCase() === "z" &&
        !e.shiftKey &&
        codeDrawerMode === "closed"
      ) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          handleUndo();
        }
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey)) &&
        codeDrawerMode === "closed"
      ) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA") {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveDraft, handleUndo, handleRedo, codeDrawerMode, setCodeDrawerMode]);
  return (
    <header className="flex items-center justify-between h-13 px-4 bg-white border-b border-zinc-200 shrink-0 gap-3 shadow-2xs">
        {/* Left: Breadcrumb + Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            <span className="text-xs font-medium text-zinc-500 hidden sm:inline">
              Landing
            </span>
            <span className="text-zinc-400 hidden sm:inline">/</span>
            <span className="text-sm font-semibold text-zinc-900 truncate max-w-[180px]">
              {restaurant.name}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
              isPublished
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-zinc-100 text-zinc-600 border-zinc-200"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isPublished ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {isPublished ? "Publicada" : "Borrador"}
          </span>

          {isDirty && (
            <span className="text-[11px] text-amber-600 font-medium hidden md:inline">
              • Sin guardar
            </span>
          )}
        </div>

        {/* Center: Viewport Switcher + Undo/Redo + Preview + Code + Templates */}
        <div className="flex items-center gap-1.5">
          {/* Device Viewport Switcher */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`p-1.5 rounded-md transition-colors ${
                viewport === "desktop"
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Vista Escritorio"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport("tablet")}
              className={`p-1.5 rounded-md transition-colors ${
                viewport === "tablet"
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Vista Tablet (768px)"
            >
              <Tablet className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`p-1.5 rounded-md transition-colors ${
                viewport === "mobile"
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Vista Móvil (390px)"
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-200 mx-0.5 hidden sm:block" />

          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.past.length === 0}
              className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Deshacer (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={history.future.length === 0}
              className="p-1.5 rounded-md text-zinc-600 hover:text-zinc-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Rehacer (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-4 w-px bg-zinc-200 mx-0.5" />

          {/* Clean Preview vs Interactive Canvas Toggle */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setInteractiveCanvas(true)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                interactiveCanvas
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Lienzo de edición: seleccioná bloques, arrastrá elementos y editá textos"
            >
              <MousePointerClick className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setInteractiveCanvas(false)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                !interactiveCanvas
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
              title="Vista previa interactiva: probá el sitio como un cliente final (menú responsive, enlaces, acordeones)"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Interactivo</span>
            </button>
          </div>

          {/* Code Drawer Toggle (Full-Screen Modal) */}
          <button
            type="button"
            onClick={() =>
              setCodeDrawerMode((m) =>
                m === "closed" ? (selectedBlockId ? "block" : "global") : "closed",
              )
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              codeDrawerMode !== "closed"
                ? "bg-blue-50 text-blue-700 border-blue-300 shadow-2xs font-semibold"
                : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 shadow-2xs"
            }`}
            title="Abrir editor de código a pantalla completa"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Código</span>
          </button>

          {/* Templates Library Button */}
          <button
            type="button"
            onClick={() => store.dispatch(landingWorkspace.changed({ libraryDialog: "templates" }))}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-2xs transition-colors"
            title="Biblioteca de Plantillas de Landing"
          >
            <LayoutTemplate className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden md:inline">Plantillas</span>
          </button>
        </div>

        {/* Right: External Link + Save + Publish */}
        <div className="flex items-center gap-2">
          {isPublished && (
            <a
              href={`/l/${restaurant.landingSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 shadow-2xs transition-colors"
              title="Ver landing pública en pestaña nueva"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Ver sitio</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 shadow-2xs transition-colors disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Guardar</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors disabled:opacity-50"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Publicar</span>
          </button>
        </div>
      </header>
  );
}
