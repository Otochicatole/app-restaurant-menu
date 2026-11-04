"use client";

import { useRef, useState } from "react";
import { ChevronDown, Circle, Layers3, Loader2, MapPin, Minus, Plus, RectangleHorizontal, RefreshCw, RotateCw, SlidersHorizontal, Square } from "lucide-react";
import { FloatingModalWindow } from "@/ui/FloatingModalWindow";
import { transientButtonProps } from "@/ui/button-state";
import { floorPrimaryButtonClass as adminPrimaryButtonClass, floorSecondaryButtonClass as adminSecondaryButtonClass } from "./floor-ui";
import type { FloorRotation } from "../contracts";
import { floorInputClass } from "./floor-api";
import { groupInventoryTables, selectTableGroupQuantity } from "./floor-table-groups";
import type { FloorAssemblyController } from "./useFloorAssembly";
import { FloorAssemblyGrouping, type FloorAssemblyGroupingProps } from "./FloorAssemblyGrouping";

export type FloorAssemblyControlsProps = Pick<FloorAssemblyGroupingProps, "selectedTableIds" | "onSelectTable" | "onSelectTableGroup" | "onJoinTables" | "onSeparateTables" | "onMoveTableGroup" | "onRotateTableGroup"> & {
  controller: FloorAssemblyController; partySize: number; customerName?: string; durationMinutes?: number;
  saving?: boolean; suspended?: boolean; conflict?: string | null; error?: string | null;
  interactionLocked?: boolean;
  floatingWindow?: { visible: boolean; zIndex: number; offset: number; activation: number; onFocus: () => void; onHide: () => void };
  confirmLabel?: string; editDataLabel?: string;
  onTableActions?: (id: string, point: { x: number; y: number }) => void;
  onConfirm: () => void; onCancel: () => void; onEditData: () => void; onChooseRoom: () => void;
};

