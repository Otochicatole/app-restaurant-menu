import type { DraggedLayerItem } from "./LandingLayerTree";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Eye, EyeOff, RotateCcw, Sparkles, Layers, Plus, Trash2, Copy, ChevronDown, ChevronRight, ChevronLeft, ChevronsUpDown, FoldVertical, BookmarkPlus, Wrench, Search, Box, X, GripVertical } from "lucide-react";
import { type LandingBlock } from "../contracts";
import { BUILTIN_LANDING_MODULES } from "../domain/landing-module-catalog";
import { buildBlockSubLayerTree, type LandingSubLayerNode } from "../domain/landing-compiler";
import { landingWorkspace } from "./landing-workspace";
import { type LandingRestaurant, removeLandingModule } from "./landing-requests";
import { type LandingDocumentCommands } from "./landing-document-commands";
import { type LandingCanvasPort } from "./landing-canvas-port";
import { type ModuleCategory, getModuleCategory, MODULE_CATEGORY_META, MODULE_GROUPS, getModuleIcon, ATOMIC_COMPONENTS_CATALOG } from "./landing-studio-catalog";
import { SubLayerTreeRow, getDragWindow } from "./LandingLayerTree";

export function LandingLayersPanel({ restaurant, commands, port }: { restaurant: LandingRestaurant; commands: LandingDocumentCommands; port: LandingCanvasPort }) {
  const { draggedComponentKind, setDraggedComponentKind, draggedBuiltinKey, setDraggedBuiltinKey, draggedCustomId, setDraggedCustomId, draggedComponentKindRef, draggedBuiltinKeyRef, draggedCustomIdRef, setIsDraggingComponentOverCanvas } = port;
  const { handleInsertInnerElement, handleMoveLayer, handleAddBuiltinBlock, handleAddCustomBlock, handleReorderBlocks, selectBlockOnStudio, selectSubElementOnStudio, handleToggleBlockVisibility, handleDuplicateBlock, handleDeleteBlock, handleHoverSubElement, handleDuplicateSubElement, handleDeleteSubElement, handleCreateContainerSection, handleResetDefault } = commands;
  const store = landingWorkspace.useStore();
  const documentState = landingWorkspace.useSelector((state) => state.snapshot.document);
  const selectedBlockId = landingWorkspace.useSelector((state) => state.selectedBlockId);
  const selectedSubElement = landingWorkspace.useSelector((state) => state.selectedSubElement);
  const [leftTab, setLeftTab] = landingWorkspace.useField("leftTab");
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = landingWorkspace.useField("isLeftSidebarOpen");
  const [componentSearch, setComponentSearch] = useState("");
  const [draggedLayerIndex, setDraggedLayerIndex] = useState<number | null>(null);
  const [draggedLayerItem, setDraggedLayerItem] = useState<DraggedLayerItem | null>(null);
  const [blockDropTarget, setBlockDropTarget] = useState<{
    blockId: string;
    position: "inside" | "before" | "after";
  } | null>(null);
  const autoExpandBlockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedComponentCategory, setSelectedComponentCategory] = useState<
    "all" | "layout" | "text" | "action" | "media"
  >("all");
  const [selectedModuleCategory, setSelectedModuleCategory] =
    useState<string>("all");
  const [expandedBlockIds, setExpandedBlockIds] = landingWorkspace.useField("expandedBlockIds");
  const [expandedSubLayerIds, setExpandedSubLayerIds] = landingWorkspace.useField("expandedSubLayerIds");
  const [layerSearchQuery, setLayerSearchQuery] = useState("");
  const toggleBlockExpanded = useCallback(
    (blockId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setExpandedBlockIds((prev) => ({
        ...prev,
        [blockId]: !prev[blockId],
      }));
    },
    [setExpandedBlockIds],
  );
  const toggleSubLayerExpanded = useCallback(
    (nodeId: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setExpandedSubLayerIds((prev) => ({
        ...prev,
        [nodeId]: !prev[nodeId],
      }));
    },
    [setExpandedSubLayerIds],
  );
  const customModules = landingWorkspace.useSelector((state) => state.customModules);
  const setFeedback = landingWorkspace.useFieldSetter("feedback");
  const selectedBlock = useMemo(
    () => documentState.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [documentState.blocks, selectedBlockId],
  );
  const activeSubElement = useMemo(
    () =>
      selectedBlock &&
      selectedSubElement &&
      selectedSubElement.blockId === selectedBlock.id
        ? selectedSubElement
        : null,
    [selectedBlock, selectedSubElement],
  );
  const blockSubLayerTrees = useMemo(() => {
    const map = new Map<string, LandingSubLayerNode[]>();
    for (const block of documentState.blocks) {
      map.set(block.id, buildBlockSubLayerTree(block));
    }
    return map;
  }, [documentState.blocks]);
  const handleExpandAllLayers = useCallback(() => {
    const nextBlocks: Record<string, boolean> = {};
    for (const b of documentState.blocks) {
      nextBlocks[b.id] = true;
    }
    const nextSubLayers: Record<string, boolean> = {};
    const collectSubIds = (nodes: LandingSubLayerNode[]) => {
      for (const n of nodes) {
        nextSubLayers[n.id] = true;
        if (n.children && n.children.length > 0) {
          collectSubIds(n.children);
        }
      }
    };
    blockSubLayerTrees.forEach((tree) => collectSubIds(tree));
    setExpandedBlockIds(nextBlocks);
    setExpandedSubLayerIds(nextSubLayers);
  }, [documentState.blocks, blockSubLayerTrees, setExpandedBlockIds, setExpandedSubLayerIds]);
  const handleCollapseAllLayers = useCallback(() => {
    setExpandedBlockIds({});
    setExpandedSubLayerIds({});
  }, [setExpandedBlockIds, setExpandedSubLayerIds]);
  const { matchingNodeIds, ancestorNodeIds, matchingBlockIds } = useMemo(() => {
    const q = layerSearchQuery.trim().toLowerCase();
    const matchNodes = new Set<string>();
    const ancNodes = new Set<string>();
    const matchBlocks = new Set<string>();

    if (!q) {
      return {
        matchingNodeIds: matchNodes,
        ancestorNodeIds: ancNodes,
        matchingBlockIds: matchBlocks,
      };
    }

    const checkNode = (
      node: LandingSubLayerNode,
      block: LandingBlock,
    ): boolean => {
      let selfMatch = false;
      if (node.label.toLowerCase().includes(q)) selfMatch = true;
      if (node.tag.toLowerCase().includes(q)) selfMatch = true;
      if (node.selector.toLowerCase().includes(q)) selfMatch = true;
      for (const key of node.childFieldKeys) {
        const val = block.values[key];
        if (typeof val === "string" && val.toLowerCase().includes(q)) {
          selfMatch = true;
          break;
        }
      }

      let childMatch = false;
      if (node.children) {
        for (const child of node.children) {
          if (checkNode(child, block)) {
            childMatch = true;
          }
        }
      }

      if (selfMatch) {
        matchNodes.add(node.id);
      }
      if (selfMatch || childMatch) {
        ancNodes.add(node.id);
        return true;
      }
      return false;
    };

    for (const block of documentState.blocks) {
      const blockNameMatch = block.name.toLowerCase().includes(q);
      const blockKeyMatch = block.moduleKey.toLowerCase().includes(q);
      const tree = blockSubLayerTrees.get(block.id) || [];
      let subLayerMatch = false;
      for (const rootNode of tree) {
        if (checkNode(rootNode, block)) {
          subLayerMatch = true;
        }
      }
      if (blockNameMatch || blockKeyMatch || subLayerMatch) {
        matchBlocks.add(block.id);
      }
    }

    return {
      matchingNodeIds: matchNodes,
      ancestorNodeIds: ancNodes,
      matchingBlockIds: matchBlocks,
    };
  }, [layerSearchQuery, documentState.blocks, blockSubLayerTrees]);
  const filteredBuiltinModules = useMemo(() => {
    const q = componentSearch.trim().toLowerCase();
    return BUILTIN_LANDING_MODULES.filter((m) => {
      const cat = getModuleCategory(m.moduleKey);
      const matchesCategory =
        selectedModuleCategory === "all" || selectedModuleCategory === cat;
      if (!matchesCategory) return false;
      if (!q) return true;
      const meta = MODULE_CATEGORY_META[cat];
      return (
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q) ||
        (meta && meta.label.toLowerCase().includes(q)) ||
        (meta && meta.fullLabel.toLowerCase().includes(q))
      );
    });
  }, [componentSearch, selectedModuleCategory]);
  const filteredCustomModules = useMemo(() => {
    if (
      selectedModuleCategory !== "all" &&
      selectedModuleCategory !== "custom"
    ) {
      return [];
    }
    const q = componentSearch.trim().toLowerCase();
    if (!q) return customModules;
    return customModules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q),
    );
  }, [customModules, componentSearch, selectedModuleCategory]);
  const moduleCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: BUILTIN_LANDING_MODULES.length,
      reservas: 0,
      estructura: 0,
      menu: 0,
      contenido: 0,
      contacto: 0,
      codigo: 0,
    };
    for (const m of BUILTIN_LANDING_MODULES) {
      const cat = getModuleCategory(m.moduleKey);
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, []);
  const moduleChips = useMemo(() => {
    const chips: { id: string; label: string; count: number }[] = [
      { id: "all", label: "Todos", count: moduleCategoryCounts.all },
      { id: "reservas", label: "Reservas", count: moduleCategoryCounts.reservas },
      { id: "estructura", label: "Estructura", count: moduleCategoryCounts.estructura },
      { id: "menu", label: "Menú", count: moduleCategoryCounts.menu },
      { id: "contenido", label: "Contenido", count: moduleCategoryCounts.contenido },
      { id: "contacto", label: "Contacto", count: moduleCategoryCounts.contacto },
      { id: "codigo", label: "Código", count: moduleCategoryCounts.codigo },
    ];
    if (customModules.length > 0) {
      chips.push({
        id: "custom",
        label: "Guardados",
        count: customModules.length,
      });
    }
    return chips;
  }, [moduleCategoryCounts, customModules.length]);
  const filteredAtomicComponents = useMemo(() => {
    const q = componentSearch.trim().toLowerCase();
    return ATOMIC_COMPONENTS_CATALOG.filter((item) => {
      const matchesCategory =
        selectedComponentCategory === "all" ||
        item.category === selectedComponentCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.kind.toLowerCase().includes(q)
      );
    });
  }, [componentSearch, selectedComponentCategory]);
  const handleDeleteCustomModule = (id: string) => { void store.dispatch(removeLandingModule(restaurant.id, id)); };
  useEffect(() => () => { if (autoExpandBlockTimerRef.current) clearTimeout(autoExpandBlockTimerRef.current); }, []);
  return (
    <div className="relative flex shrink-0">
          <aside
            className={`bg-white border-r border-zinc-200 flex flex-col shrink-0 min-h-0 transition-[width,opacity] duration-200 ease-in-out overflow-hidden ${
              isLeftSidebarOpen
                ? "w-96 opacity-100"
                : "w-0 border-r-0 opacity-0"
            }`}
          >
            <div className="w-96 h-full flex flex-col shrink-0 min-h-0">
          {/* Segmented Toggle: Capas | Módulos | Componentes */}
          <div className="p-2 border-b border-zinc-200 bg-white">
            <div className="grid grid-cols-3 p-1 bg-zinc-100 rounded-xl border border-zinc-200/80 gap-1">
              {/* Capas */}
              <button
                type="button"
                onClick={() => setLeftTab("layers")}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  leftTab === "layers"
                    ? "bg-white text-zinc-900 shadow-2xs font-bold"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50"
                }`}
                title="Ver estructura de capas y jerarquía del lienzo"
              >
                <Layers
                  className={`h-3.5 w-3.5 shrink-0 ${
                    leftTab === "layers" ? "text-zinc-800" : "text-zinc-400"
                  }`}
                />
                <span className="truncate">Capas</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                    leftTab === "layers"
                      ? "bg-zinc-100 text-zinc-700"
                      : "bg-zinc-200/80 text-zinc-500"
                  }`}
                >
                  {documentState.blocks.length}
                </span>
              </button>

              {/* Módulos */}
              <button
                type="button"
                onClick={() => setLeftTab("modules")}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  leftTab === "modules"
                    ? "bg-white text-zinc-900 shadow-2xs font-bold"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50"
                }`}
                title="Secciones y módulos prearmados"
              >
                <Sparkles
                  className={`h-3.5 w-3.5 shrink-0 ${
                    leftTab === "modules" ? "text-amber-600" : "text-zinc-400"
                  }`}
                />
                <span className="truncate">Módulos</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                    leftTab === "modules"
                      ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                      : "bg-zinc-200/80 text-zinc-500"
                  }`}
                >
                  {BUILTIN_LANDING_MODULES.length + customModules.length}
                </span>
              </button>

              {/* Componentes */}
              <button
                type="button"
                onClick={() => setLeftTab("components")}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  leftTab === "components"
                    ? "bg-white text-zinc-900 shadow-2xs font-bold"
                    : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/50"
                }`}
                title="Elementos atómicos y contenedores libres"
              >
                <Box
                  className={`h-3.5 w-3.5 shrink-0 ${
                    leftTab === "components" ? "text-blue-600" : "text-zinc-400"
                  }`}
                />
                <span className="truncate">Componentes</span>
              </button>
            </div>
          </div>

          {leftTab === "layers" ? (
            <>
              {/* Capas Header with Expand/Collapse All buttons */}
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-100 bg-zinc-50/50">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Estructura de Capas
                  </span>
                  <span className="text-[10px] font-bold text-zinc-600 bg-zinc-200/80 px-1.5 py-0.2 rounded-full">
                    {documentState.blocks.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleExpandAllLayers}
                    title="Expandir todas las capas"
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors flex items-center gap-1 text-[10px] font-medium"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Expandir</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCollapseAllLayers}
                    title="Contraer todas las capas"
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors flex items-center gap-1 text-[10px] font-medium"
                  >
                    <FoldVertical className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Contraer</span>
                  </button>
                </div>
              </div>

              {/* Layer Search Input */}
              <div className="p-2 border-b border-zinc-100">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={layerSearchQuery}
                    onChange={(e) => setLayerSearchQuery(e.target.value)}
                    placeholder="Buscar capas por nombre, etiqueta o texto..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                  {layerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLayerSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {layerSearchQuery.trim() && (
                  <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-zinc-500">
                    <span>
                      {matchingBlockIds.size}{" "}
                      {matchingBlockIds.size === 1
                        ? "sección encontrada"
                        : "secciones encontradas"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLayerSearchQuery("")}
                      className="text-blue-600 hover:underline"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {(() => {
                  const visibleBlocks = layerSearchQuery.trim()
                    ? documentState.blocks.filter((b) =>
                        matchingBlockIds.has(b.id),
                      )
                    : documentState.blocks;

                  if (visibleBlocks.length === 0) {
                    return (
                      <div className="py-8 px-4 text-center">
                        <Search className="h-6 w-6 text-zinc-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-zinc-700">
                          No se encontraron capas
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          No hay capas ni textos que coincidan con &ldquo;
                          {layerSearchQuery}&rdquo;
                        </p>
                        <button
                          type="button"
                          onClick={() => setLayerSearchQuery("")}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Limpiar búsqueda
                        </button>
                      </div>
                    );
                  }

                  return visibleBlocks.map((block, idx) => {
                    const isBlockSelected = block.id === selectedBlockId;
                    const rawTree = blockSubLayerTrees.get(block.id) || [];
                    const hasSingleRoot = rawTree.length === 1;
                    const rootSubNode = hasSingleRoot ? rawTree[0] : null;
                    const subLayers = hasSingleRoot ? rawTree[0].children : rawTree;
                    const hasSubLayers = subLayers.length > 0;
                    const rootTagLabel = rootSubNode ? rootSubNode.label : `<div.${block.moduleKey}>`;

                    const isRootSelected = Boolean(
                      rootSubNode && activeSubElement?.selector === rootSubNode.selector,
                    );
                    const isSectionActive =
                      isBlockSelected && (!activeSubElement || isRootSelected);
                    const Icon = getModuleIcon(block.moduleKey);
                    const isSearching = Boolean(layerSearchQuery.trim());
                    const isBlockExpanded = isSearching
                      ? true
                      : Boolean(expandedBlockIds[block.id]);

                  const isThisBlockDrop = blockDropTarget?.blockId === block.id;
                  const isThisBlockInside =
                    isThisBlockDrop && blockDropTarget.position === "inside";
                  const isThisBlockBefore =
                    isThisBlockDrop && blockDropTarget.position === "before";
                  const isThisBlockAfter =
                    isThisBlockDrop && blockDropTarget.position === "after";
                  const isSelfBlockDragging =
                    draggedLayerItem?.type === "block" &&
                    draggedLayerItem.blockId === block.id;

                  return (
                    <div key={block.id} className="flex flex-col">
                      <div
                        draggable
                        onDragStart={(e) => {
                          if ((e.target as HTMLElement).closest("button")) {
                            e.preventDefault();
                            return;
                          }
                          const realIdx = documentState.blocks.findIndex(
                            (b) => b.id === block.id,
                          );
                          const blockIndex = realIdx !== -1 ? realIdx : idx;
                          const item: DraggedLayerItem = {
                            type: "block",
                            blockId: block.id,
                            blockIndex,
                            label: block.name,
                          };
                          setDraggedLayerItem(item);
                          setDraggedLayerIndex(blockIndex);
                          const win = getDragWindow();
                          if (win) win.__draggedLayerItem = item;
                          try {
                            e.dataTransfer.setData(
                              "application/x-landing-layer",
                              JSON.stringify(item),
                            );
                            e.dataTransfer.setData(
                              "text/plain",
                              `landing-block:${block.id}`,
                            );
                            e.dataTransfer.effectAllowed = "move";
                          } catch {
                            // ignore
                          }
                        }}
                        onDragEnd={() => {
                          if (autoExpandBlockTimerRef.current) {
                            clearTimeout(autoExpandBlockTimerRef.current);
                            autoExpandBlockTimerRef.current = null;
                          }
                          setDraggedLayerItem(null);
                          setDraggedLayerIndex(null);
                          setBlockDropTarget(null);
                          const win = getDragWindow();
                          if (win) win.__draggedLayerItem = null;
                        }}
                        onDragOver={(e) => {
                          const win = getDragWindow();
                          const currentLayer =
                            draggedLayerItem || win?.__draggedLayerItem;
                          const compKind =
                            draggedComponentKind || win?.__draggedComponentKind;

                          if (
                            currentLayer?.type === "block" &&
                            currentLayer.blockId === block.id
                          ) {
                            return;
                          }

                          let isAcceptable = Boolean(compKind || currentLayer);
                          if (!isAcceptable && e.dataTransfer) {
                            try {
                              const plain =
                                e.dataTransfer.getData("text/plain") || "";
                              if (
                                plain.startsWith("landing-component:") ||
                                plain.startsWith("landing-layer:") ||
                                plain.startsWith("landing-block:") ||
                                e.dataTransfer.types.includes(
                                  "application/x-landing-component",
                                ) ||
                                e.dataTransfer.types.includes(
                                  "application/x-landing-layer",
                                )
                              ) {
                                isAcceptable = true;
                              }
                            } catch {
                              // ignore
                            }
                          }

                          if (isAcceptable) {
                            e.preventDefault();
                            e.stopPropagation();

                            if (hasSubLayers && !isBlockExpanded) {
                              if (!autoExpandBlockTimerRef.current) {
                                autoExpandBlockTimerRef.current = setTimeout(
                                  () => {
                                    setExpandedBlockIds((prev) => ({
                                      ...prev,
                                      [block.id]: true,
                                    }));
                                    autoExpandBlockTimerRef.current = null;
                                  },
                                  650,
                                );
                              }
                            }

                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const relY = e.clientY - rect.top;
                            const ratio = relY / rect.height;

                            let pos: "inside" | "before" | "after" = "inside";
                            if (currentLayer?.type === "block") {
                              pos = ratio < 0.5 ? "before" : "after";
                            } else {
                              pos = "inside";
                            }

                            setBlockDropTarget({
                              blockId: block.id,
                              position: pos,
                            });
                          }
                        }}
                        onDragLeave={() => {
                          setBlockDropTarget((prev) =>
                            prev?.blockId === block.id ? null : prev,
                          );
                          if (autoExpandBlockTimerRef.current) {
                            clearTimeout(autoExpandBlockTimerRef.current);
                            autoExpandBlockTimerRef.current = null;
                          }
                        }}
                        onDrop={(e) => {
                          if (autoExpandBlockTimerRef.current) {
                            clearTimeout(autoExpandBlockTimerRef.current);
                            autoExpandBlockTimerRef.current = null;
                          }
                          const pos = blockDropTarget?.position || "inside";
                          setBlockDropTarget(null);

                          const win = getDragWindow();
                          const currentLayer =
                            draggedLayerItem || win?.__draggedLayerItem;

                          if (draggedComponentKind) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleInsertInnerElement(
                              block.id,
                              rootSubNode ? rootSubNode.selector : null,
                              draggedComponentKind,
                            );
                            setDraggedComponentKind(null);
                            return;
                          }

                          if (currentLayer) {
                            e.preventDefault();
                            e.stopPropagation();
                            handleMoveLayer(
                              currentLayer,
                              { blockId: block.id, selector: null },
                              pos,
                            );
                            setDraggedLayerItem(null);
                            setDraggedLayerIndex(null);
                            if (win) win.__draggedLayerItem = null;
                            return;
                          }

                          const bKey =
                            draggedBuiltinKey || win?.__draggedBuiltinKey;
                          if (bKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            const found = BUILTIN_LANDING_MODULES.find(
                              (m) => m.moduleKey === bKey,
                            );
                            if (found) {
                              handleAddBuiltinBlock(
                                found,
                                block.id,
                                pos === "before" ? "before" : "after",
                              );
                            }
                            setDraggedBuiltinKey(null);
                            if (win) win.__draggedBuiltinKey = null;
                            return;
                          }

                          const cId =
                            draggedCustomId || win?.__draggedCustomId;
                          if (cId) {
                            e.preventDefault();
                            e.stopPropagation();
                            const found = customModules.find((m) => m.id === cId);
                            if (found) {
                              handleAddCustomBlock(
                                found,
                                block.id,
                                pos === "before" ? "before" : "after",
                              );
                            }
                            setDraggedCustomId(null);
                            if (win) win.__draggedCustomId = null;
                            return;
                          }

                          if (draggedLayerIndex !== null) {
                            const targetRealIdx =
                              documentState.blocks.findIndex(
                                (b) => b.id === block.id,
                              );
                            const toIdx = targetRealIdx !== -1 ? targetRealIdx : idx;
                            const fromIdx = draggedLayerIndex;
                            if (fromIdx !== toIdx) {
                              let calculatedToIdx = toIdx;
                              if (fromIdx < toIdx) {
                                calculatedToIdx = pos === "before" ? toIdx - 1 : toIdx;
                              } else {
                                calculatedToIdx = pos === "before" ? toIdx : toIdx + 1;
                              }
                              calculatedToIdx = Math.max(0, Math.min(documentState.blocks.length - 1, calculatedToIdx));
                              handleReorderBlocks(fromIdx, calculatedToIdx);
                            }
                            setDraggedLayerIndex(null);
                          }
                        }}
                        onClick={() => {
                          selectBlockOnStudio(block.id, true);
                          if (rootSubNode) {
                            selectSubElementOnStudio(block.id, rootSubNode.selector);
                          }
                        }}
                        className={`group relative flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all border select-none ${
                          isSelfBlockDragging
                            ? "opacity-35 bg-zinc-100 border-dashed border-zinc-400"
                            : isThisBlockInside
                              ? "bg-blue-100/90 border-blue-400 text-blue-900 ring-2 ring-blue-300 font-semibold shadow-2xs"
                              : isSectionActive
                                ? "bg-blue-50/80 border-blue-300 text-blue-900 shadow-2xs font-medium"
                                : isBlockSelected
                                  ? "bg-zinc-100/70 border-zinc-200 text-zinc-800"
                                  : "bg-transparent border-transparent hover:bg-zinc-50 text-zinc-700"
                        } ${!block.visible ? "opacity-45" : ""}`}
                      >
                        {isThisBlockBefore && (
                          <div className="absolute -top-0.5 left-1 right-1 h-[2px] bg-blue-500 rounded-full z-20 pointer-events-none shadow-xs" />
                        )}
                        {isThisBlockAfter && (
                          <div className="absolute -bottom-0.5 left-1 right-1 h-[2px] bg-blue-500 rounded-full z-20 pointer-events-none shadow-xs" />
                        )}

                        <div className="flex items-center gap-1.5 min-w-0">
                          {hasSubLayers ? (
                            <button
                              type="button"
                              onClick={(e) => toggleBlockExpanded(block.id, e)}
                              className="p-0.5 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-200/60"
                              title={
                                isBlockExpanded
                                  ? "Colapsar capas del bloque"
                                  : "Expandir capas del bloque"
                              }
                            >
                              {isBlockExpanded ? (
                                <ChevronDown className="h-3 w-3 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 shrink-0" />
                              )}
                            </button>
                          ) : (
                            <span className="w-3 shrink-0" />
                          )}

                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                              isSectionActive
                                ? "bg-blue-100 border-blue-200 text-blue-600"
                                : "bg-zinc-100 border-zinc-200 text-zinc-500"
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="text-xs font-mono font-semibold truncate text-zinc-900"
                              title={rootTagLabel}
                            >
                              {rootTagLabel}
                            </span>
                            {block.name && block.name !== rootTagLabel && (
                              <span
                                className="text-[10px] text-zinc-400 font-normal truncate shrink-0 max-w-[120px]"
                                title={block.name}
                              >
                                ({block.name})
                              </span>
                            )}
                          </div>

                          {isThisBlockInside && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white px-1.5 py-0.5 rounded shadow-2xs animate-pulse shrink-0">
                              ↳ Soltar dentro
                            </span>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleBlockVisibility(block.id)
                            }
                            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded"
                            title={block.visible ? "Ocultar" : "Mostrar"}
                          >
                            {block.visible ? (
                              <Eye className="h-3 w-3" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateBlock(block)}
                            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded"
                            title="Duplicar"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(block.id)}
                            className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Nested Sub-Layers (Figma Style) */}
                      {hasSubLayers && isBlockExpanded && (
                        <div className="flex flex-col ml-3 pl-1.5 border-l border-zinc-200/80 my-0.5 space-y-0.5">
                          {subLayers.map((subNode) => (
                            <SubLayerTreeRow
                              key={subNode.id}
                              block={block}
                              node={subNode}
                              depth={1}
                              selectedBlockId={selectedBlockId}
                              activeSubElementSelector={
                                activeSubElement?.selector
                              }
                              expandedSubLayerIds={expandedSubLayerIds}
                              matchingNodeIds={matchingNodeIds}
                              ancestorNodeIds={ancestorNodeIds}
                              isSearching={isSearching}
                              onSelectSubElement={selectSubElementOnStudio}
                              onHoverSubElement={handleHoverSubElement}
                              onToggleExpand={toggleSubLayerExpanded}
                              onDuplicateSubElement={handleDuplicateSubElement}
                              onDeleteSubElement={handleDeleteSubElement}
                              onDropComponentOnSubElement={(
                                bId,
                                selector,
                                kind,
                              ) => {
                                handleInsertInnerElement(bId, selector, kind);
                                setDraggedComponentKind(null);
                              }}
                              draggedComponentKind={draggedComponentKind}
                              draggedLayerItem={draggedLayerItem}
                              onDragStartLayer={(item) => {
                                setDraggedLayerItem(item);
                                const win = getDragWindow();
                                if (win) win.__draggedLayerItem = item;
                              }}
                              onDragEndLayer={() => {
                                setDraggedLayerItem(null);
                                const win = getDragWindow();
                                if (win) win.__draggedLayerItem = null;
                              }}
                              onDropLayerOnSubElement={(
                                targetBlockId,
                                targetSelector,
                                position,
                              ) => {
                                const item =
                                  draggedLayerItem ||
                                  getDragWindow()?.__draggedLayerItem;
                                if (item) {
                                  handleMoveLayer(
                                    item,
                                    {
                                      blockId: targetBlockId,
                                      selector: targetSelector,
                                    },
                                    position,
                                  );
                                  setDraggedLayerItem(null);
                                  const win = getDragWindow();
                                  if (win) win.__draggedLayerItem = null;
                                }
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
              </div>

              {/* Bottom pinned actions in Layers */}
              <div className="p-3 border-t border-zinc-200 space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLeftTab("modules")}
                    className="py-1.5 px-1 rounded-lg border border-dashed border-zinc-300 hover:border-amber-400 bg-zinc-50 hover:bg-amber-50/60 text-[11px] font-semibold text-zinc-700 hover:text-amber-700 flex items-center justify-center gap-1 transition-colors"
                    title="Ver catálogo de módulos prearmados"
                  >
                    <Layers className="h-3 w-3 text-amber-600" />
                    Módulo
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftTab("components")}
                    className="py-1.5 px-1 rounded-lg border border-dashed border-zinc-300 hover:border-blue-400 bg-zinc-50 hover:bg-blue-50/60 text-[11px] font-semibold text-zinc-700 hover:text-blue-700 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Plus className="h-3 w-3 text-blue-600" />
                    Elemento
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateContainerSection()}
                    className="py-1.5 px-1 rounded-lg border border-dashed border-zinc-300 hover:border-violet-400 bg-zinc-50 hover:bg-violet-50/60 text-[11px] font-semibold text-zinc-700 hover:text-violet-700 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Box className="h-3 w-3 text-violet-600" />
                    Caja
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => store.dispatch(landingWorkspace.changed({ libraryDialog: "saveTemplate" }))}
                    className="flex-1 py-1.5 px-2 rounded-md bg-zinc-50 hover:bg-zinc-100 text-[11px] font-medium text-zinc-700 border border-zinc-200 flex items-center justify-center gap-1"
                  >
                    <BookmarkPlus className="h-3 w-3 text-emerald-600" />
                    Guardar Plantilla
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefault}
                    className="py-1.5 px-2 rounded-md bg-zinc-50 hover:bg-zinc-100 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 border border-zinc-200"
                    title="Restaurar diseño inicial"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </>
          ) : leftTab === "components" ? (
            /* ======================================================= */
            /* + COMPONENTS TAB: Atomic UI Components (Figma / OpenPage)*/
            /* ======================================================= */
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              {/* Search */}
              <div className="p-2.5 border-b border-zinc-200">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                    placeholder="Buscar contenedor, botón, texto..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Category filter pills */}
              <div className="px-2.5 py-1.5 border-b border-zinc-100 flex items-center gap-1 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: "all", label: "Todos" },
                    { id: "layout", label: "Estructura" },
                    { id: "text", label: "Textos" },
                    { id: "action", label: "Acciones" },
                    { id: "media", label: "Medios" },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedComponentCategory(cat.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors ${
                      selectedComponentCategory === cat.id
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Direct Action: Create Container Section */}
              <div className="p-2.5 pb-1">
                <button
                  type="button"
                  onClick={() => handleCreateContainerSection()}
                  className="w-full py-2 px-3 rounded-xl bg-blue-50/80 hover:bg-blue-100 border border-blue-200 text-left flex items-center justify-between group transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
                      <Box className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <span className="text-xs font-semibold text-blue-900 block leading-tight">
                        + Nueva Sección Contenedor
                      </span>
                      <span className="text-[10px] text-blue-700/80 leading-tight">
                        Crea una sección libre para armar
                      </span>
                    </div>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              {/* Component Cards List */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                    Arrastrá al lienzo o clic
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    {filteredAtomicComponents.length} items
                  </span>
                </div>

                <div className="space-y-1.5">
                  {filteredAtomicComponents.map((comp) => {
                    const CompIcon = comp.icon;
                    return (
                      <div
                        key={comp.kind}
                        draggable
                        onDragStart={(e) => {
                          try {
                            e.dataTransfer.setData(
                              "application/x-landing-component",
                              comp.kind,
                            );
                            e.dataTransfer.setData(
                              "text/plain",
                              `landing-component:${comp.kind}`,
                            );
                            e.dataTransfer.effectAllowed = "all";
                          } catch {
                            // ignore dataTransfer access errors
                          }
                          const win = getDragWindow();
                          if (win) {
                            win.__draggedComponentKind = comp.kind;
                            win.__draggedBuiltinKey = null;
                            win.__draggedCustomId = null;
                            win.__draggedLayerItem = null;
                          }
                          draggedComponentKindRef.current = comp.kind;
                          draggedBuiltinKeyRef.current = null;
                          draggedCustomIdRef.current = null;
                          setDraggedComponentKind(comp.kind);
                          setDraggedBuiltinKey(null);
                          setDraggedCustomId(null);
                          setDraggedLayerItem(null);
                        }}
                        onDragEnd={() => {
                          setIsDraggingComponentOverCanvas(false);
                          setTimeout(() => {
                            const win = getDragWindow();
                            if (win) {
                              win.__draggedComponentKind = null;
                            }
                            draggedComponentKindRef.current = null;
                            setDraggedComponentKind(null);
                          }, 350);
                        }}
                        onClick={() => {
                          if (selectedBlockId) {
                            const newSel = handleInsertInnerElement(
                              selectedBlockId,
                              activeSubElement?.selector ?? null,
                              comp.kind,
                            );
                            if (newSel) {
                              selectSubElementOnStudio(selectedBlockId, newSel);
                            }
                            setFeedback({
                              type: "success",
                              message: `Componente "${comp.name}" agregado.`,
                            });
                          } else {
                            handleCreateContainerSection(comp.kind);
                          }
                        }}
                        className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-white hover:bg-blue-50/40 border border-zinc-200 hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing shadow-2xs select-none"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 group-hover:bg-blue-100 text-zinc-600 group-hover:text-blue-600 transition-colors">
                          <CompIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-xs font-semibold text-zinc-800 group-hover:text-blue-900 truncate">
                              {comp.name}
                            </span>
                            <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-500 group-hover:bg-blue-100 group-hover:text-blue-700 shrink-0">
                              {comp.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 line-clamp-1 leading-snug">
                            {comp.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================= */
            /* MÓDULOS TAB: Pre-built full sections & Custom Modules    */
            /* ======================================================= */
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              <div className="p-2.5 border-b border-zinc-200 space-y-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={componentSearch}
                    onChange={(e) => setComponentSearch(e.target.value)}
                    placeholder="Buscar secciones o módulos..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                  {componentSearch && (
                    <button
                      type="button"
                      onClick={() => setComponentSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 rounded-md"
                      title="Limpiar búsqueda"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Chips de filtro por categoría */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                  {moduleChips.map((chip) => {
                    const isActive = selectedModuleCategory === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setSelectedModuleCategory(chip.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? "bg-zinc-900 text-white shadow-2xs"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                        }`}
                      >
                        <span>{chip.label}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-zinc-200/80 text-zinc-600"
                          }`}
                        >
                          {chip.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
                {/* Vista agrupada cuando no hay búsqueda y categoría es 'all' */}
                {selectedModuleCategory === "all" && !componentSearch.trim() ? (
                  <>
                    {MODULE_GROUPS.map((group) => {
                      const groupItems = filteredBuiltinModules.filter(
                        (m) => getModuleCategory(m.moduleKey) === group.key,
                      );
                      if (groupItems.length === 0) return null;
                      const GroupIcon = group.icon;

                      return (
                        <div key={group.key} className="space-y-1.5">
                          <div className="flex items-center justify-between px-1 mb-1">
                            <div className="flex items-center gap-1.5">
                              <GroupIcon className="h-3.5 w-3.5 text-zinc-400" />
                              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                                {group.title}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-medium">
                              {groupItems.length}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {groupItems.map((mod) => {
                              const Icon = getModuleIcon(mod.moduleKey);
                              const cat = getModuleCategory(mod.moduleKey);
                              const meta = MODULE_CATEGORY_META[cat];

                              return (
                                <div
                                  key={mod.moduleKey}
                                  draggable
                                  onDragStart={(e) => {
                                    try {
                                      e.dataTransfer.setData(
                                        "application/x-landing-builtin",
                                        mod.moduleKey,
                                      );
                                      e.dataTransfer.setData(
                                        "text/plain",
                                        `landing-builtin:${mod.moduleKey}`,
                                      );
                                      e.dataTransfer.effectAllowed = "all";
                                    } catch {
                                      // ignore
                                    }
                                    const win = getDragWindow();
                                    if (win) {
                                      win.__draggedBuiltinKey = mod.moduleKey;
                                      win.__draggedComponentKind = null;
                                      win.__draggedCustomId = null;
                                      win.__draggedLayerItem = null;
                                    }
                                    draggedBuiltinKeyRef.current = mod.moduleKey;
                                    draggedComponentKindRef.current = null;
                                    draggedCustomIdRef.current = null;
                                    setDraggedBuiltinKey(mod.moduleKey);
                                    setDraggedComponentKind(null);
                                    setDraggedCustomId(null);
                                    setDraggedLayerItem(null);
                                  }}
                                  onDragEnd={() => {
                                    setIsDraggingComponentOverCanvas(false);
                                    setTimeout(() => {
                                      const win = getDragWindow();
                                      if (win) {
                                        win.__draggedBuiltinKey = null;
                                      }
                                      draggedBuiltinKeyRef.current = null;
                                      setDraggedBuiltinKey(null);
                                    }, 350);
                                  }}
                                  onClick={() => handleAddBuiltinBlock(mod)}
                                  className={`group flex items-start gap-2.5 p-2.5 rounded-xl bg-white hover:bg-zinc-50/90 border border-zinc-200/90 ${meta.hoverBorder} transition-all cursor-grab active:cursor-grabbing select-none shadow-2xs hover:shadow-xs`}
                                  title="Clic para agregar o arrastrá para posicionar"
                                >
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.iconBg} ${meta.iconText} border ${meta.iconBorder} transition-colors shadow-2xs mt-0.5`}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                      <span className="text-xs font-semibold text-zinc-900 group-hover:text-blue-700 transition-colors truncate">
                                        {mod.name}
                                      </span>
                                      <span
                                        className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${meta.badgeBg} ${meta.badgeText} shrink-0`}
                                      >
                                        {meta.label}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-zinc-500 group-hover:text-zinc-600 leading-snug line-clamp-2">
                                      {mod.description}
                                    </p>
                                  </div>

                                  <div
                                    className="flex h-9 items-center justify-center text-zinc-300 group-hover:text-blue-600 transition-colors shrink-0 pl-0.5 self-center"
                                    title="Arrastrar para posicionar"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  /* Vista plana cuando se filtra por categoría o búsqueda */
                  selectedModuleCategory !== "custom" && (
                    <div>
                      <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-400">
                          {componentSearch.trim()
                            ? `Resultados (${filteredBuiltinModules.length})`
                            : `${
                                MODULE_CATEGORY_META[
                                  selectedModuleCategory as ModuleCategory
                                ]?.fullLabel || "Módulos"
                              } (${filteredBuiltinModules.length})`}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {filteredBuiltinModules.map((mod) => {
                          const Icon = getModuleIcon(mod.moduleKey);
                          const cat = getModuleCategory(mod.moduleKey);
                          const meta = MODULE_CATEGORY_META[cat];

                          return (
                            <div
                              key={mod.moduleKey}
                              draggable
                              onDragStart={(e) => {
                                try {
                                  e.dataTransfer.setData(
                                    "application/x-landing-builtin",
                                    mod.moduleKey,
                                  );
                                  e.dataTransfer.setData(
                                    "text/plain",
                                    `landing-builtin:${mod.moduleKey}`,
                                  );
                                  e.dataTransfer.effectAllowed = "all";
                                } catch {
                                  // ignore
                                }
                                const win = getDragWindow();
                                if (win) {
                                  win.__draggedBuiltinKey = mod.moduleKey;
                                  win.__draggedComponentKind = null;
                                  win.__draggedCustomId = null;
                                  win.__draggedLayerItem = null;
                                }
                                draggedBuiltinKeyRef.current = mod.moduleKey;
                                draggedComponentKindRef.current = null;
                                draggedCustomIdRef.current = null;
                                setDraggedBuiltinKey(mod.moduleKey);
                                setDraggedComponentKind(null);
                                setDraggedCustomId(null);
                                setDraggedLayerItem(null);
                              }}
                              onDragEnd={() => {
                                setIsDraggingComponentOverCanvas(false);
                                setTimeout(() => {
                                  const win = getDragWindow();
                                  if (win) {
                                    win.__draggedBuiltinKey = null;
                                  }
                                  draggedBuiltinKeyRef.current = null;
                                  setDraggedBuiltinKey(null);
                                }, 350);
                              }}
                              onClick={() => handleAddBuiltinBlock(mod)}
                              className={`group flex items-start gap-2.5 p-2.5 rounded-xl bg-white hover:bg-zinc-50/90 border border-zinc-200/90 ${meta.hoverBorder} transition-all cursor-grab active:cursor-grabbing select-none shadow-2xs hover:shadow-xs`}
                              title="Clic para agregar o arrastrá para posicionar"
                            >
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.iconBg} ${meta.iconText} border ${meta.iconBorder} transition-colors shadow-2xs mt-0.5`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="text-xs font-semibold text-zinc-900 group-hover:text-blue-700 transition-colors truncate">
                                    {mod.name}
                                  </span>
                                  <span
                                    className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${meta.badgeBg} ${meta.badgeText} shrink-0`}
                                  >
                                    {meta.label}
                                  </span>
                                </div>
                                <p className="text-[10px] text-zinc-500 group-hover:text-zinc-600 leading-snug line-clamp-2">
                                  {mod.description}
                                </p>
                              </div>

                              <div
                                className="flex h-9 items-center justify-center text-zinc-300 group-hover:text-blue-600 transition-colors shrink-0 pl-0.5 self-center"
                                title="Arrastrar para posicionar"
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}

                {/* User's Saved Custom Modules */}
                {(selectedModuleCategory === "all" ||
                  selectedModuleCategory === "custom") && (
                  <div>
                    <div className="flex items-center justify-between px-1 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800">
                          Mis Módulos Guardados ({filteredCustomModules.length})
                        </span>
                      </div>
                    </div>
                    {filteredCustomModules.length === 0 ? (
                      selectedModuleCategory === "custom" ||
                      customModules.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-zinc-200 p-3 text-center bg-zinc-50/50">
                          <p className="text-[11px] text-zinc-500 leading-relaxed">
                            Personalizá cualquier sección y tocá{" "}
                            <strong className="text-zinc-700">
                              Guardar como Módulo
                            </strong>{" "}
                            para reutilizarlo acá.
                          </p>
                        </div>
                      ) : null
                    ) : (
                      <div className="space-y-1.5">
                        {filteredCustomModules.map((cm) => (
                          <div
                            key={cm.id}
                            draggable
                            onDragStart={(e) => {
                              try {
                                e.dataTransfer.setData(
                                  "application/x-landing-custom",
                                  cm.id,
                                );
                                e.dataTransfer.setData(
                                  "text/plain",
                                  `landing-custom:${cm.id}`,
                                );
                                e.dataTransfer.effectAllowed = "all";
                              } catch {
                                // ignore
                              }
                              const win = getDragWindow();
                              if (win) {
                                win.__draggedCustomId = cm.id;
                                win.__draggedBuiltinKey = null;
                                win.__draggedComponentKind = null;
                                win.__draggedLayerItem = null;
                              }
                              draggedCustomIdRef.current = cm.id;
                              draggedBuiltinKeyRef.current = null;
                              draggedComponentKindRef.current = null;
                              setDraggedCustomId(cm.id);
                              setDraggedBuiltinKey(null);
                              setDraggedComponentKind(null);
                              setDraggedLayerItem(null);
                            }}
                            onDragEnd={() => {
                              setIsDraggingComponentOverCanvas(false);
                              setTimeout(() => {
                                const win = getDragWindow();
                                if (win) {
                                  win.__draggedCustomId = null;
                                }
                                draggedCustomIdRef.current = null;
                                setDraggedCustomId(null);
                              }, 350);
                            }}
                            onClick={() => handleAddCustomBlock(cm)}
                            className="group flex items-start gap-2.5 p-2.5 rounded-xl bg-white hover:bg-amber-50/20 border border-zinc-200/90 hover:border-amber-300 transition-all cursor-grab active:cursor-grabbing select-none shadow-2xs hover:shadow-xs"
                            title="Clic para agregar o arrastrá para posicionar"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200/80 group-hover:bg-amber-100 transition-colors shadow-2xs mt-0.5">
                              <Wrench className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <span className="text-xs font-semibold text-zinc-900 group-hover:text-amber-800 transition-colors truncate">
                                  {cm.name}
                                </span>
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-50 border border-amber-200 text-amber-800 shrink-0">
                                  Guardado
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 leading-snug truncate">
                                {cm.fields.length} variable
                                {cm.fields.length === 1 ? "" : "s"} editable
                                {cm.fields.length === 1 ? "" : "s"}
                              </p>
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0 self-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomModule(cm.id);
                                }}
                                className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                title="Eliminar módulo guardado"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              <div
                                className="p-1 text-zinc-300 group-hover:text-amber-600 transition-colors"
                                title="Arrastrar para posicionar"
                              >
                                <GripVertical className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Estado vacío cuando no hay coincidencias */}
                {filteredBuiltinModules.length === 0 &&
                  filteredCustomModules.length === 0 && (
                    <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center bg-zinc-50/50">
                      <Search className="h-5 w-5 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-zinc-700">
                        No se encontraron módulos
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {componentSearch
                          ? `Sin resultados para "${componentSearch}"`
                          : "No hay módulos en esta categoría"}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setComponentSearch("");
                          setSelectedModuleCategory("all");
                        }}
                        className="mt-3 px-3 py-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Ver todos los módulos
                      </button>
                    </div>
                  )}
              </div>
            </div>
          )}
            </div>
          </aside>

          {/* Flechita flotante en el medio del borde para cerrar/abrir */}
          <button
            type="button"
            onClick={() => setIsLeftSidebarOpen((prev) => !prev)}
            className="absolute top-1/2 -translate-y-1/2 left-full z-40 flex h-8 w-4.5 items-center justify-center bg-white border-y border-r border-zinc-300 border-l-0 rounded-r-md text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-400 hover:w-5 shadow-xs active:scale-95 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            title={
              isLeftSidebarOpen
                ? "Ocultar panel lateral (Capas y Componentes)"
                : "Mostrar panel lateral (Capas y Componentes)"
            }
            aria-label={
              isLeftSidebarOpen
                ? "Ocultar panel lateral"
                : "Mostrar panel lateral"
            }
          >
            {isLeftSidebarOpen ? (
              <ChevronLeft className="h-3.5 w-3.5 -ml-0.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 -ml-0.5" />
            )}
          </button>
        </div>
  );
}
