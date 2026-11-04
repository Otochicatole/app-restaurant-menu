"use client";

import { Check, Link2, MoreHorizontal, Move, RotateCw, Unlink2 } from "lucide-react";
import { transientButtonProps } from "@/ui/button-state";
import { getJoinedTableGroups, type FloorPose } from "../contracts";

export type FloorAssemblyGroupingProps = {
  tables: FloorPose[]; selectedTableIds?: string[]; disabled?: boolean;
  onSelectTable?: (id: string, additive: boolean) => void;
  onSelectTableGroup?: (ids: string[]) => void;
  onJoinTables?: () => void; onSeparateTables?: () => void;
  onMoveTableGroup?: () => void; onRotateTableGroup?: () => void;
  onTableActions?: (id: string, point: { x: number; y: number }) => void;
};

const actionClass = "flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs font-semibold leading-4 text-[var(--floor-ink,#263e23)] hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-50";

export function FloorAssemblyGrouping({ tables, selectedTableIds = [], disabled = false, onSelectTable, onSelectTableGroup, onJoinTables, onSeparateTables, onMoveTableGroup, onRotateTableGroup, onTableActions }: FloorAssemblyGroupingProps) {
  const groups = getJoinedTableGroups(tables);
  const selected = new Set(selectedTableIds.filter((id) => tables.some((table) => table.tableId === id)));
  const canJoin = selected.size >= 2;
  const canSeparate = groups.some((group) => group.length > 1 && group.some((table) => selected.has(table.tableId)));
  const hasGroupActions = Boolean(onJoinTables || onSeparateTables || onMoveTableGroup || onRotateTableGroup);
  const openActions = (id: string, element: HTMLElement) => {
    const bounds = element.getBoundingClientRect();
    onTableActions?.(id, { x: bounds.left, y: bounds.bottom + 4 });
  };
  const tableCell = (table: FloorPose) => <div key={table.tableId} className={`flex min-w-0 items-center rounded-lg border bg-white ${selected.has(table.tableId) ? "border-[var(--floor-action,#3d5934)]" : "border-stone-200"}`}>
    {onSelectTable ? <button {...transientButtonProps} type="button" aria-label={`Seleccionar mesa ${table.label}`} aria-pressed={selected.has(table.tableId)} title={`Mesa ${table.label}`} disabled={disabled} onClick={() => onSelectTable(table.tableId, true)} className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium leading-4 text-[var(--floor-ink,#263e23)] hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-50"><span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected.has(table.tableId) ? "border-[var(--floor-action,#3d5934)] bg-[var(--floor-action,#3d5934)] text-white" : "border-stone-400"}`}>{selected.has(table.tableId) && <Check size={12} />}</span><span className="min-w-0 truncate">Mesa {table.label}</span></button> : <span title={`Mesa ${table.label}`} className="min-w-0 flex-1 truncate px-2 py-3 text-xs font-medium">Mesa {table.label}</span>}
    {onTableActions && <button {...transientButtonProps} type="button" aria-label={`Acciones de mesa ${table.label}`} aria-haspopup="menu" disabled={disabled} onClick={(event) => openActions(table.tableId, event.currentTarget)} onContextMenu={(event) => { event.preventDefault(); onTableActions(table.tableId, { x: event.clientX, y: event.clientY }); }} onKeyDown={(event) => { if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); openActions(table.tableId, event.currentTarget); } }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--floor-muted,#46543e)] hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-50"><MoreHorizontal size={16} /></button>}
  </div>;

  return <section aria-label="Selección y unión de mesas" className="space-y-3">
    <header className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1"><h3 className="text-sm font-semibold">Mesas del armado</h3>{(onSelectTable || hasGroupActions) && <p aria-live="polite" className="text-xs text-[var(--floor-muted,#52634b)]">{`${selected.size} ${selected.size === 1 ? "mesa seleccionada" : "mesas seleccionadas"}`}</p>}</header>
    {hasGroupActions && <div role="group" aria-label="Acciones para las mesas seleccionadas" className="grid grid-cols-2 gap-1.5">
      {onJoinTables && <button {...transientButtonProps} type="button" disabled={disabled || !canJoin} onClick={onJoinTables} className={actionClass}><Link2 size={15} className="shrink-0" /><span className="min-w-0">Unir seleccionadas</span></button>}
      {onSeparateTables && <button {...transientButtonProps} type="button" disabled={disabled || !canSeparate} onClick={onSeparateTables} className={actionClass}><Unlink2 size={15} className="shrink-0" /><span className="min-w-0">Separar seleccionadas</span></button>}
      {onMoveTableGroup && <button {...transientButtonProps} type="button" disabled={disabled || !canJoin} onClick={onMoveTableGroup} className={actionClass}><Move size={15} className="shrink-0" /><span className="min-w-0">Mover grupo</span></button>}
      {onRotateTableGroup && <button {...transientButtonProps} type="button" disabled={disabled || !canJoin} onClick={onRotateTableGroup} className={actionClass}><RotateCw size={15} className="shrink-0" /><span className="min-w-0">Girar grupo 90°</span></button>}
    </div>}
    <ul className="grid grid-cols-2 gap-x-2 gap-y-2">
      {groups.map((group) => {
        const ids = group.map((table) => table.tableId);
        const labels = group.map((table) => table.label).join(" + ");
        const joined = group.length > 1;
        return <li key={ids[0]} className={joined ? "col-span-2 min-w-0 border-b border-stone-200 pb-2 last:border-b-0 last:pb-0" : "min-w-0"}>
          {joined && <div className="flex min-h-11 min-w-0 items-center justify-between gap-2">
            <span title={`Unidas: ${labels}`} className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-xs font-medium text-[var(--floor-action,#2d603f)]"><Link2 size={14} className="shrink-0" /><span className="min-w-0 truncate">Unidas: {labels}</span></span>
            {onSelectTableGroup && <button {...transientButtonProps} type="button" aria-label={`Seleccionar grupo ${labels}`} aria-pressed={ids.every((id) => selected.has(id))} disabled={disabled} onClick={() => onSelectTableGroup(ids)} className="min-h-11 shrink-0 rounded-lg px-1 text-xs font-semibold text-[var(--floor-ink,#263e23)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-50">Seleccionar grupo</button>}
          </div>}
          <div className={joined ? "grid grid-cols-2 gap-2" : undefined}>{group.map(tableCell)}</div>
        </li>;
      })}
    </ul>
  </section>;
}
