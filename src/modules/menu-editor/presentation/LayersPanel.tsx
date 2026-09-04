"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
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
import { ChevronDown, ChevronRight, Eye, EyeOff, Folder, FolderPlus, GripVertical, Layers2, LockKeyhole, Unlock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CanvasDocumentV1, CanvasGroup, CanvasNode } from "../contracts";
import { layerTreeRows, type CanvasLayerIndex, type CanvasLayerMoveDestination, type CanvasLayerRef, type CanvasLayerRow } from "../domain/layer-tree";

interface LayersPanelProps {
  document: CanvasDocumentV1;
  layerIndex: CanvasLayerIndex;
  selectedIds: string[];
  selectedGroupId: string | null;
  renameGroupId: string | null;
  storageKey: string;
  onCreateGroup(): void;
  onGroupSelection(): void;
  onSelectNode(id: string, additive: boolean): void;
  onSelectGroup(id: string): void;
  onChangeNode(id: string, patch: Partial<Pick<CanvasNode, "visible" | "locked">>): void;
  onChangeGroup(id: string, patch: Partial<Pick<CanvasGroup, "visible" | "locked">>): void;
  onRenameGroup(id: string, name: string): void;
  onUngroup(id: string): void;
  onMove(active: CanvasLayerRef, destination: CanvasLayerMoveDestination): void;
  onRenameFinished(): void;
}

