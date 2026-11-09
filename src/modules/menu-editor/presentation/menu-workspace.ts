import { createAction } from "@reduxjs/toolkit";
import { createEditorWorkspace } from "@/ui/editor-workspace";
import type { CanvasDocumentV1, MenuAssetView, MenuProjectView, MenuTemplateView } from "../contracts";
import type { MediaSelectorTarget } from "./MediaSelectorModal";

type MenuOperation = "save" | "publish" | "apply" | "overwrite" | "reload";
type MenuWorkspace = ReturnType<typeof menuSeed>;

export function menuSeed(project: MenuProjectView, document: CanvasDocumentV1, assets: MenuAssetView[], templates: MenuTemplateView[]) {
  return {
    document,
    revision: project.draftRevision,
    publishedRevision: project.publishedRevision,
    viewport: document.initialViewport,
    history: [] as CanvasDocumentV1[],
    future: [] as CanvasDocumentV1[],
    selectedIds: [] as string[],
    selectedGroupId: null as string | null,
    deepSelectedId: null as string | null,
    layersOpen: true,
    iconsOpen: false,
    imagesOpen: false,
    templatesOpen: false,
    mediaSelectorTarget: null as MediaSelectorTarget | null,
    modalZIndices: { media: 70, icons: 71, templates: 72, mediaSelector: 75 } as Record<string, number>,
    gridEnabled: false,
    toolMode: "select" as "select" | "hand",
    assets,
    templates,
    editVersion: 0,
    dirty: false,
    conflict: false,
    status: "Guardado",
    operation: null as { kind: MenuOperation; id: number; version: number } | null,
    lastOperation: 0,
  };
}

export const menuEdited = createAction<CanvasDocumentV1>("menu/documentEdited");
export const menuUndone = createAction("menu/undone");
export const menuRedone = createAction("menu/redone");
export const menuOperationStarted = createAction<{ kind: MenuOperation; status: string }>("menu/operationStarted");
export const menuOperationFailed = createAction<{ id: number; status: string; conflict: boolean }>("menu/operationFailed");
export const menuOperationSucceeded = createAction<{
  id: number; revision: number; publishedRevision?: number | null; document?: CanvasDocumentV1; status: string;
}>("menu/operationSucceeded");

function markEdited(state: MenuWorkspace) {
  state.editVersion += 1;
  state.dirty = true;
  state.status = "Cambios pendientes";
}

function clearSelection(state: MenuWorkspace) {
  state.selectedIds = [];
  state.selectedGroupId = null;
  state.deepSelectedId = null;
}

export const menuWorkspace = createEditorWorkspace<MenuWorkspace>("menu", (builder) => {
  builder
    .addCase(menuEdited, (state, { payload }) => {
      state.history = [...state.history.slice(-99), state.document];
      state.document = payload;
      state.future = [];
      markEdited(state);
    })
    .addCase(menuUndone, (state) => {
      if (state.operation?.kind === "apply" || state.operation?.kind === "reload") return;
      const previous = state.history.pop();
      if (!previous) return;
      state.future.push(state.document);
      state.document = previous;
      clearSelection(state);
      markEdited(state);
    })
    .addCase(menuRedone, (state) => {
      if (state.operation?.kind === "apply" || state.operation?.kind === "reload") return;
      const next = state.future.pop();
      if (!next) return;
      state.history = [...state.history.slice(-99), state.document];
      state.document = next;
      clearSelection(state);
      markEdited(state);
    })
    .addCase(menuOperationStarted, (state, { payload }) => {
      if (state.operation) return;
      state.lastOperation += 1;
      state.operation = { kind: payload.kind, id: state.lastOperation, version: state.editVersion };
      state.status = payload.status;
    })
    .addCase(menuOperationFailed, (state, { payload }) => {
      if (state.operation?.id !== payload.id) return;
      state.operation = null;
      state.status = payload.status;
      state.conflict ||= payload.conflict;
    })
    .addCase(menuOperationSucceeded, (state, { payload }) => {
      const operation = state.operation;
      if (operation?.id !== payload.id) return;
      state.operation = null;
      state.revision = payload.revision;
      if (payload.publishedRevision !== undefined) state.publishedRevision = payload.publishedRevision;
      state.conflict = false;
      if (payload.document && operation.version === state.editVersion) {
        state.history = operation.kind === "apply" ? [...state.history.slice(-99), state.document] : [];
        state.future = [];
        state.document = payload.document;
        if (operation.kind === "apply") state.viewport = payload.document.initialViewport;
        clearSelection(state);
        state.mediaSelectorTarget = null;
      }
      state.dirty = operation.version !== state.editVersion;
      state.status = state.dirty ? `${payload.status}; hay cambios pendientes` : payload.status;
    });
});
