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
    <div className="flex flex-col h-screen w-full bg-zinc-100 text-zinc-900 overflow-hidden select-none">
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
