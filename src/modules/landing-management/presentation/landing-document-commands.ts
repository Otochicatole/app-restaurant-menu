import type { DraggedLayerItem } from "./LandingLayerTree";
import { type LandingBlock, type LandingCustomModuleView, type LandingDocumentV1, type LandingTheme, type SubElementStyleOverride } from "../contracts";
import { createBlockFromBuiltinModule, createBlockFromCustomModule, type BuiltinLandingModuleDefinition } from "../domain/landing-module-catalog";
import { createBlankContainerBlock, deleteSubElementInBlock, duplicateSubElementInBlock, insertInnerElementInBlockWithSelector, moveBlockIntoBlock, moveSubElementBetweenBlocks, moveSubElementInBlock, parseSubElementStyles, reparentSubElementInBlock, serializeSubElementStyles, syncFieldsWithHtmlTemplate, updateSubElementAttributeInBlock, updateSubElementTextInBlock, type InsertableInnerElementKind } from "../domain/landing-compiler";
import { landingEdited, landingRedone, landingUndone, landingWorkspace, type LandingSnapshot } from "./landing-workspace";
import { type SetStateAction } from "react";
import { type LandingRestaurant, writeLanding, resetLanding } from "./landing-requests";
import { type LandingCanvasPort } from "./landing-canvas-port";

type LandingStore = ReturnType<typeof landingWorkspace.makeStore>;
type LandingState = ReturnType<LandingStore["getState"]>;
type DocumentPort = Pick<LandingCanvasPort, "iframeRef" | "inlineEditingRef" | "inlineEditSnapshotRef" | "pendingScrollBlockIdRef" | "pendingSubSelectorRef" | "selectedBlockIdRef">;