const quietAction = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-[var(--floor-muted,#46543e)] transition-colors hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-50";
const stepperAction = "flex h-11 w-9 shrink-0 items-center justify-center rounded-md text-[var(--floor-ink,#263e23)] hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-35";

export function FloorAssemblyControls({ controller, partySize, customerName, durationMinutes, saving = false, suspended = false, interactionLocked = false, floatingWindow, conflict, error, confirmLabel = "Armar y ocupar mesas", editDataLabel = "Editar datos", onTableActions, selectedTableIds, onSelectTable, onSelectTableGroup, onJoinTables, onSeparateTables, onMoveTableGroup, onRotateTableGroup, onConfirm, onCancel, onEditData, onChooseRoom }: FloorAssemblyControlsProps) {
  const [windowOpen, setWindowOpen] = useState(true);
  const tool = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const { room, location, locationId, selected, value, capacity, options, loading } = controller;
  const selectedIds = selected.map((pose) => pose.tableId);
  const availableIds = new Set((room?.tables ?? []).filter((table) => {
    const option = options?.options.find((candidate) => candidate.roomId === room?.id && candidate.id === `table:${table.id}`);
    return table.active && (option?.resourceAvailable ?? option?.available ?? false);
  }).map((table) => table.id));
  const inventoryGroups = groupInventoryTables(room?.tables.filter((table) => table.active || selectedIds.includes(table.id)) ?? []);
  const totalSeats = selected.reduce((sum, pose) => sum + pose.capacity, 0);
  const unavailable = selected.find((pose) => !availableIds.has(pose.tableId));
  const capacityError = !selected.length ? null : capacity < partySize ? `Este armado ofrece ${capacity} lugares para ${partySize} personas.` : capacity > totalSeats ? "Los lugares útiles superan la capacidad de las mesas elegidas." : null;
  const selectionError = options && unavailable ? `La mesa ${unavailable.label} ya no está disponible. Elegí otra mesa o actualizá.` : null;
  const problem = conflict || selectionError || capacityError;
  const canConfirm = Boolean(options && value && room && location && selected.length && capacity >= partySize && capacity <= totalSeats && !problem && !error && !controller.error && !loading && !saving && !interactionLocked);
  const fieldDisabled = saving || loading || interactionLocked;
  const message = problem || error || controller.error || (interactionLocked ? "Aplicá o cancelá la edición de las mesas para continuar el armado." : null);
  const closeWindow = () => { if (floatingWindow) floatingWindow.onHide(); else { setWindowOpen(false); window.requestAnimationFrame(() => launcher.current?.focus()); } };
  const restoreWindow = () => { setWindowOpen(true); window.requestAnimationFrame(() => tool.current?.querySelector<HTMLButtonElement>('[role="complementary"] button:not(:disabled)')?.focus()); };

  return <div ref={tool}>
    <FloatingModalWindow id="floor-assembly" title="Armar mesas" subtitle={`${customerName?.trim() || "Sin reserva"} · ${partySize} personas${durationMinutes ? ` · ${durationMinutes} min` : ""}`} icon={<Layers3 size={17} className="text-[var(--floor-action,#3d5934)]" />} role="complementary" ariaLabel="Armar mesas en sala" isOpen={(floatingWindow?.visible ?? windowOpen) && !suspended} keepMounted onClose={closeWindow} closeDisabled={saving} initialAnchor="right" initialOffset={floatingWindow?.offset} activation={floatingWindow?.activation} onFocus={floatingWindow?.onFocus} viewportInset={{ bottom: 100 }} initialPosition={{ x: 0, y: 112 }} initialSize={{ width: 400, height: 640 }} minWidth={320} minHeight={360} zIndex={floatingWindow?.zIndex ?? 30}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3 text-[var(--floor-ink,#263e23)] [scrollbar-width:thin] [scrollbar-color:var(--floor-scrollbar,#c6cec0)_transparent]">
        <section aria-label="Ubicación del armado" className="space-y-2">
          <div className="flex min-h-9 items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5 text-xs font-semibold"><MapPin size={14} className="shrink-0 text-[var(--floor-muted,#607054)]" /><span className="truncate">{room?.name ?? "Elegí un salón"}</span></span><button {...transientButtonProps} type="button" disabled={saving} onClick={onChooseRoom} className={quietAction}>Cambiar salón</button></div>
          <label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Sector del salón<select className={`${floorInputClass} min-h-11`} value={locationId} disabled={!room || !options || fieldDisabled} onChange={(event) => controller.selectLocation(event.target.value)}><option value="">Elegí un sector</option>{room?.locations.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {loading && <p role="status" className="flex items-center gap-2 text-xs text-[var(--floor-muted,#52634b)]"><Loader2 size={13} className="animate-spin" />Consultando disponibilidad…</p>}
          {room && !room.locations.some((item) => item.active) && <p className="text-xs leading-relaxed text-amber-900">Este salón necesita un sector activo antes de armar mesas.</p>}
        </section>

        <fieldset disabled={!location || !options || fieldDisabled} className="min-w-0 space-y-1 disabled:opacity-50"><legend className="mb-2 text-xs font-semibold">Mesas del inventario</legend>{inventoryGroups.map((group) => {
          const chosen = group.tables.filter((table) => selectedIds.includes(table.id)).length;
          const free = group.tables.filter((table) => availableIds.has(table.id) && !selectedIds.includes(table.id)).length;
          const maximum = Math.max(0, Math.min(chosen + free, 40 - (selectedIds.length - chosen)));
          const Shape = group.shape === "CIRCLE" ? Circle : group.shape === "RECTANGLE" ? RectangleHorizontal : Square;
          const changeQuantity = (quantity: number) => { if (quantity > maximum) return; const ids = selectTableGroupQuantity(group, selectedIds, quantity, availableIds); if (ids) controller.setTableIds(ids); };
          return <div key={group.key} className={`flex min-h-16 min-w-0 items-center justify-between gap-2 rounded-lg px-2 py-2 ${chosen ? "bg-[var(--floor-hover,#f1f5ed)]" : "bg-stone-50"}`}>
            <div className="flex min-w-0 items-center gap-2"><Shape size={22} strokeWidth={1.5} className="shrink-0 text-[var(--floor-muted,#607054)]" /><div className="min-w-0"><p className="truncate text-xs font-semibold" title={group.label}>{group.label}</p><p className="mt-1 text-[11px] leading-tight text-[var(--floor-muted,#52634b)]">{options ? `${free} disponibles · ${chosen} elegidas` : "Disponibilidad sin validar"}</p></div></div>
            <div role="group" aria-label={`Cantidad de ${group.label}`} className="flex shrink-0 items-center rounded-lg bg-white p-0.5">
              <button {...transientButtonProps} type="button" aria-label={`Quitar una mesa ${group.label}`} disabled={chosen <= 0} onClick={() => changeQuantity(chosen - 1)} className={stepperAction}><Minus size={14} /></button>
              <input aria-label={`Cantidad de ${group.label}`} type="number" min={0} max={maximum} step={1} value={chosen} disabled={!chosen && !maximum} className="h-11 w-10 rounded-md border-0 bg-transparent text-center text-sm font-semibold tabular-nums text-[var(--floor-ink,#263e23)] outline-none focus-visible:ring-2 focus-visible:ring-[#3d5934] disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" onChange={(event) => { if (event.target.value.trim()) changeQuantity(Number(event.target.value)); }} />
              <button {...transientButtonProps} type="button" aria-label={`Agregar una mesa ${group.label}`} disabled={chosen >= maximum} onClick={() => changeQuantity(chosen + 1)} className={stepperAction}><Plus size={14} /></button>
            </div>
          </div>;
        })}{room && !inventoryGroups.length && <p className="py-2 text-xs text-[var(--floor-muted,#52634b)]">No hay mesas activas en el inventario.</p>}</fieldset>

        {options?.options.some((option) => option.roomId === room?.id && option.id.startsWith("combination:")) && <details className="group"><summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-xs font-medium text-[var(--floor-muted,#46543e)]">Armados predefinidos<ChevronDown size={14} className="group-open:rotate-180" /></summary><div className="space-y-1 pb-2">{options.options.filter((option) => option.roomId === room?.id && option.id.startsWith("combination:")).map((option) => <button key={option.id} {...transientButtonProps} type="button" disabled={!location || !option.available || fieldDisabled} title={option.conflict} onClick={() => controller.selectOption(option)} className="min-h-11 w-full rounded-lg px-2 py-2 text-left text-xs hover:bg-[var(--floor-hover,#edf2e9)] disabled:opacity-50">{option.label}</button>)}</div></details>}

        {selected.length > 0 && value && <section aria-label="Posición del armado" className="space-y-3 border-t border-stone-200 pt-3">
          <FloorAssemblyGrouping tables={selected} selectedTableIds={selectedTableIds} disabled={fieldDisabled} onSelectTable={onSelectTable} onSelectTableGroup={onSelectTableGroup} onJoinTables={onJoinTables} onSeparateTables={onSeparateTables} onMoveTableGroup={onMoveTableGroup} onRotateTableGroup={onRotateTableGroup} onTableActions={onTableActions} />
          <details className="group"><summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-xs font-medium text-[var(--floor-muted,#52634b)]"><SlidersHorizontal size={14} />Ajustes del armado<ChevronDown size={14} className="ml-auto group-open:rotate-180" /></summary>
            <div className="space-y-3 pb-1 pt-2"><button {...transientButtonProps} type="button" disabled={fieldDisabled} onClick={controller.rotate} className={`${adminSecondaryButtonClass} min-h-11 w-full text-xs`}><RotateCw size={14} />Girar armado 90°</button>
              <div className="grid grid-cols-2 gap-3">{(["x", "y"] as const).map((axis) => <label key={axis} className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Centro {axis.toUpperCase()}<input type="number" step="any" value={value[axis]} disabled={fieldDisabled} className={floorInputClass} onChange={(event) => { const coordinate = Number(event.target.value); if (Number.isFinite(coordinate)) controller.move(axis === "x" ? coordinate - value.x : 0, axis === "y" ? coordinate - value.y : 0); }} /></label>)}</div>
              <label className="grid gap-1 text-xs font-medium text-[var(--floor-muted,#46543e)]">Lugares útiles<input type="number" min={1} max={totalSeats} step={1} value={capacity} disabled={fieldDisabled} className={floorInputClass} onChange={(event) => controller.setCapacity(Number(event.target.value))} /></label>
              <p className="text-[11px] leading-relaxed text-[var(--floor-muted,#52634b)]">Ajustá el cupo real si la unión ocupa lugares.</p>
              <details><summary className="min-h-9 cursor-pointer py-2 text-xs font-semibold">Ajustar cada mesa</summary><div className="space-y-3 pt-2">{selected.map((pose) => <div key={pose.tableId} className="space-y-2"><span className="text-xs font-semibold">Mesa {pose.label}</span><div className="grid grid-cols-[1fr_1fr_2.75rem] items-end gap-2">{(["x", "y"] as const).map((axis) => <label key={axis} className="grid min-w-0 gap-1 text-xs text-[var(--floor-muted,#46543e)]">{axis.toUpperCase()}<input aria-label={`Mesa ${pose.label} ${axis.toUpperCase()}`} type="number" step="any" value={pose[axis]} disabled={fieldDisabled} className={floorInputClass} onChange={(event) => controller.updateTable(pose.tableId, { [axis]: Number(event.target.value) })} /></label>)}<button {...transientButtonProps} type="button" aria-label={`Girar mesa ${pose.label}`} disabled={fieldDisabled} onClick={() => controller.updateTable(pose.tableId, { rotation: ((pose.rotation + 90) % 360) as FloorRotation })} className="flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 hover:bg-[var(--floor-hover,#edf2e9)] disabled:opacity-50"><RotateCw size={16} /></button></div></div>)}</div></details>
            </div>
          </details>
        </section>}
      </div>

      <footer className="shrink-0 space-y-2 border-t border-stone-200 bg-white px-4 pb-3 pt-2 text-[var(--floor-ink,#263e23)]">
        {message && <p role="alert" className="rounded-md bg-red-50 px-2.5 py-2 text-xs leading-relaxed text-red-800">{message}</p>}
        {!selected.length && !message && <p className="text-[11px] leading-relaxed text-[var(--floor-muted,#52634b)]">Elegí un sector y agregá las mesas que vas a usar.</p>}
        <div className="flex items-center justify-between gap-2"><button {...transientButtonProps} type="button" disabled={saving || loading} onClick={controller.refresh} className={`${quietAction} -ml-2`}><RefreshCw size={13} className={loading ? "animate-spin" : ""} />Actualizar</button><button {...transientButtonProps} type="button" disabled={saving} onClick={onEditData} className={`${quietAction} -mr-2`}>{editDataLabel}</button></div>
        <div className="grid grid-cols-[auto_1fr] gap-2"><button {...transientButtonProps} type="button" disabled={saving} onClick={onCancel} className={`${adminSecondaryButtonClass} min-h-11 px-3 text-xs`}>Cancelar</button><button {...transientButtonProps} type="button" aria-label={confirmLabel} disabled={!canConfirm} onClick={onConfirm} className={`${adminPrimaryButtonClass} min-h-11 px-3 text-xs`}>{saving ? <><Loader2 size={15} className="animate-spin" />Guardando…</> : confirmLabel === "Armar y ocupar mesas" ? "Ocupar mesas" : confirmLabel}</button></div>
      </footer>
    </FloatingModalWindow>
    {!floatingWindow && !windowOpen && !suspended && <button {...transientButtonProps} ref={launcher} type="button" aria-label="Abrir armado de mesas" onClick={restoreWindow} className="fixed bottom-24 right-4 z-30 flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[var(--floor-ink,#263e23)] shadow-[0_6px_24px_-8px_rgba(24,38,24,0.24)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)]"><Layers3 size={17} />Armar mesas{selected.length > 0 && <span className="text-xs font-normal tabular-nums text-[var(--floor-muted,#52634b)]">· {selected.length}</span>}</button>}
  </div>;
}
