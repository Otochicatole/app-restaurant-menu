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

const actionClass = "flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-stone-200 px-2 py-2 text-xs font-semibold text-[#263e23] hover:bg-[#edf2e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934] disabled:cursor-not-allowed disabled:opacity-50";

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

  return <section aria-label="Selección y unión de mesas" className="space-y-3">
    <div><h3 className="text-xs font-semibold">Mesas del armado</h3>{onSelectTable && <p className="mt-1 text-xs leading-relaxed text-[#52634b]">Elegí las mesas que querés unir o acomodar juntas.</p>}</div>
    <ul className="divide-y divide-stone-200">
      {groups.map((group) => {
        const ids = group.map((table) => table.tableId);
        const labels = group.map((table) => table.label).join(" + ");
        const joined = group.length > 1;
        return <li key={ids[0]} className="space-y-1 py-2 first:pt-0 last:pb-0">
          {joined && <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-[#edf2e9] px-2 py-1 text-xs font-semibold text-[#2d603f]"><Link2 size={13} className="shrink-0" /><span className="min-w-0 break-words">Unidas: {labels}</span></span>
            {onSelectTableGroup && <button {...transientButtonProps} type="button" aria-label={`Seleccionar grupo ${labels}`} aria-pressed={ids.every((id) => selected.has(id))} disabled={disabled} onClick={() => onSelectTableGroup(ids)} className="min-h-11 shrink-0 text-xs font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934] disabled:cursor-not-allowed disabled:opacity-50">Seleccionar grupo</button>}
          </div>}
          {group.map((table) => <div key={table.tableId} className="flex min-w-0 items-center gap-1">
            {onSelectTable ? <button {...transientButtonProps} type="button" aria-label={`Seleccionar mesa ${table.label}`} aria-pressed={selected.has(table.tableId)} disabled={disabled} onClick={() => onSelectTable(table.tableId, true)} className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-[#edf2e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934] disabled:cursor-not-allowed disabled:opacity-50 ${selected.has(table.tableId) ? "bg-[#edf2e9] text-[#263e23]" : "text-[#46543e]"}`}><span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected.has(table.tableId) ? "border-[#3d5934] bg-[#3d5934] text-white" : "border-stone-400"}`}>{selected.has(table.tableId) && <Check size={12} />}</span><span className="min-w-0 break-words">Mesa {table.label}</span></button> : <span className="min-w-0 flex-1 break-words py-2 text-xs font-medium">Mesa {table.label}</span>}
            {onTableActions && <button {...transientButtonProps} type="button" aria-label={`Acciones de mesa ${table.label}`} aria-haspopup="menu" disabled={disabled} onClick={(event) => openActions(table.tableId, event.currentTarget)} onContextMenu={(event) => { event.preventDefault(); onTableActions(table.tableId, { x: event.clientX, y: event.clientY }); }} onKeyDown={(event) => { if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); openActions(table.tableId, event.currentTarget); } }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-[#edf2e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934] disabled:cursor-not-allowed disabled:opacity-50"><MoreHorizontal size={16} /></button>}
          </div>)}
        </li>;
      })}
    </ul>
    {hasGroupActions && <div className="space-y-2">
      <p aria-live="polite" className="text-xs text-[#52634b]">{selected.size ? `${selected.size} ${selected.size === 1 ? "mesa seleccionada" : "mesas seleccionadas"}` : "Seleccioná una o varias mesas."}</p>
      <div role="group" aria-label="Acciones para las mesas seleccionadas" className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        {onJoinTables && <button {...transientButtonProps} type="button" disabled={disabled || !canJoin} onClick={onJoinTables} className={actionClass}><Link2 size={15} className="shrink-0" /><span>Unir seleccionadas</span></button>}
        {onSeparateTables && <button {...transientButtonProps} type="button" disabled={disabled || !canSeparate} onClick={onSeparateTables} className={actionClass}><Unlink2 size={15} className="shrink-0" /><span>Separar seleccionadas</span></button>}
        {onMoveTableGroup && <button {...transientButtonProps} type="button" disabled={disabled || !canJoin} onClick={onMoveTableGroup} className={actionClass}><Move size={15} className="shrink-0" /><span>Mover grupo</span></button>}
        {onRotateTableGroup && <button {...transientButtonProps} type="button" disabled={disabled || !canJoin} onClick={onRotateTableGroup} className={actionClass}><RotateCw size={15} className="shrink-0" /><span>Girar grupo 90°</span></button>}
      </div>
    </div>}
  </section>;
}
