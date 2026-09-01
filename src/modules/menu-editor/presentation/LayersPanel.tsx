"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import type { CanvasNode } from "../contracts";

interface LayersPanelProps {
  nodes: CanvasNode[];
  selectedIds: string[];
  onReorder(activeId: string, overId: string): void;
  onSelect(id: string, additive: boolean): void;
}

export function LayersPanel({ nodes, selectedIds, onReorder, onSelect }: LayersPanelProps) {
  const frontToBackNodes = useMemo(() => [...nodes].reverse(), [nodes]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const activeNode = activeId ? nodes.find((node) => node.id === activeId) ?? null : null;

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    if (!selectedIds.includes(id)) onSelect(id, false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (!event.over || event.active.id === event.over.id) return;
    onReorder(String(event.active.id), String(event.over.id));
  };

  return (
    <aside id="editor-layers" className="w-64 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Capas</p>
          <p className="mt-1 text-[10px] text-zinc-400">Arrastrá para cambiar la profundidad</p>
        </div>
      </div>

      {frontToBackNodes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-5 text-center text-xs leading-5 text-zinc-400">Todavía no hay objetos en el lienzo.</p>
      ) : (
        <DndContext
          id="menu-editor-layer-order"
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={frontToBackNodes.map((node) => node.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {frontToBackNodes.map((node) => (
                <SortableLayerRow
                  key={node.id}
                  node={node}
                  selected={selectedIds.includes(node.id)}
                  onSelect={(additive) => onSelect(node.id, additive)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 160, easing: "ease-out" }}>
            {activeNode ? <LayerPreview node={activeNode} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </aside>
  );
}

function SortableLayerRow({ node, selected, onSelect }: { node: CanvasNode; selected: boolean; onSelect(additive: boolean): void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const label = getLayerLabel(node);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, willChange: "transform" }}
      className={`group flex min-w-0 items-center rounded-lg border transition-[background-color,border-color,box-shadow,opacity] ${selected ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-transparent text-zinc-700 hover:border-zinc-200 hover:bg-zinc-50"} ${isDragging ? "relative z-10 opacity-30" : ""}`}
    >
      <button
        type="button"
        className="flex h-9 w-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-l-lg text-zinc-400 hover:text-emerald-700 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
        aria-label={`Reordenar capa ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={15} />
      </button>
      <button
        type="button"
        className="flex h-9 min-w-0 flex-1 items-center gap-2 pr-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
        aria-pressed={selected}
        onClick={(event) => onSelect(event.shiftKey)}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {node.locked && <LockKeyhole size={12} className="shrink-0 text-zinc-400" aria-label="Objeto bloqueado" />}
      </button>
    </div>
  );
}

function LayerPreview({ node }: { node: CanvasNode }) {
  return (
    <div className="flex h-10 w-60 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-medium text-emerald-900 shadow-xl">
      <GripVertical size={15} className="shrink-0 text-emerald-600" />
      <span className="min-w-0 flex-1 truncate">{getLayerLabel(node)}</span>
      {node.locked && <LockKeyhole size={12} className="shrink-0 text-zinc-400" />}
    </div>
  );
}

function getLayerLabel(node: CanvasNode): string {
  if (node.name?.trim()) return node.name.trim();
  if (node.type === "text") return node.text.trim() || "Texto vacío";
  if (node.type === "image") return node.alt.trim() || "Imagen";
  if (node.type === "shape") return shapeLabels[node.shape];
  return `Icono ${node.iconKey}`;
}

const shapeLabels: Record<Extract<CanvasNode, { type: "shape" }>["shape"], string> = {
  rect: "Rectángulo",
  ellipse: "Elipse",
  line: "Línea",
  arrow: "Flecha",
  triangle: "Triángulo",
  star: "Estrella",
};
