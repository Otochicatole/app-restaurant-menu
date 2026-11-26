import { describe, expect, it } from "vitest";
import { createTemplateDocument } from "../domain/template";
import { menuEdited, menuOperationFailed, menuOperationStarted, menuOperationSucceeded, menuRedone, menuSeed, menuUndone, menuWorkspace } from "./menu-workspace";

const document = createTemplateDocument("Café");
const project = {
  id: "menu", name: "Café", slug: "cafe", publicDescription: "", isPrimary: true,
  document, draftRevision: 3, publishedRevision: null, publishedAt: null, hasPublishedDocument: false,
};
const makeStore = () => menuWorkspace.makeStore(menuSeed(project, document, [], []));

describe("menu workspace", () => {
  it("bounds history to 100 steps, isolates instances and invalidates redo on new edits", () => {
    const store = makeStore();
    const other = makeStore();
    for (let width = 100; width <= 200; width += 1) {
      store.dispatch(menuEdited({ ...document, canvasBounds: { ...document.canvasBounds, width } }));
    }
    expect(store.getState().history).toHaveLength(100);
    store.dispatch(menuUndone());
    expect(store.getState().document.canvasBounds.width).toBe(199);
    store.dispatch(menuRedone());
    expect(store.getState().document.canvasBounds.width).toBe(200);
    store.dispatch(menuUndone());
    store.dispatch(menuEdited(document));
    expect(store.getState().future).toEqual([]);
    expect(other.getState()).toMatchObject({ document, dirty: false, history: [] });
  });

  it("keeps later edits dirty after saving and ignores a completion for an older operation", () => {
    const store = makeStore();
    store.dispatch(menuEdited(document));
    store.dispatch(menuOperationStarted({ kind: "save", status: "Guardando" }));
    const id = store.getState().lastOperation;
    store.dispatch(menuOperationStarted({ kind: "publish", status: "Publicando" }));
    expect(store.getState().operation?.kind).toBe("save");
    store.dispatch(menuEdited({ ...document, nodes: [] }));
    store.dispatch(menuOperationSucceeded({ id, revision: 4, status: "Guardado" }));
    expect(store.getState()).toMatchObject({ revision: 4, dirty: true, document: { nodes: [] } });
    store.dispatch(menuOperationStarted({ kind: "publish", status: "Publicando" }));
    store.dispatch(menuOperationFailed({ id, status: "Obsoleto", conflict: true }));
    expect(store.getState()).toMatchObject({ conflict: false, operation: { kind: "publish" } });
  });

  it("records a template replacement as one undo step and supports reloading after a conflict", () => {
    const store = makeStore();
    store.dispatch(menuOperationStarted({ kind: "apply", status: "Aplicando" }));
    store.dispatch(menuOperationSucceeded({ id: 1, revision: 4, document: { ...document, nodes: [] }, status: "Plantilla aplicada" }));
    expect(store.getState()).toMatchObject({ history: [document], dirty: false, revision: 4 });
    store.dispatch(menuUndone());
    expect(store.getState()).toMatchObject({ document, dirty: true });
    store.dispatch(menuOperationStarted({ kind: "save", status: "Guardando" }));
    store.dispatch(menuOperationFailed({ id: 2, conflict: true, status: "Conflicto" }));
    expect(store.getState().conflict).toBe(true);
    store.dispatch(menuOperationStarted({ kind: "reload", status: "Cargando" }));
    store.dispatch(menuOperationSucceeded({ id: 3, revision: 5, document, status: "Cargado" }));
    expect(store.getState()).toMatchObject({ history: [], future: [], conflict: false, dirty: false, revision: 5 });
  });
});
