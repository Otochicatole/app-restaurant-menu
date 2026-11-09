import { useState, useMemo } from "react";
import { BookmarkPlus } from "lucide-react";
import { landingWorkspace } from "./landing-workspace";
import { type LandingRestaurant, saveLandingModule } from "./landing-requests";

export function LandingModuleDialog({ restaurant }: { restaurant: LandingRestaurant }) {
  const isPending = landingWorkspace.useSelector((state) => state.write !== null || state.libraryRequests > 0);
  const store = landingWorkspace.useStore();
  const documentState = landingWorkspace.useSelector((state) => state.snapshot.document);
  const selectedBlockId = landingWorkspace.useSelector((state) => state.selectedBlockId);
  const selectedBlock = useMemo(
    () => documentState.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [documentState.blocks, selectedBlockId],
  );
  const [moduleName, setModuleName] = useState(() => selectedBlock?.name ?? "");
  const [moduleDesc, setModuleDesc] = useState("");
  if (!selectedBlock) return null;
  const handleSaveSelectedAsCustomModule = () => {
    if (moduleName.trim()) void store.dispatch(saveLandingModule(restaurant.id, selectedBlock, moduleName, moduleDesc));
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 p-6 shadow-2xl space-y-4 text-zinc-900">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-emerald-600" />
              Guardar Módulo Reutilizable
            </h3>
            <p className="text-xs text-zinc-600">
              Guardá este bloque (con su HTML, CSS, JS y{" "}
              {selectedBlock.fields.length} variables editables) en tu
              biblioteca de módulos para insertarlo en cualquier momento.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Nombre del módulo
                </label>
                <input
                  type="text"
                  value={moduleName}
                  onChange={(e) => setModuleName(e.target.value)}
                  placeholder="Ej: Card Especial del Chef"
                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Descripción breve (opcional)
                </label>
                <input
                  type="text"
                  value={moduleDesc}
                  onChange={(e) => setModuleDesc(e.target.value)}
                  placeholder="Ej: Tarjeta con precio, foto y botón"
                  className="w-full rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
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
                disabled={isPending || !moduleName.trim()}
                onClick={handleSaveSelectedAsCustomModule}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs disabled:opacity-50 transition-colors"
              >
                Guardar en mi biblioteca
              </button>
            </div>
          </div>
        </div>
  );
}
