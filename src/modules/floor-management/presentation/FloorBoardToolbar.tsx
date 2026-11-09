"use client";

import { transientButtonProps } from "@/ui/button-state";

import Link from "next/link";
import { useEffect, useId, useRef, type Ref } from "react";
import { Building2, CalendarClock, Check, Flame, Layers3, List, Package, Plus, ReceiptText, Settings2 } from "lucide-react";
import { LogoutButton } from "@/modules/identity-access/ui";
import type { FloorRoom } from "../contracts";

export type FloorBoardToolbarProps = {
  rooms: FloorRoom[]; roomId: string; roomsOpen: boolean; onRoomsOpenChange: (open: boolean) => void; onSelectRoom: (id: string) => void;
  onSchedule: () => void; onReservations: () => void; onAttend: () => void; attendButtonRef?: Ref<HTMLButtonElement>;
  readOnly: boolean; canManageWalkIns: boolean; enabled: boolean; hasBoard: boolean; assembling: boolean; saving: boolean;
  reservationCount: number; restaurantId: string; activePanel?: string | null; openPanels?: string[]; hasPendingChanges?: boolean;
  onTables?: () => void;
  onServiceAccounts?: () => void;
};
const buttonBase = "flex h-11 w-11 shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold shadow-[0_3px_16px_rgba(24,38,24,0.12)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--floor-focus,#3d5934)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto lg:px-3";
const actionClass = `${buttonBase} bg-[var(--floor-surface,#fff)] text-[var(--floor-ink,#263e23)] hover:bg-[var(--floor-hover,#edf2e9)] aria-expanded:bg-[var(--floor-hover,#edf2e9)]`;

