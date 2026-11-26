import { describe, expect, it, vi } from "vitest";
import type { LandingTemplateView } from "../contracts";
import { createDefaultLandingDocument } from "../domain/landing-compiler";
import { applyLandingTemplate, writeLanding } from "./landing-requests";
import { landingEdited, landingInlineCommitted, landingRedone, landingSeed, landingUndone, landingWorkspace, landingWriteFinished, landingWriteStarted } from "./landing-workspace";

const { saveLandingDraftAction } = vi.hoisted(() => ({ saveLandingDraftAction: vi.fn() }));
vi.mock("./actions", () => ({ saveLandingDraftAction }));

const updatedAt = "2026-11-06T12:00:00Z";
const document = createDefaultLandingDocument("Café", "cafe");
const initial = {
  landingPage: { id: "landing", restaurantId: "cafe", document, htmlContent: "original", cssContent: "css", jsContent: "js", published: false, publishedAt: null, createdAt: updatedAt, updatedAt },
  restaurant: { id: "cafe", name: "Café", slug: "cafe", landingSlug: "cafe", landingEnabled: true },
  customModules: [], templates: [], hasPublishedStorage: false,
};
const makeStore = () => landingWorkspace.makeStore(landingSeed(initial, document));

describe("landing workspace", () => {
  it("undoes and redoes document and all raw sources together", () => {
    const store = makeStore();
    const original = store.getState().snapshot;
    const snapshot = { document: { ...document, mode: "raw" as const }, rawHtml: "new", rawCss: "new css", rawJs: "new js" };
    store.dispatch(landingEdited({ snapshot, recordHistory: true, resetSelection: true }));
    store.dispatch(landingUndone());
    expect(store.getState().snapshot).toEqual(original);
    store.dispatch(landingRedone());
    expect(store.getState().snapshot).toEqual(snapshot);
  });

  it("keeps only 30 undo entries and records one entry for an inline edit", () => {
    const store = makeStore();
    for (let index = 0; index < 31; index += 1) {
      store.dispatch(landingEdited({ snapshot: { ...store.getState().snapshot, rawHtml: String(index) }, recordHistory: true }));
    }
    const before = store.getState().snapshot;
    for (const rawHtml of ["a", "ab", "abc"]) {
      store.dispatch(landingEdited({ snapshot: { ...before, rawHtml }, recordHistory: false }));
    }
    store.dispatch(landingInlineCommitted(before));
    expect(store.getState().history.past).toHaveLength(30);
    store.dispatch(landingUndone());
    expect(store.getState().snapshot).toEqual(before);
  });

  it("keeps edits made during publication dirty", () => {
    const store = makeStore();
    store.dispatch(landingWriteStarted());
    store.dispatch(landingEdited({ snapshot: { ...store.getState().snapshot, rawHtml: "newer" }, recordHistory: true }));
    store.dispatch(landingWriteFinished({ id: 1, updatedAt, published: true, feedback: { type: "success", message: "Publicada" } }));
    expect(store.getState()).toMatchObject({ editVersion: 1, savedVersion: 0, isPublished: true, snapshot: { rawHtml: "newer" } });
  });

  it("applies a template as one reversible change without affecting another editor", () => {
    const store = makeStore();
    const other = makeStore();
    const before = store.getState().snapshot;
    const template: LandingTemplateView = {
      id: "template", name: "Otra portada", description: "", visibility: "PRIVATE", status: "DRAFT", isSystem: false,
      restaurantId: "cafe", document: { ...document, mode: "raw", blocks: [] },
      htmlContent: "<h1>Template</h1>", cssContent: "h1 { color: red }", jsContent: "window.template = true;",
      rejectionReason: null, createdAt: updatedAt, updatedAt,
    };
    store.dispatch(applyLandingTemplate(initial.restaurant, template));
    expect(store.getState().history.past).toEqual([before]);
    expect(store.getState().snapshot).toMatchObject({
      document: { mode: "raw", blocks: [] }, rawCss: template.cssContent, rawJs: template.jsContent,
    });
    expect(store.getState().snapshot.rawHtml).toContain(template.htmlContent);
    expect(other.getState().snapshot).toEqual(before);
    store.dispatch(landingUndone());
    expect(store.getState().snapshot).toEqual(before);
  });

  it("writes the captured sources once and leaves subsequent edits dirty", async () => {
    const store = makeStore();
    const raw = { ...store.getState().snapshot, document: { ...document, mode: "raw" as const } };
    store.dispatch(landingEdited({ snapshot: raw, recordHistory: true }));
    let finish!: (value: { success: true; data: { updatedAt: string } }) => void;
    saveLandingDraftAction.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const saving = store.dispatch(writeLanding(initial.restaurant, false));
    store.dispatch(landingEdited({ snapshot: { ...raw, rawHtml: "newer" }, recordHistory: true }));
    await store.dispatch(writeLanding(initial.restaurant, false));
    expect(saveLandingDraftAction).toHaveBeenCalledTimes(1);
    expect(saveLandingDraftAction).toHaveBeenCalledWith({
      restaurantId: "cafe", document: raw.document, htmlContent: raw.rawHtml, cssContent: raw.rawCss, jsContent: raw.rawJs,
    });
    finish({ success: true, data: { updatedAt } });
    await saving;
    expect(store.getState()).toMatchObject({ editVersion: 2, savedVersion: 1, snapshot: { rawHtml: "newer" } });
  });
});
