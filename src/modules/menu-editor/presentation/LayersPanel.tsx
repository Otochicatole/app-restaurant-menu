"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
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
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Eye,
  EyeOff,
  Folder,
  FolderPlus,
  Layers2,
  LockKeyhole,
  Search,
  Unlock,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { CanvasDocumentV1, CanvasGroup, CanvasNode } from "../contracts";
import {
  descendantGroupIds,
  layerTreeRows,
  type CanvasLayerIndex,
  type CanvasLayerMoveDestination,
  type CanvasLayerRef,
  type CanvasLayerRow,
} from "../domain/layer-tree";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [activeRef, setActiveRef] = useState<CanvasLayerRef | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedGroup = selectedGroupId ? layerIndex.groupsById.get(selectedGroupId) ?? null : null;
  const selectedGroupLocked = selectedGroup ? layerIndex.groupStates.get(selectedGroup.id)?.effectiveLocked ?? true : false;

  const allGroupIds = useMemo(() => document.groups.map((group) => group.id), [document.groups]);
  const hasGroups = allGroupIds.length > 0;
  const allAreCollapsed = hasGroups && allGroupIds.every((id) => collapsed.has(id));

  const toggleAllGroups = () => {
    if (!hasGroups) return;
    if (allAreCollapsed) {
      setCollapsed(new Set());
    } else {
      setCollapsed(new Set(allGroupIds));
    }
  };

  const displayedCollapsed = useMemo(() => {
    const next = new Set(collapsed);
    if (allAreCollapsed) {
      return next;
    }
    const visited = new Set<string>();
    let current = selectedGroupId ? layerIndex.groupsById.get(selectedGroupId)?.parentGroupId ?? null : null;
    while (current && !visited.has(current)) {
      visited.add(current);
      next.delete(current);
      current = layerIndex.groupsById.get(current)?.parentGroupId ?? null;
    }
    return next;
  }, [allAreCollapsed, collapsed, layerIndex, selectedGroupId]);

  const normalizedQuery = normalizeSearchText(searchQuery);

  const { visibleNodeIds, visibleGroupIds, matchCount } = useMemo(() => {
    if (!normalizedQuery) {
      return { visibleNodeIds: null, visibleGroupIds: null, matchCount: 0 };
    }

    const vNodeIds = new Set<string>();
    const vGroupIds = new Set<string>();
    let count = 0;

    for (const node of document.nodes) {
      if (matchesNode(node, normalizedQuery)) {
        count++;
        vNodeIds.add(node.id);
        let parentId = node.groupId;
        while (parentId) {
          vGroupIds.add(parentId);
          parentId = layerIndex.groupsById.get(parentId)?.parentGroupId ?? null;
        }
      }
    }

    for (const group of document.groups) {
      if (matchesGroup(group, normalizedQuery)) {
        count++;
        vGroupIds.add(group.id);
        let parentId = group.parentGroupId;
        while (parentId) {
          vGroupIds.add(parentId);
          parentId = layerIndex.groupsById.get(parentId)?.parentGroupId ?? null;
        }
        for (const nid of layerIndex.descendantNodeIds(group.id)) {
          vNodeIds.add(nid);
        }
        for (const gid of descendantGroupIds(document, group.id, false)) {
          vGroupIds.add(gid);
        }
      }
    }

    return { visibleNodeIds: vNodeIds, visibleGroupIds: vGroupIds, matchCount: count };
  }, [normalizedQuery, document, layerIndex]);

  const rows = useMemo(() => {
    if (!normalizedQuery) {
      return layerTreeRows(document, displayedCollapsed, layerIndex);
    }
    const allRows = layerTreeRows(document, new Set(), layerIndex);
    return allRows.filter((row) => {
      if (row.ref.kind === "node") {
        return visibleNodeIds?.has(row.ref.id);
      }
      return visibleGroupIds?.has(row.ref.id);
    });
  }, [document, displayedCollapsed, layerIndex, normalizedQuery, visibleNodeIds, visibleGroupIds]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const collisionDetection = useMemo<CollisionDetection>(() => (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
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
    const target = parseLayerDndId(overId);
    if (!target) return;
    if (target.kind === "group" && active.id !== target.id) {
      const overRect = event.over.rect;
      const translated = event.active.rect.current.translated;
      const activeCenter = translated ? translated.top + translated.height / 2 : overRect.top + overRect.height / 2;
      const relativeRatio = (activeCenter - overRect.top) / overRect.height;
      if (relativeRatio >= 0.25 && relativeRatio <= 0.75) {
        onMove(active, { type: "inside", groupId: target.id });
        return;
      }
    }
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
            <p className="mt-1 text-[10px] text-zinc-400">
              {normalizedQuery ? "Filtrando por nombre de capa o grupo" : "Arrastrá para reordenar o anidar"}
            </p>
          </div>
          {normalizedQuery ? (
            <span className="rounded-full bg-[#253621]/10 px-2 py-0.5 text-[10px] font-semibold text-[#182618]">
              {matchCount} {matchCount === 1 ? "resultado" : "resultados"}
            </span>
          ) : (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
              {document.nodes.length}
            </span>
          )}
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          <div className="relative min-w-0 flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" aria-hidden="true" />
            <input
              id="layers-search-input"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setSearchQuery("");
                }
              }}
              placeholder="Buscar capas..."
              className="h-8 w-full rounded-lg border border-zinc-200 bg-zinc-50/70 pl-8 pr-7 text-xs text-zinc-800 placeholder:text-zinc-400 transition focus:border-[#253621]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#253621]/15 [&::-webkit-search-cancel-button]:hidden"
              aria-label="Buscar capas"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                aria-label="Borrar búsqueda"
                title="Borrar búsqueda"
              >
                <X size={13} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            id="layers-toggle-all-groups"
            disabled={!hasGroups}
            onClick={toggleAllGroups}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
            title={hasGroups ? (allAreCollapsed ? "Expandir todas las carpetas" : "Contraer todas las carpetas") : "No hay carpetas de capas"}
            aria-label={hasGroups ? (allAreCollapsed ? "Expandir todas las carpetas" : "Contraer todas las carpetas") : "No hay carpetas de capas"}
          >
            {allAreCollapsed ? <ChevronsUpDown size={15} aria-hidden="true" /> : <ChevronsDownUp size={15} aria-hidden="true" />}
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40" disabled={selectedGroupLocked} onClick={onCreateGroup}><FolderPlus size={14} aria-hidden="true" />Nuevo grupo</button>
          <button type="button" className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40" disabled={selectedGroupLocked || (!selectedIds.length && !selectedGroupId)} onClick={onGroupSelection}><Layers2 size={14} aria-hidden="true" />Agrupar</button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {!document.nodes.length && !document.groups.length ? (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-5 text-center text-xs leading-5 text-zinc-400">
            Todavía no hay capas ni grupos.
          </p>
        ) : normalizedQuery && !rows.length ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 px-3 py-8 text-center">
            <Search size={22} className="text-zinc-300" aria-hidden="true" />
            <p className="mt-2 text-xs font-semibold text-zinc-700">No se encontraron capas</p>
            <p className="mt-1 text-[11px] text-zinc-400">
              No hay capas ni grupos que coincidan con &ldquo;{searchQuery.trim()}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-3 inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <X size={12} aria-hidden="true" />
              Limpiar búsqueda
            </button>
          </div>
        ) : !rows.length ? (
          <p className="rounded-lg border border-dashed border-zinc-200 px-3 py-5 text-center text-xs leading-5 text-zinc-400">
            Todavía no hay capas visibles.
          </p>
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
                    collapsed={group ? (normalizedQuery ? false : displayedCollapsed.has(group.id)) : false}
                    editing={group?.id === (editingGroupId ?? renameGroupId)}
                    activeRef={activeRef}
                    searchQuery={searchQuery}
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
            <RootDropZone active={Boolean(activeRef && !normalizedQuery)} />
            <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
              {activeRef ? (
                <div className="flex h-8 w-full min-w-0 select-none items-center gap-1.5 rounded-lg border border-[#253621]/30 bg-white px-2.5 text-xs font-medium text-[#182618] shadow-2xl ring-2 ring-[#253621]/20 cursor-grabbing">
                  {activeRef.kind === "group" ? (
                    <Folder size={14} className="shrink-0 text-amber-600" aria-hidden="true" />
                  ) : (
                    <Layers2 size={14} className="shrink-0 text-[#253621]" aria-hidden="true" />
                  )}
                  <span className="truncate">{activeLabel}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
      {selectedGroupId && <footer className="shrink-0 border-t border-zinc-100 p-2"><button type="button" disabled={selectedGroupLocked} className="w-full rounded-lg px-3 py-2 text-xs font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-40" onClick={() => onUngroup(selectedGroupId)}>Desagrupar y conservar capas</button></footer>}
    </aside>
  );
}

function SortableLayerRow({ row, node, group, selected, collapsed, editing, activeRef, searchQuery, nameDraft, onNameDraftChange, onFinishRename, onBeginRename, onToggleCollapsed, onSelect, onToggleVisible, onToggleLocked }: {
  row: CanvasLayerRow;
  node?: CanvasNode;
  group?: CanvasGroup;
  selected: boolean;
  collapsed: boolean;
  editing: boolean;
  activeRef: CanvasLayerRef | null;
  searchQuery: string;
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
  const isSearching = Boolean(searchQuery.trim());
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: layerDndId(ref),
    disabled: row.effectiveLocked || editing || isSearching,
  });
  const indent = Math.min(72, row.depth * 14);
  const isTargetGroup = Boolean(group && activeRef && isOver && activeRef.id !== group.id);

  return (
    <div
      ref={setNodeRef}
      role="treeitem"
      aria-level={row.depth + 1}
      aria-selected={selected}
      aria-expanded={group ? !collapsed : undefined}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? undefined : transition,
        paddingLeft: indent,
      }}
      className={`relative ${isDragging ? "z-20 opacity-25" : ""}`}
    >
      {row.depth > 0 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 opacity-70"
          style={{
            width: indent,
            backgroundImage: "repeating-linear-gradient(to right, transparent 0, transparent 12px, #e4e4e7 13px, transparent 14px)",
          }}
        />
      )}
      <div
        className={`group/row flex min-w-0 items-center rounded-lg border transition-colors ${
          isTargetGroup
            ? "border-[#253621]/40 bg-[#253621]/15 text-[#182618] ring-1 ring-[#253621]/30 font-medium"
            : selected
            ? "border-[#253621]/20 bg-[#253621]/8 text-[#182618] font-medium"
            : "border-transparent text-zinc-700 hover:border-zinc-100 hover:bg-zinc-50"
        } ${!row.effectiveVisible ? "opacity-55" : ""}`}
      >
        {group ? (
          <button
            type="button"
            className="flex h-8 w-6 shrink-0 items-center justify-center text-zinc-400 hover:text-zinc-700"
            aria-label={collapsed ? `Expandir grupo ${label}` : `Contraer grupo ${label}`}
            onClick={onToggleCollapsed}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        ) : (
          <span className="w-3 shrink-0" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1">
          {editing && group ? (
            <input
              autoFocus
              aria-label={`Nombre del grupo ${group.name}`}
              className="h-7 w-full min-w-0 rounded border border-[#253621]/40 bg-white px-1.5 text-xs outline-none ring-2 ring-[#253621]/15"
              value={nameDraft}
              maxLength={100}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => onNameDraftChange(event.target.value)}
              onBlur={() => onFinishRename(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  event.preventDefault();
                  onFinishRename(false);
                }
              }}
            />
          ) : (
            <button
              type="button"
              disabled={row.effectiveLocked}
              className={`flex h-8 w-full min-w-0 select-none touch-none items-center gap-1.5 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#253621] ${
                row.effectiveLocked
                  ? "cursor-default disabled:opacity-50"
                  : isSearching
                  ? "cursor-pointer"
                  : "cursor-grab active:cursor-grabbing"
              }`}
              title={
                group
                  ? isSearching
                    ? group.name
                    : "Doble clic para renombrar · Mantené apretado para mover"
                  : isSearching
                  ? label
                  : `${label} · Mantené apretado para mover`
              }
              onClick={(event) => onSelect(event.shiftKey)}
              onDoubleClick={group ? onBeginRename : undefined}
              {...(!isSearching ? attributes : {})}
              {...(!isSearching ? listeners : {})}
            >
              {group && <Folder size={14} className="shrink-0 text-amber-600" aria-hidden="true" />}
              <span className="truncate">{highlightMatch(label, searchQuery)}</span>
            </button>
          )}
        </div>
        <button
          type="button"
          className={`flex h-8 w-7 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-white hover:text-zinc-800 ${
            row.inheritedHidden && ownVisible ? "text-amber-600" : ""
          }`}
          aria-label={`${ownVisible ? "Ocultar" : "Mostrar"} ${group ? "grupo" : "capa"} ${label}`}
          aria-pressed={ownVisible}
          title={row.inheritedHidden && ownVisible ? "Oculto por un grupo superior" : ownVisible ? "Ocultar" : "Mostrar"}
          onClick={onToggleVisible}
        >
          {ownVisible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
        <button
          type="button"
          className={`flex h-8 w-7 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-white hover:text-zinc-800 ${
            row.inheritedLocked && !ownLocked ? "text-amber-600" : ""
          }`}
          aria-label={`${ownLocked ? "Desbloquear" : "Bloquear"} ${group ? "grupo" : "capa"} ${label}`}
          aria-pressed={ownLocked}
          title={row.inheritedLocked && !ownLocked ? "Bloqueado por un grupo superior" : ownLocked ? "Desbloquear" : "Bloquear"}
          onClick={onToggleLocked}
        >
          {ownLocked ? <LockKeyhole size={14} /> : <Unlock size={14} />}
        </button>
      </div>
    </div>
  );
}