export function FloorBoardToolbar({ rooms, roomId, roomsOpen, onRoomsOpenChange, onSelectRoom, onSchedule, onReservations, onAttend, onTables, onServiceAccounts, attendButtonRef, readOnly, canManageWalkIns, enabled, hasBoard, assembling, saving, reservationCount, restaurantId, activePanel, openPanels, hasPendingChanges = false }: FloorBoardToolbarProps) {
  const roomButton = useRef<HTMLButtonElement>(null);
  const roomPopup = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const reservationCountId = useId();
  const close = useRef(onRoomsOpenChange);
  useEffect(() => { close.current = onRoomsOpenChange; }, [onRoomsOpenChange]);
  useEffect(() => {
    if (!roomsOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const selected = roomPopup.current?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]');
      (selected ?? roomPopup.current?.querySelector<HTMLButtonElement>("button") ?? roomPopup.current)?.focus();
    });
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !roomPopup.current?.contains(target) && !roomButton.current?.contains(target)) {
        close.current(false);
        if (!(target instanceof Element) || !target.closest("button,a[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")) roomButton.current?.focus();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault(); close.current(false); roomButton.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [roomsOpen]);
  const openAction = (action: () => void) => { onRoomsOpenChange(false); action(); };
  const navigationDisabled = assembling || saving || hasPendingChanges;
  const toolOpen = (kind: string) => openPanels ? openPanels.includes(kind) : activePanel === kind;

  return <nav aria-label="Herramientas de sala" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom,0px))] left-1/2 z-40 flex w-max max-w-[calc(100%_-_1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5">
    <button {...transientButtonProps} ref={roomButton} type="button" aria-label="Cambiar salón" title="Salones" aria-controls={popupId} aria-expanded={roomsOpen} disabled={!hasBoard || saving} onClick={() => onRoomsOpenChange(!roomsOpen)} className={actionClass}><Building2 size={18} /><span className="hidden whitespace-nowrap lg:inline">Salones</span></button>
    <button {...transientButtonProps} type="button" aria-label="Fecha y hora" title="Fecha y hora" aria-haspopup="dialog" aria-expanded={toolOpen("schedule")} disabled={!hasBoard || saving} onClick={() => openAction(onSchedule)} className={actionClass}><CalendarClock size={18} /><span className="hidden whitespace-nowrap lg:inline">Fecha y hora</span></button>
    <button {...transientButtonProps} type="button" aria-label="Reservas" title={`Reservas · ${reservationCount}`} aria-describedby={reservationCountId} aria-haspopup="dialog" aria-expanded={toolOpen("reservations")} disabled={!hasBoard || saving} onClick={() => openAction(onReservations)} className={actionClass}><List size={18} /><span className="hidden whitespace-nowrap lg:inline">Reservas</span><span id={reservationCountId} className="sr-only text-xs font-normal tabular-nums text-[var(--floor-muted,#52634b)] lg:not-sr-only">{reservationCount}<span className="sr-only"> grupos asignados</span></span></button>
    {onServiceAccounts && <button {...transientButtonProps} type="button" aria-label="Cuentas de servicio" title="Cuentas de servicio" aria-haspopup="dialog" aria-expanded={toolOpen("service-list")} disabled={saving} onClick={() => openAction(onServiceAccounts)} className={actionClass}><ReceiptText size={18} aria-hidden="true" /><span className="hidden whitespace-nowrap lg:inline">Cuentas</span></button>}
    <Link href={`/kitchen?restaurantId=${encodeURIComponent(restaurantId)}`} aria-label="Cocina (KDS)" title="Pantalla de cocina" className={actionClass}><Flame size={18} className="text-orange-600" /><span className="hidden whitespace-nowrap lg:inline">Cocina</span></Link>
    {canManageWalkIns && enabled && <button {...transientButtonProps} ref={attendButtonRef} type="button" aria-label={assembling ? "Armar mesas" : "Atender sin reserva"} title={assembling ? "Continuar armado" : "Atender sin reserva"} aria-haspopup="dialog" aria-expanded={toolOpen(assembling ? "assembly" : "walk-in")} disabled={!hasBoard || saving} onClick={() => openAction(onAttend)} className={`${buttonBase} bg-[var(--floor-action,#182618)] text-white hover:bg-[var(--floor-action-hover,#2d4628)]`}>{assembling ? <Layers3 size={19} /> : <Plus size={19} />}<span className="hidden whitespace-nowrap lg:inline">{assembling ? "Armar mesas" : "Atender"}</span></button>}
    {onTables && <button {...transientButtonProps} type="button" aria-label="Inventario de mesas" title="Inventario de mesas" aria-haspopup="dialog" aria-expanded={toolOpen("inventory")} disabled={!roomId || saving} onClick={() => openAction(onTables)} className={actionClass}><Package size={18} /><span className="hidden whitespace-nowrap lg:inline">Mesas</span></button>}
    {!readOnly && <Link href={`/admin/restaurants/${encodeURIComponent(restaurantId)}/rooms`} aria-label="Administrar" title="Administrar salones" aria-disabled={navigationDisabled || undefined} tabIndex={navigationDisabled ? -1 : undefined} onClick={(event) => { if (navigationDisabled) event.preventDefault(); else onRoomsOpenChange(false); }} className={`${actionClass} ${navigationDisabled ? "cursor-not-allowed opacity-50" : ""}`}><Settings2 size={18} /><span className="hidden whitespace-nowrap lg:inline">Administrar</span></Link>}
    <LogoutButton floating disabled={navigationDisabled} />

    {roomsOpen && <div ref={roomPopup} id={popupId} tabIndex={-1} className="absolute bottom-[calc(100%_+_0.75rem)] left-1/2 max-h-[min(24rem,calc(100dvh_-_7rem))] w-[min(20rem,calc(100vw_-_1.5rem))] -translate-x-1/2 overflow-y-auto overscroll-contain rounded-xl bg-[var(--floor-surface,#fff)] p-3 shadow-[0_6px_28px_-8px_rgba(24,38,24,0.24)] outline-none lg:left-0 lg:translate-x-0"><h2 className="mb-2 px-2 text-sm font-semibold text-[var(--floor-ink,#263e23)]">Elegir salón</h2><nav aria-label="Salones" className="space-y-1">{rooms.filter((room) => room.active).map((room) => <button key={room.id} {...transientButtonProps} type="button" aria-pressed={room.id === roomId} onClick={() => { onSelectRoom(room.id); onRoomsOpenChange(false); roomButton.current?.focus(); }} className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-[var(--floor-ink,#263e23)] hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--floor-focus,#3d5934)] ${room.id === roomId ? "bg-[var(--floor-hover,#edf2e9)] font-semibold" : ""}`}><span className="min-w-0 truncate">{room.name}</span>{room.id === roomId && <Check size={17} className="shrink-0" />}</button>)}</nav>{!rooms.some((room) => room.active) && <p className="px-2 py-3 text-sm text-[var(--floor-muted,#52634b)]">No hay salones activos disponibles.</p>}</div>}
  </nav>;
}
