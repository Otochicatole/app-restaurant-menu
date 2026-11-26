import { createAction } from "@reduxjs/toolkit";
import { createEditorWorkspace } from "@/ui/editor-workspace";
import type { LandingEditorView } from "../application/landing-use-cases";
import type { LandingDocumentV1 } from "../contracts";

export type ViewportMode = "desktop" | "tablet" | "mobile";
export type LeftSidebarTab = "layers" | "components" | "modules";
export type RightSidebarTab = "properties" | "design";
export type CodeDrawerMode = "closed" | "block" | "global";
export type CodeTab = "html" | "css" | "js" | "json";

type SubElementAncestor = {
  selector: string;
  label: string;
  tagName: string;
  isRepeatable: boolean;
};

export type SelectedSubElementInfo = {
  blockId: string;
  selector: string;
  tagName: string;
  label: string;
  isImage: boolean;
  isLink: boolean;
  isRepeatable: boolean;
  boundTextField: string | null;
  boundSrcField: string | null;
  boundHrefField: string | null;
  boundAltField: string | null;
  childFieldKeys?: string[];
  currentSrc: string;
  currentAlt: string;
  currentHref: string;
  ancestors: SubElementAncestor[];
  computedStyles?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: string;
    paddingTop?: string;
    paddingBottom?: string;
    paddingLeft?: string;
    paddingRight?: string;
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
    textAlign?: string;
    display?: string;
    flexDirection?: string;
    flexWrap?: string;
    justifyContent?: string;
    alignItems?: string;
    gap?: string;
    gridTemplateColumns?: string;
    width?: string;
    maxWidth?: string;
    height?: string;
    minHeight?: string;
    overflow?: string;
    position?: string;
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
    zIndex?: string;
  };
};


export type LandingSnapshot = {
  document: LandingDocumentV1;
  rawHtml: string;
  rawCss: string;
  rawJs: string;
};

export type MediaPickerTarget =
  | { kind: "field"; blockId: string; fieldKey: string; currentUrl: string; title: string }
  | { kind: "block-bg"; blockId: string; currentUrl: string; title: string }
  | { kind: "sub-img"; blockId: string; selector: string; boundSrcField: string | null; boundAltField: string | null; currentUrl: string; title: string }
  | { kind: "sub-bg"; blockId: string; selector: string; currentUrl: string; title: string };

type Feedback = { type: "success" | "error"; message: string };

export function landingSeed(initial: LandingEditorView, document: LandingDocumentV1) {
  return {
    snapshot: {
      document,
      rawHtml: initial.landingPage.htmlContent,
      rawCss: initial.landingPage.cssContent,
      rawJs: initial.landingPage.jsContent,
    },
    history: { past: [] as LandingSnapshot[], future: [] as LandingSnapshot[] },
    selectedBlockId: (document.blocks[0]?.id ?? null) as string | null,
    selectedSubElement: null as SelectedSubElementInfo | null,
    leftTab: "layers" as LeftSidebarTab,
    rightTab: "properties" as RightSidebarTab,
    isLeftSidebarOpen: true,
    isRightSidebarOpen: true,
    viewport: "desktop" as ViewportMode,
    interactiveCanvas: true,
    codeDrawerMode: "closed" as CodeDrawerMode,
    codeTab: "html" as CodeTab,
    expandedBlockIds: {} as Record<string, boolean>,
    expandedSubLayerIds: {} as Record<string, boolean>,
    customModules: initial.customModules ?? [],
    templates: initial.templates ?? [],
    libraryDialog: null as "templates" | "saveTemplate" | "saveModule" | null,
    mediaPickerTarget: null as MediaPickerTarget | null,
    libraryRequests: 0,
    isPublished: initial.landingPage.published && initial.hasPublishedStorage,
    lastSavedAt: initial.landingPage.updatedAt as string | null,
    editVersion: 0,
    savedVersion: 0,
    nextRequest: 0,
    write: null as { id: number; version: number } | null,
    feedback: null as Feedback | null,
  };
}

type LandingWorkspace = ReturnType<typeof landingSeed>;
export const landingEdited = createAction<{ snapshot: LandingSnapshot; recordHistory: boolean; resetSelection?: boolean }>("landing/documentEdited");
export const landingInlineCommitted = createAction<LandingSnapshot>("landing/inlineEditCommitted");
export const landingUndone = createAction("landing/undone");
export const landingRedone = createAction("landing/redone");
export const landingWriteStarted = createAction("landing/writeStarted");
export const landingWriteFinished = createAction<{ id: number; updatedAt?: string; published?: boolean; feedback: Feedback }>("landing/writeFinished");
export const landingLibraryRequestChanged = createAction<1 | -1>("landing/libraryRequestChanged");

function restoreSelection(state: LandingWorkspace, reset = false) {
  const blocks = state.snapshot.document.blocks;
  if (reset || !blocks.some(({ id }) => id === state.selectedBlockId)) state.selectedBlockId = blocks[0]?.id ?? null;
  state.selectedSubElement = null;
}

export const landingWorkspace = createEditorWorkspace<LandingWorkspace>("landing", (builder) => {
  builder
    .addCase(landingEdited, (state, { payload }) => {
      if (payload.recordHistory) state.history.past = [...state.history.past.slice(-29), state.snapshot];
      state.history.future = [];
      state.snapshot = payload.snapshot;
      if (payload.resetSelection) restoreSelection(state, true);
      state.editVersion += 1;
      state.feedback = null;
    })
    .addCase(landingInlineCommitted, (state, { payload }) => {
      state.history.past = [...state.history.past.slice(-29), payload];
      state.history.future = [];
    })
    .addCase(landingUndone, (state) => {
      const previous = state.history.past.pop();
      if (!previous) return;
      state.history.future = [state.snapshot, ...state.history.future.slice(0, 29)];
      state.snapshot = previous;
      restoreSelection(state);
      state.editVersion += 1;
    })
    .addCase(landingRedone, (state) => {
      const next = state.history.future.shift();
      if (!next) return;
      state.history.past = [...state.history.past.slice(-29), state.snapshot];
      state.snapshot = next;
      restoreSelection(state);
      state.editVersion += 1;
    })
    .addCase(landingWriteStarted, (state) => {
      if (state.write) return;
      state.nextRequest += 1;
      state.write = { id: state.nextRequest, version: state.editVersion };
      state.feedback = null;
    })
    .addCase(landingWriteFinished, (state, { payload }) => {
      const write = state.write;
      if (write?.id !== payload.id) return;
      state.write = null;
      state.feedback = payload.feedback;
      if (payload.updatedAt !== undefined) {
        state.lastSavedAt = payload.updatedAt;
        state.savedVersion = write.version;
      }
      if (payload.published) state.isPublished = true;
    })
    .addCase(landingLibraryRequestChanged, (state, { payload }) => { state.libraryRequests += payload; });
});
