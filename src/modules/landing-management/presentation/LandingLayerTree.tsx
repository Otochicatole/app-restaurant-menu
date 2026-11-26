import React, { useState, useRef } from "react";
import { Sparkles, Layers, Trash2, Copy, ChevronDown, ChevronRight, Box, Type, Image as ImageIcon, Link2, MousePointerClick } from "lucide-react";
import { type LandingBlock } from "../contracts";
import { type InsertableInnerElementKind, type LandingSubLayerIconType, type LandingSubLayerNode } from "../domain/landing-compiler";

function SubLayerIcon({
  iconType,
  className,
}: {
  iconType: LandingSubLayerIconType;
  className?: string;
}) {
  switch (iconType) {
    case "image":
      return <ImageIcon className={className} />;
    case "button":
      return <MousePointerClick className={className} />;
    case "link":
      return <Link2 className={className} />;
    case "text":
      return <Type className={className} />;
    case "card":
      return <Layers className={className} />;
    case "badge":
      return <Sparkles className={className} />;
    case "container":
    default:
      return <Box className={className} />;
  }
}

export type DraggedLayerItem =
  | {
      type: "block";
      blockId: string;
      blockIndex: number;
      label: string;
    }
  | {
      type: "sublayer";
      blockId: string;
      selector: string;
      label: string;
      tag: string;
    };

interface SubLayerTreeRowProps {
  block: LandingBlock;
  node: LandingSubLayerNode;
  depth: number;
  selectedBlockId: string | null;
  activeSubElementSelector?: string | null;
  expandedSubLayerIds: Record<string, boolean>;
  matchingNodeIds?: Set<string>;
  ancestorNodeIds?: Set<string>;
  isSearching?: boolean;
  onSelectSubElement: (blockId: string, selector: string) => void;
  onHoverSubElement: (blockId: string | null, selector: string | null) => void;
  onToggleExpand: (nodeId: string, e: React.MouseEvent) => void;
  onDuplicateSubElement: (blockId: string, selector: string) => void;
  onDeleteSubElement: (blockId: string, selector: string) => void;
  onDropComponentOnSubElement?: (
    blockId: string,
    selector: string,
    kind: InsertableInnerElementKind,
  ) => void;
  draggedComponentKind?: InsertableInnerElementKind | null;
  draggedLayerItem?: DraggedLayerItem | null;
  onDragStartLayer?: (item: DraggedLayerItem, e: React.DragEvent) => void;
  onDragEndLayer?: () => void;
  onDropLayerOnSubElement?: (
    targetBlockId: string,
    targetSelector: string,
    position: "inside" | "before" | "after",
  ) => void;
}

interface LandingDragWindow extends Window {
  __draggedComponentKind?: InsertableInnerElementKind | null;
  __draggedBuiltinKey?: string | null;
  __draggedCustomId?: string | null;
  __draggedLayerItem?: DraggedLayerItem | null;
}

export function getDragWindow(): LandingDragWindow | null {
  if (typeof window === "undefined") return null;
  return window as unknown as LandingDragWindow;
}