export function createLandingDocumentCommands(store: LandingStore, restaurant: LandingRestaurant, port: DocumentPort) {
  const { iframeRef, inlineEditingRef, inlineEditSnapshotRef, pendingScrollBlockIdRef, pendingSubSelectorRef, selectedBlockIdRef } = port;
  const set = <Key extends keyof LandingState>(key: Key, next: SetStateAction<LandingState[Key]>) => {
    const patch: Partial<LandingState> = {};
    patch[key] = typeof next === "function" ? (next as (previous: LandingState[Key]) => LandingState[Key])(store.getState()[key]) : next;
    store.dispatch(landingWorkspace.changed(patch));
  };
  const setSelectedBlockId = (id: LandingState["selectedBlockId"]) => set("selectedBlockId", id);
  const setSelectedSubElement = (value: SetStateAction<LandingState["selectedSubElement"]>) => set("selectedSubElement", value);
  const setRightTab = (tab: LandingState["rightTab"]) => set("rightTab", tab);
  const setExpandedBlockIds = (value: SetStateAction<LandingState["expandedBlockIds"]>) => set("expandedBlockIds", value);
  const setExpandedSubLayerIds = (value: SetStateAction<LandingState["expandedSubLayerIds"]>) => set("expandedSubLayerIds", value);
  const setFeedback = (value: LandingState["feedback"]) => set("feedback", value);

  const commitSnapshot = (snapshot: LandingSnapshot, recordHistory = true, resetSelection = false) => {
    store.dispatch(landingEdited({ snapshot, recordHistory, resetSelection }));
  };
  const updateDocument = (updater: LandingDocumentV1 | ((previous: LandingDocumentV1) => LandingDocumentV1), recordHistory = true) => {
    const snapshot = store.getState().snapshot;
    const document = typeof updater === "function" ? updater(snapshot.document) : updater;
    commitSnapshot({ ...snapshot, document }, recordHistory);
  };
  const handleUndo = () => store.dispatch(landingUndone());
  const handleRedo = () => store.dispatch(landingRedone());
  const handleSaveDraft = () => { void store.dispatch(writeLanding(restaurant, false)); };
  const handlePublish = () => { void store.dispatch(writeLanding(restaurant, true)); };
  const handleResetDefault = () => {
    if (window.confirm("¿Restaurar la landing inicial? Se perderán los cambios no guardados.")) store.dispatch(resetLanding(restaurant));
  };

  const handleHoverSubElement = (blockId: string | null, subSelector: string | null) => {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: "LANDING_HOVER_SUBELEMENT",
          blockId,
          subSelector,
        },
        "*",
      );
    };

  const handlePreviewScrollToAnchor = (anchorHref: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "LANDING_SCROLL_TO_ANCHOR",
        anchor: anchorHref,
      },
      "*",
    );
  };

  const selectBlockOnStudio = (blockId: string | null, scrollIntoView = false) => {
      setSelectedBlockId(blockId);
      setSelectedSubElement(null);
      if (blockId) {
        setRightTab("properties");
        setExpandedBlockIds((prev) => ({ ...prev, [blockId]: true }));
      }
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "LANDING_SET_SELECTED_BLOCK",
            blockId,
            subSelector: null,
            scrollIntoView,
          },
          "*",
        );
      }
    };

  const selectSubElementOnStudio = (blockId: string, subSelector: string | null) => {
      setSelectedBlockId(blockId);
      setRightTab("properties");
      setExpandedBlockIds((prev) => ({ ...prev, [blockId]: true }));
      if (!subSelector) {
        setSelectedSubElement(null);
      }
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "LANDING_SET_SELECTED_BLOCK",
            blockId,
            subSelector,
            notifySubElement: Boolean(subSelector),
            scrollIntoView: false,
          },
          "*",
        );
      }
    };

  const insertBlockAt = (
      created: LandingBlock,
      targetBlockId?: string | null,
      position: "before" | "after" = "after",
    ) => {
      pendingScrollBlockIdRef.current = created.id;
      updateDocument((prev) => {
        const nextBlocks = [...prev.blocks];
        if (targetBlockId) {
          const targetIdx = nextBlocks.findIndex((b) => b.id === targetBlockId);
          if (targetIdx !== -1) {
            const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
            nextBlocks.splice(insertIdx, 0, created);
            return {
              ...prev,
              mode: "visual",
              blocks: nextBlocks,
            };
          }
        }

        const currentIdx = selectedBlockIdRef.current
          ? nextBlocks.findIndex((b) => b.id === selectedBlockIdRef.current)
          : -1;
        if (
          currentIdx !== -1 &&
          nextBlocks[currentIdx]?.moduleKey !== "footer"
        ) {
          nextBlocks.splice(currentIdx + 1, 0, created);
        } else if (
          created.moduleKey !== "footer" &&
          nextBlocks.length > 0 &&
          nextBlocks[nextBlocks.length - 1]?.moduleKey === "footer"
        ) {
          nextBlocks.splice(nextBlocks.length - 1, 0, created);
        } else {
          nextBlocks.push(created);
        }
        return {
          ...prev,
          mode: "visual",
          blocks: nextBlocks,
        };
      });
      setSelectedBlockId(created.id);
      setSelectedSubElement(null);
      setRightTab("properties");
    };

  const insertBlockSmartly = (created: LandingBlock) => {
      insertBlockAt(created, null, "after");
    };

  const handleAddBuiltinBlock = (
      definition: BuiltinLandingModuleDefinition,
      targetBlockId?: string | null,
      position?: "before" | "after",
    ) => {
      const safeName = restaurant.name.trim() || "Nuestro Restaurante";
      const menuUrl = `/m/${restaurant.slug}`;
      const created = createBlockFromBuiltinModule(definition);
      for (const [k, v] of Object.entries(created.values)) {
        created.values[k] = v
          .replace(/\{\{\s*restaurantName\s*\}\}/g, safeName)
          .replace(/\{\{\s*menuUrl\s*\}\}/g, menuUrl);
      }
      insertBlockAt(created, targetBlockId, position);
      setFeedback({
        type: "success",
        message: `Módulo "${definition.name}" agregado a tu página.`,
      });
    };

  const handleAddCustomBlock = (
      customModule: LandingCustomModuleView,
      targetBlockId?: string | null,
      position?: "before" | "after",
    ) => {
      const created = createBlockFromCustomModule(customModule);
      insertBlockAt(created, targetBlockId, position);
      setFeedback({
        type: "success",
        message: `Módulo "${customModule.name}" agregado a tu página.`,
      });
    };

  const handleCreateContainerSection = (kind?: InsertableInnerElementKind) => {
      const created = createBlankContainerBlock(kind);
      insertBlockSmartly(created);
      setFeedback({
        type: "success",
        message:
          "Sección creada con tu componente.",
      });
    };

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
      pendingScrollBlockIdRef.current = blockId;
      updateDocument((prev) => {
        const index = prev.blocks.findIndex((b) => b.id === blockId);
        if (index === -1) return prev;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= prev.blocks.length) return prev;
        const nextBlocks = [...prev.blocks];
        const [moved] = nextBlocks.splice(index, 1);
        if (!moved) return prev;
        nextBlocks.splice(targetIndex, 0, moved);
        return { ...prev, blocks: nextBlocks };
      });
    };

  const handleReorderBlocks = (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      updateDocument((prev) => {
        const nextBlocks = [...prev.blocks];
        const [moved] = nextBlocks.splice(fromIndex, 1);
        if (!moved) return prev;
        nextBlocks.splice(toIndex, 0, moved);
        return { ...prev, blocks: nextBlocks };
      });
    };

  const handleToggleBlockVisibility = (blockId: string) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId ? { ...b, visible: !b.visible } : b,
        ),
      }));
    };

  const handleDuplicateBlock = (block: LandingBlock) => {
      const copyId = `${block.id}-copy-${Math.random().toString(36).slice(2, 6)}`;
      const cloned: LandingBlock = {
        ...block,
        id: copyId,
        name: `${block.name} (Copia)`,
        fields: block.fields.map((f) => ({ ...f })),
        values: { ...block.values },
      };
      pendingScrollBlockIdRef.current = copyId;
      updateDocument((prev) => {
        const index = prev.blocks.findIndex((b) => b.id === block.id);
        const nextBlocks = [...prev.blocks];
        nextBlocks.splice(index + 1, 0, cloned);
        return { ...prev, blocks: nextBlocks };
      });
      setSelectedBlockId(copyId);
      setSelectedSubElement(null);
    };

  const handleDeleteBlock = (blockId: string) => {
      const { selectedBlockId } = store.getState();
      updateDocument((prev) => {
        const nextBlocks = prev.blocks.filter((b) => b.id !== blockId);
        if (selectedBlockId === blockId) {
          setSelectedBlockId(nextBlocks[0]?.id ?? null);
          setSelectedSubElement(null);
        }
        return { ...prev, blocks: nextBlocks };
      });
    };

  const handleUpdateBlockValue = (blockId: string, key: string, value: string, fromInlineCanvas = false) => {
      if (fromInlineCanvas) {
        if (!inlineEditSnapshotRef.current) {
          inlineEditSnapshotRef.current = store.getState().snapshot;
        }
        inlineEditingRef.current = true;
      }
      updateDocument(
        (prev) => ({
          ...prev,
          blocks: prev.blocks.map((b) =>
            b.id === blockId
              ? { ...b, values: { ...b.values, [key]: value } }
              : b,
          ),
        }),
        !fromInlineCanvas,
      );
    };

  const handleUpdateBlockValues = (blockId: string, patch: Record<string, string>) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId
            ? { ...b, values: { ...b.values, ...patch } }
            : b,
        ),
      }));
    };

  const handleUpdateBlockName = (blockId: string, name: string) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId ? { ...b, name } : b,
        ),
      }));
    };

  const handleUpdateBlockCode = (
      blockId: string,
      patch: Partial<
        Pick<LandingBlock, "htmlTemplate" | "cssTemplate" | "jsTemplate">
      >,
    ) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const nextHtml = patch.htmlTemplate ?? b.htmlTemplate;
          const synced =
            patch.htmlTemplate !== undefined
              ? syncFieldsWithHtmlTemplate(b.fields, b.values, nextHtml)
              : { fields: b.fields, values: b.values };

          return {
            ...b,
            ...patch,
            fields: synced.fields,
            values: synced.values,
          };
        }),
      }));
    };

  const handleUpdateSubElementStyle = (
      blockId: string,
      selector: string,
      patch: Partial<SubElementStyleOverride>,
    ) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const map = parseSubElementStyles(b.values.__subStyles);
          const current = map[selector] ?? {};
          const nextStyle: SubElementStyleOverride = { ...current, ...patch };
          for (const [k, v] of Object.entries(nextStyle)) {
            if (!v || !v.trim()) {
              delete nextStyle[k as keyof SubElementStyleOverride];
            }
          }
          if (Object.keys(nextStyle).length > 0) {
            map[selector] = nextStyle;
          } else {
            delete map[selector];
          }
          return {
            ...b,
            values: {
              ...b.values,
              __subStyles: serializeSubElementStyles(map),
            },
          };
        }),
      }));
    };

  const handleResetSubElementStyles = (blockId: string, selector: string) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const map = parseSubElementStyles(b.values.__subStyles);
          delete map[selector];
          return {
            ...b,
            values: {
              ...b.values,
              __subStyles: serializeSubElementStyles(map),
            },
          };
        }),
      }));
    };

  const handleDuplicateSubElement = (blockId: string, selector: string) => {
      let nextSel: string | null = null;
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const res = duplicateSubElementInBlock(b, selector);
          if (!res) return b;
          nextSel = res.newSelector;
          return res.block;
        }),
      }));
      if (nextSel) {
        pendingSubSelectorRef.current = nextSel;
        setFeedback({
          type: "success",
          message: "Elemento duplicado con variables independientes.",
        });
      }
    };

  const handleMoveSubElement = (blockId: string, selector: string, direction: "prev" | "next") => {
      let nextSel: string | null = null;
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const res = moveSubElementInBlock(b, selector, direction);
          if (!res) return b;
          nextSel = res.newSelector;
          return res.block;
        }),
      }));
      if (nextSel) {
        pendingSubSelectorRef.current = nextSel;
      }
    };

  const handleMoveLayer = (
      sourceItem: DraggedLayerItem,
      target: { blockId: string; selector?: string | null },
      position: "inside" | "before" | "after" = "inside",
    ) => {
      const documentState = store.getState().snapshot.document;
      if (sourceItem.type === "sublayer") {
        if (sourceItem.blockId === target.blockId && target.selector) {
          let nextSel: string | null = null;
          updateDocument((prev) => ({
            ...prev,
            blocks: prev.blocks.map((b) => {
              if (b.id !== sourceItem.blockId) return b;
              const res = reparentSubElementInBlock(
                b,
                sourceItem.selector,
                target.selector!,
                position,
              );
              if (res) {
                nextSel = res.newSelector;
                return res.block;
              }
              return b;
            }),
          }));

          if (nextSel) {
            selectSubElementOnStudio(target.blockId, nextSel);
            setExpandedSubLayerIds((prev) => ({
              ...prev,
              [`${target.blockId}:${target.selector}`]: true,
            }));
            setFeedback({
              type: "success",
              message: `Capa "${sourceItem.label}" movida con éxito.`,
            });
          }
          return;
        }

        // Cross-block sublayer move (or target.selector is null: drop on block)
        let nextSel: string | null = null;
        updateDocument((prev) => {
          const sourceBlock = prev.blocks.find(
            (b) => b.id === sourceItem.blockId,
          );
          const targetBlock = prev.blocks.find(
            (b) => b.id === target.blockId,
          );
          if (!sourceBlock || !targetBlock) return prev;

          const res = moveSubElementBetweenBlocks(
            sourceBlock,
            sourceItem.selector,
            targetBlock,
            target.selector ?? null,
            position,
          );
          if (!res) return prev;

          nextSel = res.newSelector;
          return {
            ...prev,
            blocks: prev.blocks.map((b) => {
              if (b.id === res.sourceBlock.id) return res.sourceBlock;
              if (b.id === res.targetBlock.id) return res.targetBlock;
              return b;
            }),
          };
        });

        if (nextSel) {
          selectSubElementOnStudio(target.blockId, nextSel);
          setExpandedBlockIds((prev) => ({ ...prev, [target.blockId]: true }));
          setFeedback({
            type: "success",
            message: `Capa "${sourceItem.label}" movida a la sección destino.`,
          });
        }
        return;
      }

      if (sourceItem.type === "block") {
        if (
          position === "inside" &&
          sourceItem.blockId !== target.blockId &&
          target.selector
        ) {
          let nextSel: string | null = null;
          updateDocument((prev) => {
            const sourceBlock = prev.blocks.find(
              (b) => b.id === sourceItem.blockId,
            );
            const targetBlock = prev.blocks.find(
              (b) => b.id === target.blockId,
            );
            if (!sourceBlock || !targetBlock) return prev;

            const res = moveBlockIntoBlock(
              sourceBlock,
              targetBlock,
              target.selector,
            );
            if (!res) return prev;
            nextSel = res.newSelector;

            return {
              ...prev,
              blocks: prev.blocks
                .filter((b) => b.id !== sourceItem.blockId)
                .map((b) => (b.id === res.targetBlock.id ? res.targetBlock : b)),
            };
          });

          if (nextSel) {
            selectSubElementOnStudio(target.blockId, nextSel);
            setExpandedBlockIds((prev) => ({ ...prev, [target.blockId]: true }));
            setFeedback({
              type: "success",
              message: `Sección "${sourceItem.label}" anidada como capa dentro del bloque.`,
            });
          }
        } else {
          const sourceIdx =
            "blockIndex" in sourceItem && sourceItem.blockIndex !== undefined
              ? sourceItem.blockIndex
              : documentState.blocks.findIndex((b) => b.id === sourceItem.blockId);
          const targetIdx = documentState.blocks.findIndex(
            (b) => b.id === target.blockId,
          );
          if (sourceIdx >= 0 && targetIdx >= 0 && sourceIdx !== targetIdx) {
            let toIndex = targetIdx;
            if (sourceIdx < targetIdx) {
              toIndex = position === "before" ? targetIdx - 1 : targetIdx;
            } else {
              toIndex = position === "before" ? targetIdx : targetIdx + 1;
            }
            toIndex = Math.max(0, Math.min(documentState.blocks.length - 1, toIndex));
            pendingScrollBlockIdRef.current = sourceItem.blockId;
            handleReorderBlocks(sourceIdx, toIndex);
            setFeedback({
              type: "success",
              message: `Módulo "${sourceItem.label || "Bloque"}" reordenado con éxito.`,
            });
          }
        }
      }
    };

  const handleDeleteSubElement = (blockId: string, selector: string) => {
      pendingSubSelectorRef.current = null;
      setSelectedSubElement(null);
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return deleteSubElementInBlock(b, selector) ?? b;
        }),
      }));
    };

  const handleInsertInnerElement = (
      blockId: string,
      targetSelector: string | null,
      kind: InsertableInnerElementKind,
      position: "inside" | "before" | "after" = "inside",
    ): string | null => {
      let insertedSelector: string | null = null;
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          const result = insertInnerElementInBlockWithSelector(
            b,
            targetSelector,
            kind,
            position,
          );
          insertedSelector = result.newSelector;
          return result.block;
        }),
      }));
      setFeedback({
        type: "success",
        message: "Nuevo elemento agregado al bloque.",
      });
      return insertedSelector;
    };

  const handleUpdateSubElementText = (blockId: string, selector: string, text: string) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return updateSubElementTextInBlock(b, selector, text);
        }),
      }));
    };

  const handleUpdateSubElementAttribute = (
      blockId: string,
      selector: string,
      attrName: "src" | "href" | "alt",
      value: string,
    ) => {
      updateDocument((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b;
          return updateSubElementAttributeInBlock(b, selector, attrName, value);
        }),
      }));
      setSelectedSubElement((prev) => {
        if (!prev || prev.blockId !== blockId || prev.selector !== selector) {
          return prev;
        }
        return {
          ...prev,
          ...(attrName === "src" ? { currentSrc: value } : {}),
          ...(attrName === "href" ? { currentHref: value } : {}),
          ...(attrName === "alt" ? { currentAlt: value } : {}),
        };
      });
    };

  const handleUpdateTheme = (patch: Partial<LandingTheme>) => {
      updateDocument((prev) => ({
        ...prev,
        theme: { ...prev.theme, ...patch },
      }));
    };

  return { handlePreviewScrollToAnchor, selectBlockOnStudio, selectSubElementOnStudio, handleAddBuiltinBlock, handleAddCustomBlock, handleCreateContainerSection, handleMoveBlock, handleReorderBlocks, handleToggleBlockVisibility, handleDuplicateBlock, handleDeleteBlock, handleUpdateBlockValue, handleUpdateBlockValues, handleUpdateBlockName, handleUpdateBlockCode, handleUpdateSubElementStyle, handleResetSubElementStyles, handleDuplicateSubElement, handleMoveSubElement, handleMoveLayer, handleDeleteSubElement, handleInsertInnerElement, handleUpdateSubElementText, handleUpdateSubElementAttribute, handleUpdateTheme, handleHoverSubElement, commitSnapshot, updateDocument, handleUndo, handleRedo, handleSaveDraft, handlePublish, handleResetDefault };
}

export type LandingDocumentCommands = ReturnType<typeof createLandingDocumentCommands>;