export function LayersPanel({ document, layerIndex, selectedIds, selectedGroupId, renameGroupId, storageKey, onCreateGroup, onGroupSelection, onSelectNode, onSelectGroup, onChangeNode, onChangeGroup, onRenameGroup, onUngroup, onMove, onRenameFinished }: LayersPanelProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [storageReady, setStorageReady] = useState(false);
  const [activeRef, setActiveRef] = useState<CanvasLayerRef | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedGroup = selectedGroupId ? layerIndex.groupsById.get(selectedGroupId) ?? null : null;
  const selectedGroupLocked = selectedGroup ? layerIndex.groupStates.get(selectedGroup.id)?.effectiveLocked ?? true : false;
  const displayedCollapsed = useMemo(() => {
    const next = new Set(collapsed);
    const visited = new Set<string>();
    let current = selectedGroupId ? layerIndex.groupsById.get(selectedGroupId)?.parentGroupId ?? null : null;
    while (current && !visited.has(current)) {
      visited.add(current);
      next.delete(current);
      current = layerIndex.groupsById.get(current)?.parentGroupId ?? null;
    }
    return next;
  }, [collapsed, layerIndex, selectedGroupId]);
  const rows = useMemo(() => layerTreeRows(document, displayedCollapsed, layerIndex), [document, displayedCollapsed, layerIndex]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const collisionDetection = useMemo<CollisionDetection>(() => (args) => {
    const pointerCollisions = pointerWithin(args);
    const inside = pointerCollisions.find((collision) => String(collision.id).startsWith("inside:"));
    if (inside) return [inside];
    return closestCenter(args);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCollapsed(readCollapsedGroups(storageKey));
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!storageReady) return;
    const existing = new Set(document.groups.map((group) => group.id));
    const clean = [...collapsed].filter((id) => existing.has(id));
    try { window.localStorage.setItem(storageKey, JSON.stringify(clean)); } catch { /* Keep the panel usable without persistence. */ }
  }, [collapsed, document.groups, storageKey, storageReady]);

  const beginRename = (group: CanvasGroup) => {
    setEditingGroupId(group.id);
    setNameDraft(group.name);
  };
  const finishRename = (save: boolean) => {
    const groupId = editingGroupId ?? renameGroupId;
    const draft = editingGroupId ? nameDraft : renameGroupId ? layerIndex.groupsById.get(renameGroupId)?.name ?? "" : "";
    if (save && groupId && draft.trim()) onRenameGroup(groupId, draft.trim());
    setEditingGroupId(null);
    onRenameFinished();
  };
  const changeNameDraft = (value: string) => {
    if (!editingGroupId && renameGroupId) setEditingGroupId(renameGroupId);
    setNameDraft(value);
  };
  const toggleCollapsed = (id: string) => setCollapsed((items) => {
    const next = new Set(items);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const handleDragStart = (event: DragStartEvent) => {
    const ref = parseLayerDndId(String(event.active.id));
    if (!ref) return;
    setActiveRef(ref);
    if (ref.kind === "group") onSelectGroup(ref.id);
    else if (!selectedIdSet.has(ref.id)) onSelectNode(ref.id, false);
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const active = parseLayerDndId(String(event.active.id));
    setActiveRef(null);
    if (!active || !event.over) return;
    if (event.delta.x < -36) { onMove(active, { type: "outdent" }); return; }
    const overId = String(event.over.id);
    if (overId === "root-drop") { onMove(active, { type: "root-front" }); return; }
    if (overId.startsWith("inside:")) { onMove(active, { type: "inside", groupId: overId.slice("inside:".length) }); return; }
    const target = parseLayerDndId(overId);
    if (!target) return;
    const translated = event.active.rect.current.translated;
    const activeCenter = translated ? translated.top + translated.height / 2 : event.over.rect.top;
    const targetCenter = event.over.rect.top + event.over.rect.height / 2;
    onMove(active, { type: activeCenter < targetCenter ? "before" : "after", target });
  };
  const activeLabel = activeRef ? layerLabel(layerIndex, activeRef) : "";

  return (
    <aside id="editor-layers" className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-zinc-200 bg-white shadow-sm" aria-label="Capas del lienzo">
      <header className="shrink-0 border-b border-zinc-100 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Capas</p>
            <p className="mt-1 text-[10px] text-zinc-400">Arrastrá para ordenar o anidar</p>
          </div>
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] text-zinc-500">{document.nodes.length}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 px-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40" disabled={selectedGroupLocked} onClick={onCreateGroup}><FolderPlus size={14} aria-hidden="true" />Nuevo grupo</button>
          <button type="button" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 px-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40" disabled={selectedGroupLocked || (!selectedIds.length && !selectedGroupId)} onClick={onGroupSelection}><Layers2 size={14} aria-hidden="true" />Agrupar</button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!rows.length ? (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-5 text-center text-xs leading-5 text-zinc-400">Todavía no hay capas ni grupos.</p>
        ) : (
          <DndContext id="menu-editor-layer-tree" sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragCancel={() => setActiveRef(null)} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((row) => layerDndId(row.ref))} strategy={verticalListSortingStrategy}>
              <div role="tree" aria-label="Árbol de capas" className="space-y-0.5">
                {rows.map((row) => {
                  const node = row.ref.kind === "node" ? layerIndex.nodesById.get(row.ref.id) : undefined;
                  const group = row.ref.kind === "group" ? layerIndex.groupsById.get(row.ref.id) : undefined;
                  if (!node && !group) return null;
                  return <SortableLayerRow
                    key={layerDndId(row.ref)}
                    row={row}
                    node={node}
                    group={group}
                    selected={row.ref.kind === "group" ? selectedGroupId === row.ref.id : !selectedGroupId && selectedIdSet.has(row.ref.id)}
                    collapsed={group ? displayedCollapsed.has(group.id) : false}
                    editing={group?.id === (editingGroupId ?? renameGroupId)}
                    nameDraft={editingGroupId ? nameDraft : group?.name ?? ""}
                    onNameDraftChange={changeNameDraft}
                    onFinishRename={finishRename}
                    onBeginRename={() => group && beginRename(group)}
                    onToggleCollapsed={() => group && toggleCollapsed(group.id)}
                    onSelect={(additive) => group ? onSelectGroup(group.id) : node && onSelectNode(node.id, additive)}
                    onToggleVisible={() => group ? onChangeGroup(group.id, { visible: !group.visible }) : node && onChangeNode(node.id, { visible: !node.visible })}
                    onToggleLocked={() => group ? onChangeGroup(group.id, { locked: !group.locked }) : node && onChangeNode(node.id, { locked: !node.locked })}
                  />;
                })}
              </div>
            </SortableContext>
            <RootDropZone active={Boolean(activeRef)} />
            <DragOverlay dropAnimation={{ duration: 160, easing: "ease-out" }}>{activeRef ? <div className="flex h-9 w-56 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-medium text-emerald-900 shadow-xl"><GripVertical size={14} /><span className="truncate">{activeLabel}</span></div> : null}</DragOverlay>
          </DndContext>
        )}
      </div>
      {selectedGroupId && <footer className="shrink-0 border-t border-zinc-100 p-2"><button type="button" disabled={selectedGroupLocked} className="w-full rounded-md px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-40" onClick={() => onUngroup(selectedGroupId)}>Desagrupar y conservar capas</button></footer>}
    </aside>
  );
}

