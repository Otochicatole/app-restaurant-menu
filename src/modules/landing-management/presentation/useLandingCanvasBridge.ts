import { useState, useEffect, useMemo, useRef } from "react";
import { landingPreviewSource } from "../domain/landing-asset-urls";
import { recontextualizeLandingSource } from "../domain/landing-route-context";
import { BUILTIN_LANDING_MODULES } from "../domain/landing-module-catalog";
import { compileLandingDocument, compileLandingFromDocument, type InsertableInnerElementKind } from "../domain/landing-compiler";
import { landingInlineCommitted, landingWorkspace, type SelectedSubElementInfo } from "./landing-workspace";
import type { LandingRestaurant } from "./landing-requests";
import { type LandingDocumentCommands } from "./landing-document-commands";
import { type LandingCanvasPort } from "./landing-canvas-port";
import { getDragWindow } from "./LandingLayerTree";

export function useLandingCanvasBridge(restaurant: LandingRestaurant, commands: LandingDocumentCommands, port: LandingCanvasPort) {
  const { iframeRef, inlineEditingRef, pendingScrollBlockIdRef, pendingSubSelectorRef, selectedSubElementRef, selectedBlockIdRef, iframeScrollYRef, inlineEditSnapshotRef, setIsDraggingComponentOverCanvas, draggedComponentKindRef, draggedBuiltinKeyRef, draggedCustomIdRef, setDraggedComponentKind, setDraggedBuiltinKey, setDraggedCustomId, interactiveCanvasRef } = port;
  const { handleMoveSubElement, handleDuplicateSubElement, handleDeleteSubElement, handleUpdateBlockValue, handleSaveDraft, handleUndo, handleRedo, handleMoveBlock, handleDuplicateBlock, handleDeleteBlock, handleMoveLayer, handleUpdateSubElementText, handleInsertInnerElement, selectSubElementOnStudio, handleCreateContainerSection, handleAddBuiltinBlock, handleAddCustomBlock } = commands;
  const store = landingWorkspace.useStore();
  const { document: documentState, rawHtml, rawCss, rawJs } = landingWorkspace.useSelector((state) => state.snapshot);
  const selectedBlockId = landingWorkspace.useSelector((state) => state.selectedBlockId);
  const setMediaPickerTarget = landingWorkspace.useFieldSetter("mediaPickerTarget");
  const interactiveCanvas = landingWorkspace.useSelector((state) => state.interactiveCanvas);
  const customModules = landingWorkspace.useSelector((state) => state.customModules);
  const compiledVisual = useMemo(
    () => {
      const compiled = compileLandingFromDocument(
        documentState,
        {
          restaurantName: restaurant.name,
          restaurantSlug: restaurant.landingSlug,
          menuSlug: restaurant.slug,
        },
        {
          interactiveEditor: true,
        },
      );
      return {
        ...compiled,
        fullHtml: landingPreviewSource(compiled.fullHtml, restaurant.id, restaurant.landingSlug),
        htmlContent: landingPreviewSource(compiled.htmlContent, restaurant.id, restaurant.landingSlug),
        previewCss: landingPreviewSource(compiled.previewCss, restaurant.id, restaurant.landingSlug),
      };
    },
    [documentState, restaurant.id, restaurant.name, restaurant.slug, restaurant.landingSlug],
  );
  const previewSource = useMemo(() => {
    if (documentState.mode === "visual") return compiledVisual.fullHtml;
    const source = compileLandingDocument({
      htmlContent: rawHtml,
      cssContent: rawCss,
      jsContent: rawJs,
      title: restaurant.name,
    });
    const contextualized = recontextualizeLandingSource(source, { menuSlug: restaurant.slug, landingSlug: restaurant.landingSlug });
    return landingPreviewSource(contextualized, restaurant.id, restaurant.landingSlug);
  }, [
    documentState.mode,
    compiledVisual.fullHtml,
    rawHtml,
    rawCss,
    rawJs,
    restaurant.name,
    restaurant.id,
    restaurant.landingSlug,
    restaurant.slug,
  ]);
  const [debouncedSrcDoc, setDebouncedSrcDoc] = useState<string>(
    previewSource,
  );
  const prevModeRef = useRef<string>(documentState.mode);
  const prevJsContentRef = useRef<string>(compiledVisual.jsContent);

  useEffect(() => {
    if (documentState.mode === "visual") {
      const modeChanged = prevModeRef.current !== "visual";
      const jsChanged = prevJsContentRef.current !== compiledVisual.jsContent;
      prevModeRef.current = "visual";
      prevJsContentRef.current = compiledVisual.jsContent;
      if (modeChanged || jsChanged) {
        setDebouncedSrcDoc(compiledVisual.fullHtml);
      }
      return;
    }
    prevModeRef.current = "raw";
    const timer = setTimeout(() => {
      setDebouncedSrcDoc(previewSource);
    }, 200);
    return () => clearTimeout(timer);
  }, [
    documentState.mode,
    compiledVisual.jsContent,
    compiledVisual.fullHtml,
    previewSource,
  ]);

  useEffect(() => {
    if (documentState.mode !== "visual") return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    if (inlineEditingRef.current) {
      // User is actively editing text inline inside the canvas iframe!
      // Do NOT dispatch live DOM replacement to the iframe.
      return;
    }
    const scrollIntoViewBlockId = pendingScrollBlockIdRef.current;
    pendingScrollBlockIdRef.current = null;
    const explicitSubSelector = pendingSubSelectorRef.current;
    pendingSubSelectorRef.current = undefined;

    const currentSub =
      explicitSubSelector !== undefined
        ? explicitSubSelector
        : selectedSubElementRef.current?.blockId === selectedBlockIdRef.current
          ? selectedSubElementRef.current?.selector ?? null
          : null;

    win.postMessage(
      {
        type: "LANDING_LIVE_PATCH",
        htmlContent: compiledVisual.htmlContent,
        cssContent: compiledVisual.previewCss,
        selectedBlockId: selectedBlockIdRef.current,
        subSelector: currentSub,
        notifySubElement: explicitSubSelector !== undefined && Boolean(explicitSubSelector),
        previewMode: !interactiveCanvas,
        skipDomHtmlUpdate: false,
        scrollIntoViewBlockId,
      },
      "*",
    );
  }, [
    documentState.mode,
    compiledVisual.htmlContent,
    compiledVisual.previewCss,
    interactiveCanvas,
    iframeRef,
    inlineEditingRef,
    pendingScrollBlockIdRef,
    pendingSubSelectorRef,
    selectedBlockIdRef,
    selectedSubElementRef,
  ]);

  useEffect(() => {
    if (documentState.mode !== "visual") return;
    const currentSub =
      selectedSubElementRef.current?.blockId === selectedBlockId
        ? selectedSubElementRef.current?.selector ?? null
        : null;
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "LANDING_SET_SELECTED_BLOCK",
        blockId: selectedBlockId,
        subSelector: currentSub,
        scrollIntoView: false,
      },
      "*",
    );
  }, [documentState.mode, iframeRef, selectedBlockId, selectedSubElementRef]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "LANDING_SCROLL_SYNC" && typeof data.scrollY === "number") {
        iframeScrollYRef.current = data.scrollY;
      } else if (data.type === "LANDING_SELECT_BLOCK" && typeof data.blockId === "string") {
        store.dispatch(landingWorkspace.changed({ selectedBlockId: data.blockId, selectedSubElement: null, rightTab: "properties" }));
      } else if (
        data.type === "LANDING_SELECT_SUBELEMENT" &&
        typeof data.blockId === "string" &&
        data.subElement &&
        typeof data.subElement === "object"
      ) {
        const details = data.subElement as Omit<SelectedSubElementInfo, "blockId">;
        store.dispatch(landingWorkspace.changed({
          selectedBlockId: data.blockId,
          selectedSubElement: { ...details, blockId: data.blockId },
          rightTab: "properties",
        }));
      } else if (
        data.type === "LANDING_SUBELEMENT_ACTION" &&
        typeof data.blockId === "string" &&
        typeof data.selector === "string" &&
        typeof data.action === "string"
      ) {
        if (data.action === "move-prev") {
          handleMoveSubElement(data.blockId, data.selector, "prev");
        } else if (data.action === "move-next") {
          handleMoveSubElement(data.blockId, data.selector, "next");
        } else if (data.action === "duplicate") {
          handleDuplicateSubElement(data.blockId, data.selector);
        } else if (data.action === "delete") {
          handleDeleteSubElement(data.blockId, data.selector);
        } else if (data.action === "pick-image") {
          const curSub =
            selectedSubElementRef.current?.selector === data.selector
              ? selectedSubElementRef.current
              : null;
          setMediaPickerTarget({
            kind: "sub-img",
            blockId: data.blockId,
            selector: data.selector,
            boundSrcField: curSub ? curSub.boundSrcField : null,
            boundAltField: curSub ? curSub.boundAltField : null,
            currentUrl: curSub ? curSub.currentSrc : "",
            title: "Cambiar Imagen del Elemento",
          });
        }
      } else if (data.type === "LANDING_INLINE_EDIT_START") {
        inlineEditingRef.current = true;
      } else if (data.type === "LANDING_INLINE_EDIT_END") {
        inlineEditingRef.current = false;
      } else if (
        data.type === "LANDING_INLINE_FIELD_CHANGE" &&
        typeof data.blockId === "string" &&
        typeof data.fieldKey === "string" &&
        typeof data.value === "string"
      ) {
        inlineEditingRef.current = true;
        handleUpdateBlockValue(data.blockId, data.fieldKey, data.value, true);
      } else if (data.type === "LANDING_INLINE_FIELD_COMMIT") {
        inlineEditingRef.current = false;
        if (inlineEditSnapshotRef.current) {
          const snapshot = inlineEditSnapshotRef.current;
          inlineEditSnapshotRef.current = null;
          store.dispatch(landingInlineCommitted(snapshot));
        }
      } else if (data.type === "LANDING_SHORTCUT" && typeof data.action === "string") {
        if (data.action === "save") {
          handleSaveDraft();
        } else if (data.action === "undo") {
          handleUndo();
        } else if (data.action === "redo") {
          handleRedo();
        }
      } else if (
        data.type === "LANDING_BLOCK_ACTION" &&
        typeof data.blockId === "string" &&
        typeof data.action === "string"
      ) {
        const targetBlock = documentState.blocks.find((b) => b.id === data.blockId);
        if (!targetBlock) return;
        if (data.action === "move-up") {
          handleMoveBlock(data.blockId, "up");
        } else if (data.action === "move-down") {
          handleMoveBlock(data.blockId, "down");
        } else if (data.action === "duplicate") {
          handleDuplicateBlock(targetBlock);
        } else if (data.action === "code") {
          store.dispatch(landingWorkspace.changed({ selectedBlockId: data.blockId, codeDrawerMode: "block", codeTab: "html" }));
        } else if (data.action === "delete") {
          handleDeleteBlock(data.blockId);
        }
      } else if (data.type === "LANDING_CANVAS_MOVE") {
        if (data.sourceItem && data.target) {
          handleMoveLayer(data.sourceItem, data.target, data.position || "inside");
        }
      } else if (data.type === "LANDING_SUBELEMENT_TEXT_UPDATE") {
        if (data.blockId && data.selector && typeof data.text === "string") {
          handleUpdateSubElementText(data.blockId, data.selector, data.text);
        }
      } else if (data.type === "LANDING_CANVAS_DROP") {
        setIsDraggingComponentOverCanvas(false);
        const dragWin = getDragWindow();
        const compKind = (data.componentKind ||
          draggedComponentKindRef.current ||
          dragWin?.__draggedComponentKind) as InsertableInnerElementKind | null;
        const bKey = (data.builtinKey ||
          draggedBuiltinKeyRef.current ||
          dragWin?.__draggedBuiltinKey) as string | null;
        const cId = (data.customId ||
          draggedCustomIdRef.current ||
          dragWin?.__draggedCustomId) as string | null;

        if (compKind) {
          if (data.blockId) {
            const newSel = handleInsertInnerElement(
              data.blockId,
              data.subSelector ?? null,
              compKind,
              data.position || "inside",
            );
            selectSubElementOnStudio(data.blockId, newSel || (data.subSelector ?? null));
          } else if (selectedBlockIdRef.current) {
            const newSel = handleInsertInnerElement(
              selectedBlockIdRef.current,
              null,
              compKind,
              data.position || "inside",
            );
            selectSubElementOnStudio(selectedBlockIdRef.current, newSel);
          } else {
            handleCreateContainerSection(compKind);
          }
          setDraggedComponentKind(null);
          if (dragWin) {
            dragWin.__draggedComponentKind = null;
          }
        } else if (bKey) {
          const found = BUILTIN_LANDING_MODULES.find(
            (m) => m.moduleKey === bKey,
          );
          if (found) {
            handleAddBuiltinBlock(
              found,
              data.blockId || null,
              data.position === "before" ? "before" : "after",
            );
          }
          setDraggedBuiltinKey(null);
          if (dragWin) {
            dragWin.__draggedBuiltinKey = null;
          }
        } else if (cId) {
          const found = customModules.find((m) => m.id === cId);
          if (found) {
            handleAddCustomBlock(
              found,
              data.blockId || null,
              data.position === "before" ? "before" : "after",
            );
          }
          setDraggedCustomId(null);
          if (dragWin) {
            dragWin.__draggedCustomId = null;
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    store,
    iframeRef,
    iframeScrollYRef,
    inlineEditSnapshotRef,
    inlineEditingRef,
    selectedBlockIdRef,
    selectedSubElementRef,
    draggedBuiltinKeyRef,
    draggedComponentKindRef,
    draggedCustomIdRef,
    setMediaPickerTarget,
    setDraggedBuiltinKey,
    setDraggedComponentKind,
    setDraggedCustomId,
    setIsDraggingComponentOverCanvas,
    customModules,
    documentState.blocks,
    handleAddBuiltinBlock,
    handleAddCustomBlock,
    handleCreateContainerSection,
    handleDeleteBlock,
    handleDeleteSubElement,
    handleDuplicateBlock,
    handleDuplicateSubElement,
    handleInsertInnerElement,
    handleMoveBlock,
    handleMoveLayer,
    handleMoveSubElement,
    handleRedo,
    handleSaveDraft,
    handleUndo,
    handleUpdateBlockValue,
    handleUpdateSubElementText,
    selectSubElementOnStudio,
  ]);

  const onLoad = () => {
    const shouldScroll = Boolean(pendingScrollBlockIdRef.current);
    pendingScrollBlockIdRef.current = null;
    iframeRef.current?.contentWindow?.postMessage({
      type: "LANDING_SYNC_STATE",
      blockId: selectedBlockIdRef.current,
      scrollY: iframeScrollYRef.current,
      previewMode: !interactiveCanvasRef.current,
      scrollIntoView: shouldScroll,
    }, "*");
  };
  return { iframeRef, debouncedSrcDoc, onLoad };
}
