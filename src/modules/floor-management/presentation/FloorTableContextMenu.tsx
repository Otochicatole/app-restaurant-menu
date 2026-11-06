"use client";

import { useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { Pencil, Unlink } from "lucide-react";
import { transientButtonProps } from "@/ui/button-state";

export type FloorTableContextMenuProps = {
  name: string; point: { x: number; y: number }; disabled: boolean; reason?: string;
  onEdit: () => void; onClose: () => void;
  onSeparate?: () => void;
};

export function FloorTableContextMenu({ name, point, disabled, reason, onEdit, onClose, onSeparate }: FloorTableContextMenuProps) {
  const menu = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const restoreFocus = useRef(true);
  const reasonId = useId();

  useLayoutEffect(() => {
    const element = menu.current;
    if (!element) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && !element.contains(active)) previousFocus.current = active;
    restoreFocus.current = true;
    const bounds = element.getBoundingClientRect();
    const width = Math.min(bounds.width || 248, Math.max(1, window.innerWidth - 16));
    const height = Math.min(bounds.height || 100, Math.max(1, window.innerHeight - 16));
    element.style.left = `${Math.min(Math.max(point.x, 8), Math.max(8, window.innerWidth - width - 8))}px`;
    element.style.top = `${Math.min(Math.max(point.y, 8), Math.max(8, window.innerHeight - height - 8))}px`;
    (element.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? element).focus();
    return () => {
      if (restoreFocus.current && element.contains(document.activeElement) && previousFocus.current?.isConnected) previousFocus.current.focus();
    };
  }, [name, point.x, point.y, disabled, reason, onSeparate]);

  useEffect(() => {
    const outside = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menu.current?.contains(target)) return;
      if (event.type === "pointerdown" && target instanceof Element && target.closest("button,a[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")) restoreFocus.current = false;
      onClose();
    };
    const resize = () => onClose();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("wheel", outside, { capture: true, passive: true });
    window.addEventListener("scroll", outside, true);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("wheel", outside, true);
      window.removeEventListener("scroll", outside, true);
      window.removeEventListener("resize", resize);
    };
  }, [onClose]);

  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (event.key === "Tab") { onClose(); return; }
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
    if (!items.length) return;
    const current = items.findIndex((item) => item === document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? (current <= 0 ? items.length - 1 : current - 1) : (current + 1) % items.length;
    items[next]?.focus();
  };
  const itemClass = "flex min-h-11 w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs font-medium hover:bg-[var(--floor-hover,#edf2e9)] focus-visible:bg-[var(--floor-hover,#edf2e9)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--floor-focus,#3d5934)] disabled:cursor-not-allowed disabled:opacity-50";

  return <div ref={menu} role="menu" aria-label={"Acciones de " + name} aria-describedby={reason ? reasonId : undefined} tabIndex={-1} style={{ left: point.x, top: point.y }} onKeyDown={navigate} onContextMenu={(event) => event.preventDefault()} className="fixed z-[60] max-h-[calc(100dvh_-_1rem)] w-[min(15.5rem,calc(100vw_-_1rem))] overflow-y-auto overscroll-contain rounded-xl bg-[var(--floor-surface,#fff)] p-1.5 text-[var(--floor-ink,#263e23)] shadow-[0_6px_28px_-8px_rgba(24,38,24,0.24)] outline-none">
    <p className="mb-1 truncate px-2 py-1 text-sm font-semibold">{name}</p>
    <div role="presentation" className="space-y-0.5">
      <button {...transientButtonProps} type="button" role="menuitem" disabled={disabled} onClick={onEdit} className={itemClass}><Pencil size={15} className="shrink-0" />Editar</button>
      <button {...transientButtonProps} type="button" role="menuitem" disabled={disabled || !onSeparate} onClick={onSeparate} title={!onSeparate ? "Las mesas seleccionadas ya est\u00E1n separadas." : undefined} className={itemClass}><Unlink size={15} className="shrink-0" />Separar</button>
    </div>
    {reason && <p id={reasonId} className="px-2 pb-2 pt-1 text-xs leading-relaxed text-[var(--floor-muted,#52634b)]">{reason}</p>}
  </div>;
}