function RootDropZone({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "root-drop", disabled: !active });
  if (!active) return null;
  return <div ref={setNodeRef} className={`mt-2 rounded-lg border border-dashed px-3 py-2 text-center text-[10px] ${isOver ? "border-[#253621]/40 bg-[#253621]/10 text-[#182618]" : "border-zinc-200 text-zinc-400"}`}>Soltar en la raíz</div>;
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

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function matchesNode(node: CanvasNode, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  if (normalizeSearchText(getNodeLabel(node)).includes(normalizedQuery)) return true;
  if (node.name && normalizeSearchText(node.name).includes(normalizedQuery)) return true;
  if (node.type === "text" && normalizeSearchText(node.text).includes(normalizedQuery)) return true;
  if (node.type === "image" && normalizeSearchText(node.alt).includes(normalizedQuery)) return true;
  if (node.type === "icon" && normalizeSearchText(node.iconKey).includes(normalizedQuery)) return true;
  if (node.type === "shape" && normalizeSearchText(node.shape).includes(normalizedQuery)) return true;
  return false;
}

function matchesGroup(group: CanvasGroup, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  return normalizeSearchText(group.name).includes(normalizedQuery);
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const normQuery = normalizeSearchText(trimmed);
  if (!normQuery) return text;
  const normText = normalizeSearchText(text);
  const matchIndex = normText.indexOf(normQuery);
  if (matchIndex === -1) return text;

  let startInOrig = -1;
  let endInOrig = -1;
  let normPos = 0;
  for (let i = 0; i < text.length; i++) {
    const charNorm = normalizeSearchText(text[i]);
    if (normPos >= matchIndex && startInOrig === -1) {
      startInOrig = i;
    }
    normPos += charNorm.length;
    if (normPos >= matchIndex + normQuery.length && endInOrig === -1) {
      endInOrig = i + 1;
      break;
    }
  }

  if (startInOrig !== -1 && endInOrig !== -1 && endInOrig > startInOrig) {
    const before = text.slice(0, startInOrig);
    const match = text.slice(startInOrig, endInOrig);
    const after = text.slice(endInOrig);
    return (
      <>
        {before}
        <mark className="rounded-sm bg-amber-200/90 px-0.5 font-medium text-zinc-900">{match}</mark>
        {after}
      </>
    );
  }

  return text;
}
