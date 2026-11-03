"use client";

import { useId, useState } from "react";
import { ChevronDown, Loader2, RefreshCw, RotateCw } from "lucide-react";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import type { FloorRotation } from "../contracts";
import { floorInputClass } from "./floor-api";
import type { FloorAssemblyController } from "./useFloorAssembly";

export type FloorAssemblyControlsProps = {
  controller: FloorAssemblyController; partySize: number; customerName?: string; durationMinutes?: number;
  saving?: boolean; conflict?: string | null; error?: string | null;
  onConfirm: () => void; onCancel: () => void; onEditData: () => void; onChooseRoom: () => void;
};

export function FloorAssemblyControls({ controller, partySize, customerName, durationMinutes, saving = false, conflict, error, onConfirm, onCancel, onEditData, onChooseRoom }: FloorAssemblyControlsProps) {
  const [expanded, setExpanded] = useState(true);
  const contentId = useId();
  const { room, location, locationId, selected, value, capacity, options, loading } = controller;
  const totalSeats = selected.reduce((sum, pose) => sum + pose.capacity, 0);
  const unavailable = selected.find((pose) => {
    const option = options?.options.find((candidate) => candidate.roomId === room?.id && candidate.id === `table:${pose.tableId}`);
    return option && !(option.resourceAvailable ?? option.available);
  });
  const capacityError = selected.length > 0 && capacity < partySize ? `Este armado ofrece ${capacity} lugares para ${partySize} personas.` : capacity > totalSeats ? "Los lugares útiles superan la capacidad de las mesas elegidas." : null;
  const selectionError = unavailable ? `La mesa ${unavailable.label} ya no está disponible. Elegí otra mesa o actualizá.` : null;
  const problem = conflict || selectionError || capacityError;
  const canConfirm = Boolean(value && room && location && selected.length && capacity >= partySize && capacity <= totalSeats && !problem && !error && !controller.error && !loading && !saving);
  const fieldDisabled = saving || loading;

  return <aside aria-label="Armar mesas en sala" className="pointer-events-auto absolute right-[max(0.75rem,env(safe-area-inset-right,0px))] top-[calc(max(1rem,env(safe-area-inset-top,0px))+7rem)] z-30 flex max-h-[calc(100dvh-13rem)] w-[min(20rem,calc(100%_-_6rem))] sm:w-80 flex-col overflow-y-auto overscroll-contain rounded-xl bg-white text-[#263e23] shadow-[0_6px_28px_-8px_rgba(24,38,24,0.24)] sm:right-[max(1.25rem,env(safe-area-inset-right,0px))] [@media(max-height:600px)]:top-[calc(max(0.5rem,env(safe-area-inset-top,0px))+3.5rem)] [@media(max-height:600px)]:max-h-[calc(100dvh_-_9rem_-_env(safe-area-inset-bottom,0px))] [@media(max-height:600px)]:block">
    <header className="flex shrink-0 items-start justify-between gap-2 px-4 pb-3 pt-4"><div className="min-w-0"><h2 className="font-semibold">Armar mesas</h2><p className="mt-1 truncate text-xs text-[#52634b]">{customerName?.trim() || "Sin reserva"} · {partySize} personas{durationMinutes ? ` · ${durationMinutes} min` : ""}</p></div><button type="button" aria-label={expanded ? "Minimizar inventario" : "Abrir inventario de mesas"} aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded((previous) => !previous)} className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-[#edf2e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934]"><ChevronDown size={20} className={expanded ? "rotate-180" : ""} /></button></header>
    <div id={contentId} hidden={!expanded} className="min-h-0 overflow-y-auto overscroll-contain border-t border-stone-100 p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-sm font-semibold">{room?.name ?? "Elegí un salón"}</span><button type="button" disabled={saving} onClick={onChooseRoom} className="shrink-0 text-xs font-semibold underline underline-offset-4 disabled:opacity-50">Cambiar salón</button></div>
        {loading && <p role="status" className="flex items-center gap-2 text-xs text-[#52634b]"><Loader2 size={14} className="animate-spin" />Consultando disponibilidad…</p>}
        <label className="grid gap-1 text-xs font-medium text-[#46543e]">Sector del salón<select className={floorInputClass} value={locationId} disabled={!room || fieldDisabled} onChange={(event) => controller.selectLocation(event.target.value)}><option value="">Elegí un sector</option>{room?.locations.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {room && !room.locations.some((item) => item.active) && <p className="text-xs leading-relaxed text-amber-900">Este salón necesita un sector activo antes de armar mesas.</p>}
        <fieldset disabled={!location || fieldDisabled} className="space-y-2 disabled:opacity-50"><legend className="mb-2 text-xs font-semibold">Mesas del inventario</legend>{room?.tables.filter((table) => table.active).map((table) => {
          const option = options?.options.find((candidate) => candidate.roomId === room.id && candidate.id === `table:${table.id}`);
          const checked = selected.some((pose) => pose.tableId === table.id);
          const available = option?.resourceAvailable ?? option?.available ?? false;
          return <label key={table.id} title={!available ? option?.conflict : undefined} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${checked ? "border-[#3d5934] bg-[#edf2e9]" : "border-stone-200"} ${available || checked ? "" : "cursor-not-allowed opacity-50"}`}><input type="checkbox" checked={checked} disabled={!available && !checked} onChange={() => controller.toggleTable(table.id)} className="h-4 w-4 accent-[#3d5934]" /><span className="min-w-0"><span className="font-medium">Mesa {table.label}</span><span className="ml-2 text-xs text-[#52634b]">{table.capacity} lugares</span>{!available && <span className="mt-0.5 block text-xs text-[#52634b]">{option?.conflict ?? "Ocupada"}</span>}</span></label>;
        })}{room && !room.tables.some((table) => table.active) && <p className="text-xs text-[#52634b]">No hay mesas activas en el inventario.</p>}</fieldset>
        {options?.options.some((option) => option.roomId === room?.id && option.id.startsWith("combination:")) && <details><summary className="cursor-pointer text-xs font-semibold">Armados predefinidos</summary><div className="mt-2 space-y-2">{options.options.filter((option) => option.roomId === room?.id && option.id.startsWith("combination:")).map((option) => <button key={option.id} type="button" disabled={!location || !option.available || fieldDisabled} title={option.conflict} onClick={() => controller.selectOption(option)} className="w-full rounded-lg border border-stone-200 px-3 py-2 text-left text-xs hover:bg-[#edf2e9] disabled:opacity-50">{option.label} · {option.capacity} lugares</button>)}</div></details>}
        {selected.length > 0 && value && <section aria-label="Posición del armado" className="space-y-3 border-t border-stone-200 pt-4"><p className="text-xs leading-relaxed text-[#52634b]">Arrastrá las mesas en el salón o tocá el lugar donde querés armar el grupo.</p><button type="button" disabled={fieldDisabled} onClick={controller.rotate} className={`${adminSecondaryButtonClass} w-full`}><RotateCw size={15} />Girar armado 90°</button><div className="grid grid-cols-2 gap-3">{(["x", "y"] as const).map((axis) => <label key={axis} className="grid gap-1 text-xs font-medium text-[#46543e]">Centro {axis.toUpperCase()}<input type="number" step={1} value={value[axis]} disabled={fieldDisabled} className={floorInputClass} onChange={(event) => { const coordinate = Number(event.target.value); if (Number.isFinite(coordinate)) controller.move(axis === "x" ? coordinate - value.x : 0, axis === "y" ? coordinate - value.y : 0); }} /></label>)}</div><label className="grid gap-1 text-xs font-medium text-[#46543e]">Lugares útiles<input type="number" min={1} max={totalSeats} step={1} value={capacity} disabled={fieldDisabled} className={floorInputClass} onChange={(event) => controller.setCapacity(Number(event.target.value))} /></label><p className="text-xs leading-relaxed text-[#52634b]">Dos mesas de cuatro suelen ofrecer seis lugares al unirlas. Ajustá el cupo real del armado.</p><details><summary className="cursor-pointer text-xs font-semibold">Ajustar cada mesa</summary><div className="mt-3 space-y-3">{selected.map((pose) => <div key={pose.tableId} className="space-y-2"><span className="text-xs font-semibold">Mesa {pose.label}</span><div className="grid grid-cols-[1fr_1fr_2.75rem] items-end gap-2">{(["x", "y"] as const).map((axis) => <label key={axis} className="grid min-w-0 gap-1 text-xs text-[#46543e]">{axis.toUpperCase()}<input aria-label={`Mesa ${pose.label} ${axis.toUpperCase()}`} type="number" value={pose[axis]} disabled={fieldDisabled} className={floorInputClass} onChange={(event) => controller.updateTable(pose.tableId, { [axis]: Number(event.target.value) })} /></label>)}<button type="button" aria-label={`Girar mesa ${pose.label}`} disabled={fieldDisabled} onClick={() => controller.updateTable(pose.tableId, { rotation: ((pose.rotation + 90) % 360) as FloorRotation })} className="flex h-11 w-11 items-center justify-center rounded-lg border border-stone-200 hover:bg-[#edf2e9] disabled:opacity-50"><RotateCw size={16} /></button></div></div>)}</div></details></section>}
      </div>
    </div>
    <footer className="shrink-0 space-y-3 border-t border-stone-200 p-4">
      {problem && <p role="alert" className="text-xs leading-relaxed text-red-800">{problem}</p>}
      {(error || controller.error) && <p role="alert" className="text-xs leading-relaxed text-red-800">{error || controller.error}</p>}
      {!selected.length && <p className="text-xs text-[#52634b]">Elegí un sector y las mesas que vas a usar.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" disabled={saving || loading} onClick={controller.refresh} className="flex min-h-9 items-center gap-1 text-xs font-semibold disabled:opacity-50"><RefreshCw size={13} />Actualizar</button><button type="button" disabled={saving} onClick={onEditData} className="min-h-9 text-xs font-semibold underline underline-offset-4 disabled:opacity-50">Editar datos</button></div>
      <div className="grid grid-cols-[auto_1fr] gap-2"><button type="button" disabled={saving} onClick={onCancel} className={adminSecondaryButtonClass}>Cancelar</button><button type="button" disabled={!canConfirm} onClick={onConfirm} className={`${adminPrimaryButtonClass} justify-center`}>{saving ? <><Loader2 size={15} className="animate-spin" />Guardando…</> : "Armar y ocupar mesas"}</button></div>
    </footer>
  </aside>;
}
