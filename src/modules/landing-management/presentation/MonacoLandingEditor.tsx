"use client";

import { useMemo } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { type LandingEditorView } from "../application/landing-use-cases";
import { createDefaultLandingDocument } from "../domain/landing-compiler";
import { landingSeed, landingWorkspace } from "./landing-workspace";
import { type LandingRestaurant } from "./landing-requests";
import { createLandingDocumentCommands } from "./landing-document-commands";
import { useLandingCanvasPort } from "./landing-canvas-port";
import { LandingEditorToolbar } from "./LandingEditorToolbar";
import { LandingLayersPanel } from "./LandingLayersPanel";
import { LandingCanvas } from "./LandingCanvas";
import { LandingInspector } from "./LandingInspector";
import { LandingCodeDrawer } from "./LandingCodeDrawer";
import { LandingModuleDialog } from "./LandingModuleDialog";
import { LandingTemplateDialogs } from "./LandingTemplateDialogs";
import { LandingMediaDialog } from "./LandingMediaDialog";

interface MonacoLandingEditorProps {
  initialData: LandingEditorView;
  isSuperAdmin?: boolean;
}

export function MonacoLandingEditor(props: MonacoLandingEditorProps) {
  const { initialData, isSuperAdmin } = props;
  const { restaurant, landingPage } = initialData;
  const seed = useMemo(() => landingSeed(initialData, landingPage.document ??
    createDefaultLandingDocument(restaurant.name, restaurant.landingSlug, restaurant.slug)), [initialData, landingPage.document, restaurant]);
  return (
    <landingWorkspace.Provider key={restaurant.id + ":" + Boolean(isSuperAdmin)} seed={seed}>
      <LandingStudio restaurant={restaurant} />
    </landingWorkspace.Provider>
  );
}

function LandingStudio({ restaurant }: { restaurant: LandingRestaurant }) {
  const store = landingWorkspace.useStore();
  const port = useLandingCanvasPort();
  const commands = useMemo(() => createLandingDocumentCommands(store, restaurant, port), [store, restaurant, port]);
  return (
    <>
      <div className="flex min-h-[70dvh] flex-col justify-center gap-4 p-6 md:hidden">
        <h1 className="text-2xl font-semibold text-stone-900">Editor de landing</h1>
        <p className="text-sm leading-6 text-stone-600">
          Para diseñar los bloques y estilos con precisión necesitás una pantalla más grande. Desde acá podés abrir la configuración o ver la landing pública.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
            href={`/admin/restaurants/${encodeURIComponent(restaurant.id)}/settings`}
          >
            Configuración
          </a>
          <a
            className="rounded-lg border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            href={`/l/${encodeURIComponent(restaurant.landingSlug)}`}
            target="_blank"
            rel="noreferrer"
          >
            Ver landing pública
          </a>
        </div>
      </div>

      <div className="hidden h-dvh w-full flex-col overflow-hidden bg-zinc-100 text-zinc-900 select-none md:flex">
        <LandingEditorToolbar restaurant={restaurant} commands={commands} />
        <LandingFeedback />
        <div className="flex flex-1 overflow-hidden min-h-0">
          <LandingLayersPanel restaurant={restaurant} commands={commands} port={port} />
          <LandingCanvas restaurant={restaurant} commands={commands} port={port} />
          <LandingInspector restaurant={restaurant} commands={commands} />
        </div>
        <LandingCodeDrawer restaurant={restaurant} commands={commands} />
        <LandingModule restaurant={restaurant} />
        <LandingTemplateDialogs restaurant={restaurant} />
        <LandingMediaDialog restaurant={restaurant} commands={commands} />
      </div>
    </>
  );
}

function LandingModule({ restaurant }: { restaurant: LandingRestaurant }) {
  const open = landingWorkspace.useSelector((state) => state.libraryDialog === "saveModule");
  return open ? <LandingModuleDialog restaurant={restaurant} /> : null;
}

function LandingFeedback() {
  const [feedback, setFeedback] = landingWorkspace.useField("feedback");
  if (!feedback) return null;
  const success = feedback.type === "success";
  return (
    <div className={`flex items-center justify-between px-4 py-2 text-xs font-medium border-b shrink-0 ${
      success ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
    }`}>
      <div className="flex items-center gap-2">
        {success ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />}
        <span>{feedback.message}</span>
      </div>
      <button type="button" aria-label="Cerrar aviso" onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-zinc-800">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