function SortableLayerRow({ row, node, group, selected, collapsed, editing, nameDraft, onNameDraftChange, onFinishRename, onBeginRename, onToggleCollapsed, onSelect, onToggleVisible, onToggleLocked }: {
  row: CanvasLayerRow;
  node?: CanvasNode;
  group?: CanvasGroup;
  selected: boolean;
  collapsed: boolean;
  editing: boolean;
  nameDraft: string;
  onNameDraftChange(value: string): void;
  onFinishRename(save: boolean): void;
  onBeginRename(): void;
  onToggleCollapsed(): void;
  onSelect(additive: boolean): void;
  onToggleVisible(): void;
  onToggleLocked(): void;
}) {
  const ref = row.ref;
  const label = group ? group.name : node ? getNodeLabel(node) : "Capa";
  const ownVisible = group ? group.visible : node?.visible ?? true;
  const ownLocked = group ? group.locked : node?.locked ?? false;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layerDndId(ref), disabled: row.effectiveLocked });
  const { setNodeRef: setInsideRef, isOver: isInsideOver } = useDroppable({ id: group ? `inside:${group.id}` : `inside-disabled:${ref.id}`, disabled: !group || row.effectiveLocked });
  const indent = Math.min(72, row.depth * 14);

  return <div
    ref={setNodeRef}
    role="treeitem"
    aria-level={row.depth + 1}
    aria-selected={selected}
    aria-expanded={group ? !collapsed : undefined}
    style={{ transform: CSS.Transform.toString(transform), transition, willChange: isDragging ? "transform" : "auto", paddingLeft: indent, contentVisibility: "auto", containIntrinsicSize: "32px" }}
    className={`relative ${isDragging ? "z-10 opacity-30" : ""}`}
  >
    {row.depth > 0 && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 opacity-70" style={{ width: indent, backgroundImage: "repeating-linear-gradient(to right, transparent 0, transparent 12px, #e4e4e7 13px, transparent 14px)" }} />}
    <div className={`group/row flex min-w-0 items-center rounded-md border transition-colors ${selected ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-transparent text-zinc-700 hover:border-zinc-100 hover:bg-zinc-50"} ${!row.effectiveVisible ? "opacity-55" : ""}`}>
      <button type="button" disabled={row.effectiveLocked} className="flex h-8 w-6 shrink-0 touch-none cursor-grab items-center justify-center text-zinc-400 hover:text-emerald-700 active:cursor-grabbing disabled:cursor-default disabled:opacity-40" aria-label={`Reordenar ${group ? "grupo" : "capa"} ${label}`} {...attributes} {...listeners}><GripVertical size={13} /></button>
      {group ? <button type="button" className="flex h-8 w-6 shrink-0 items-center justify-center text-zinc-500" aria-label={collapsed ? `Expandir grupo ${label}` : `Contraer grupo ${label}`} onClick={onToggleCollapsed}>{collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button> : <span className="w-6 shrink-0" aria-hidden="true" />}
      <div ref={setInsideRef} className={`min-w-0 flex-1 rounded ${isInsideOver ? "bg-emerald-100 ring-1 ring-emerald-400" : ""}`}>
        {editing && group ? <input autoFocus aria-label={`Nombre del grupo ${group.name}`} className="h-7 w-full min-w-0 rounded border border-emerald-300 bg-white px-1.5 text-xs outline-none ring-2 ring-emerald-100" value={nameDraft} maxLength={100} onFocus={(event) => event.currentTarget.select()} onChange={(event) => onNameDraftChange(event.target.value)} onBlur={() => onFinishRename(true)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { event.preventDefault(); onFinishRename(false); } }} /> : <button type="button" className="flex h-8 w-full min-w-0 items-center gap-1.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500" aria-pressed={selected} title={group ? "Doble clic para renombrar" : label} onClick={(event) => onSelect(event.shiftKey)} onDoubleClick={group ? onBeginRename : undefined}>{group && <Folder size={14} className="shrink-0 text-amber-600" aria-hidden="true" />}<span className="truncate">{label}</span></button>}
      </div>
      <button type="button" className={`flex h-8 w-7 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-white hover:text-zinc-800 ${row.inheritedHidden && ownVisible ? "text-amber-600" : ""}`} aria-label={`${ownVisible ? "Ocultar" : "Mostrar"} ${group ? "grupo" : "capa"} ${label}`} aria-pressed={ownVisible} title={row.inheritedHidden && ownVisible ? "Oculto por un grupo superior" : ownVisible ? "Ocultar" : "Mostrar"} onClick={onToggleVisible}>{ownVisible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
      <button type="button" className={`flex h-8 w-7 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-white hover:text-zinc-800 ${row.inheritedLocked && !ownLocked ? "text-amber-600" : ""}`} aria-label={`${ownLocked ? "Desbloquear" : "Bloquear"} ${group ? "grupo" : "capa"} ${label}`} aria-pressed={ownLocked} title={row.inheritedLocked && !ownLocked ? "Bloqueado por un grupo superior" : ownLocked ? "Desbloquear" : "Bloquear"} onClick={onToggleLocked}>{ownLocked ? <LockKeyhole size={14} /> : <Unlock size={14} />}</button>
    </div>
  </div>;
}

function RootDropZone({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "root-drop", disabled: !active });
  if (!active) return null;
  return <div ref={setNodeRef} className={`mt-2 rounded-md border border-dashed px-3 py-2 text-center text-[10px] ${isOver ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-zinc-200 text-zinc-400"}`}>Soltar en la raíz</div>;
}

function layerDndId(ref: CanvasLayerRef): string { return `layer:${ref.kind}:${ref.id}`; }
function parseLayerDndId(value: string): CanvasLayerRef | null {
  const match = /^layer:(node|group):(.+)$/.exec(value);
  return match ? { kind: match[1] as CanvasLayerRef["kind"], id: match[2] } : null;
}
function layerLabel(index: CanvasLayerIndex, ref: CanvasLayerRef): string {
  if (ref.kind === "group") return index.groupsById.get(ref.id)?.name ?? "Grupo";
  const node = index.nodesById.get(ref.id);
  return node ? getNodeLabel(node) : "Capa";
}
function getNodeLabel(node: CanvasNode): string {
  if (node.name?.trim()) return node.name.trim();
  if (node.type === "text") return node.text.trim() || "Texto vacío";
  if (node.type === "image") return node.alt.trim() || "Imagen";
  if (node.type === "shape") return ({ rect: "Rectángulo", ellipse: "Elipse", line: "Línea", arrow: "Flecha", triangle: "Triángulo", star: "Estrella" })[node.shape];
  return `Icono ${node.iconKey}`;
}

function readCollapsedGroups(storageKey: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = window.localStorage.getItem(storageKey);
    const parsed = stored ? JSON.parse(stored) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}