export function SubLayerTreeRow({
  block,
  node,
  depth,
  selectedBlockId,
  activeSubElementSelector,
  expandedSubLayerIds,
  matchingNodeIds,
  ancestorNodeIds,
  isSearching,
  onSelectSubElement,
  onHoverSubElement,
  onToggleExpand,
  onDuplicateSubElement,
  onDeleteSubElement,
  onDropComponentOnSubElement,
  draggedComponentKind,
  draggedLayerItem,
  onDragStartLayer,
  onDragEndLayer,
  onDropLayerOnSubElement,
}: SubLayerTreeRowProps) {
  const [dropPosition, setDropPosition] = useState<
    "inside" | "before" | "after" | null
  >(null);
  const autoExpandTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isSelected =
    selectedBlockId === block.id &&
    activeSubElementSelector === node.selector;
  const hasChildren = node.children.length > 0;
  const isSearchingActive = Boolean(isSearching);
  const isExpanded =
    isSearchingActive && ancestorNodeIds?.has(node.id)
      ? true
      : Boolean(expandedSubLayerIds[node.id]);
  const isMatching =
    isSearchingActive && Boolean(matchingNodeIds?.has(node.id));

  const isSelfDragging =
    draggedLayerItem?.type === "sublayer" &&
    draggedLayerItem.blockId === block.id &&
    draggedLayerItem.selector === node.selector;

  const isDropInside = dropPosition === "inside";

  return (
    <div className="flex flex-col">
      <div
        draggable
        onDragStart={(e) => {
          if ((e.target as HTMLElement).closest("button")) {
            e.preventDefault();
            return;
          }
          const item: DraggedLayerItem = {
            type: "sublayer",
            blockId: block.id,
            selector: node.selector,
            label: node.label,
            tag: node.tag,
          };
          onDragStartLayer?.(item, e);
          const win = getDragWindow();
          if (win) win.__draggedLayerItem = item;
          try {
            e.dataTransfer.setData(
              "application/x-landing-layer",
              JSON.stringify(item),
            );
            e.dataTransfer.setData(
              "text/plain",
              `landing-layer:${item.blockId}:${item.selector}`,
            );
            e.dataTransfer.effectAllowed = "move";
          } catch {
            // ignore
          }
        }}
        onDragEnd={() => {
          if (autoExpandTimerRef.current) {
            clearTimeout(autoExpandTimerRef.current);
            autoExpandTimerRef.current = null;
          }
          onDragEndLayer?.();
          const win = getDragWindow();
          if (win) win.__draggedLayerItem = null;
          setDropPosition(null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectSubElement(block.id, node.selector);
        }}
        onMouseEnter={() => onHoverSubElement(block.id, node.selector)}
        onMouseLeave={() => onHoverSubElement(null, null)}
        onDragOver={(e) => {
          const win = getDragWindow();
          const currentLayer = draggedLayerItem || win?.__draggedLayerItem;
          const compKind = draggedComponentKind || win?.__draggedComponentKind;

          // Prevent dropping onto self or descendants
          if (
            currentLayer?.type === "sublayer" &&
            currentLayer.blockId === block.id
          ) {
            if (
              currentLayer.selector === node.selector ||
              node.selector.startsWith(currentLayer.selector + " > ")
            ) {
              return;
            }
          }

          let isAcceptable = Boolean(compKind || currentLayer);
          if (!isAcceptable && e.dataTransfer) {
            try {
              const plain = e.dataTransfer.getData("text/plain") || "";
              if (
                plain.startsWith("landing-component:") ||
                plain.startsWith("landing-layer:") ||
                e.dataTransfer.types.includes(
                  "application/x-landing-component",
                ) ||
                e.dataTransfer.types.includes("application/x-landing-layer")
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

            if (hasChildren && !isExpanded) {
              if (!autoExpandTimerRef.current) {
                autoExpandTimerRef.current = setTimeout(() => {
                  onToggleExpand(node.id, e as unknown as React.MouseEvent);
                  autoExpandTimerRef.current = null;
                }, 600);
              }
            }

            const rect = e.currentTarget.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            const ratio = relY / rect.height;

            let pos: "inside" | "before" | "after" = "inside";
            if (ratio < 0.25) pos = "before";
            else if (ratio > 0.75) pos = "after";
            else pos = "inside";

            setDropPosition(pos);
          }
        }}
        onDragLeave={() => {
          setDropPosition(null);
          if (autoExpandTimerRef.current) {
            clearTimeout(autoExpandTimerRef.current);
            autoExpandTimerRef.current = null;
          }
        }}
        onDrop={(e) => {
          if (autoExpandTimerRef.current) {
            clearTimeout(autoExpandTimerRef.current);
            autoExpandTimerRef.current = null;
          }
          const pos = dropPosition || "inside";
          setDropPosition(null);

          const win = getDragWindow();
          const currentLayer = draggedLayerItem || win?.__draggedLayerItem;

          // 1. Drop dragged layer
          if (currentLayer) {
            e.preventDefault();
            e.stopPropagation();
            onDropLayerOnSubElement?.(block.id, node.selector, pos);
            return;
          }

          // 2. Drop catalog component
          let kind = draggedComponentKind || win?.__draggedComponentKind;
          if (!kind) {
            try {
              const plain = e.dataTransfer.getData("text/plain") || "";
              if (plain.startsWith("landing-component:")) {
                kind = plain.slice(
                  "landing-component:".length,
                ) as InsertableInnerElementKind;
              } else {
                kind = (e.dataTransfer.getData(
                  "application/x-landing-component",
                ) || null) as InsertableInnerElementKind | null;
              }
            } catch {
              // ignore
            }
          }

          if (kind) {
            e.preventDefault();
            e.stopPropagation();
            onDropComponentOnSubElement?.(block.id, node.selector, kind);
            return;
          }
        }}
        style={{ paddingLeft: `${4 + depth * 10}px` }}
        className={`group relative flex items-center justify-between gap-1.5 py-1.5 pr-2 rounded-md cursor-pointer text-xs transition-colors border select-none ${
          isSelfDragging
            ? "opacity-35 bg-zinc-100 border-dashed border-zinc-400"
            : isDropInside
              ? "bg-violet-100/90 border-violet-400 text-violet-950 font-semibold ring-2 ring-violet-300 shadow-2xs"
              : isSelected
                ? "bg-violet-100/90 border-violet-300 text-violet-900 font-semibold shadow-2xs"
                : isMatching
                  ? "bg-blue-50/90 border-blue-400 text-blue-900 font-semibold ring-1 ring-blue-300 shadow-2xs"
                  : "border-transparent hover:bg-zinc-100/80 text-zinc-600 hover:text-zinc-900"
        }`}
        title={`Seleccionar ${node.label} (Arrastrá para reordenar o anidar)`}
      >
        {dropPosition === "before" && (
          <div className="absolute -top-0.5 left-1 right-1 h-[2px] bg-blue-500 rounded-full z-20 pointer-events-none shadow-xs" />
        )}
        {dropPosition === "after" && (
          <div className="absolute -bottom-0.5 left-1 right-1 h-[2px] bg-blue-500 rounded-full z-20 pointer-events-none shadow-xs" />
        )}

        <div className="flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => onToggleExpand(node.id, e)}
              className="p-0.5 -ml-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-200/60"
              title={isExpanded ? "Colapsar capa" : "Expandir capa"}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 shrink-0" />
              )}
            </button>
          ) : (
            <span className="w-3 shrink-0" />
          )}

          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded ${
              isSelected
                ? "text-violet-700"
                : "text-zinc-400 group-hover:text-zinc-600"
            }`}
          >
            <SubLayerIcon iconType={node.iconType} className="h-3 w-3" />
          </span>

          <span className="truncate text-[11px] font-mono font-medium" title={node.label}>
            {node.label}
          </span>

          {isDropInside && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-violet-600 text-white px-1.5 py-0.5 rounded shadow-2xs animate-pulse shrink-0">
              ↳ dentro
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onDuplicateSubElement(block.id, node.selector)}
            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 rounded"
            title="Duplicar este elemento"
          >
            <Copy className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteSubElement(block.id, node.selector)}
            className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Eliminar este elemento"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <SubLayerTreeRow
              key={child.id}
              block={block}
              node={child}
              depth={depth + 1}
              selectedBlockId={selectedBlockId}
              activeSubElementSelector={activeSubElementSelector}
              expandedSubLayerIds={expandedSubLayerIds}
              matchingNodeIds={matchingNodeIds}
              ancestorNodeIds={ancestorNodeIds}
              isSearching={isSearching}
              onSelectSubElement={onSelectSubElement}
              onHoverSubElement={onHoverSubElement}
              onToggleExpand={onToggleExpand}
              onDuplicateSubElement={onDuplicateSubElement}
              onDeleteSubElement={onDeleteSubElement}
              onDropComponentOnSubElement={onDropComponentOnSubElement}
              draggedComponentKind={draggedComponentKind}
              draggedLayerItem={draggedLayerItem}
              onDragStartLayer={onDragStartLayer}
              onDragEndLayer={onDragEndLayer}
              onDropLayerOnSubElement={onDropLayerOnSubElement}
            />
          ))}
        </div>
      )}
    </div>
  );
}
