"use client";

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { Plus } from "lucide-react";
import { transientButtonProps } from "@/ui/button-state";

export type FloorSectorContextMenuProps = {
  name: string;
  point: { x: number; y: number };
  disabled: boolean;
  onAddTable: () => void;
  onClose: () => void;
};

export function FloorSectorContextMenu({
  name,
  point,
  disabled,
  onAddTable,
  onClose,
}: FloorSectorContextMenuProps) {
  const menu = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const restoreFocus = useRef(true);

  useLayoutEffect(() => {
    const element = menu.current;
    if (!element) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && !element.contains(active)) previousFocus.current = active;
    restoreFocus.current = true;
    const bounds = element.getBoundingClientRect();
    const width = Math.min(bounds.width || 220, Math.max(1, window.innerWidth - 80));
    const height = Math.min(bounds.height || 88, Math.max(1, window.innerHeight - 16));
    const minimumLeft = Math.min(72, Math.max(8, window.innerWidth - width - 8));
    element.style.left = `${Math.min(Math.max(point.x, minimumLeft), Math.max(minimumLeft, window.innerWidth - width - 8))}px`;
    element.style.top = `${Math.min(Math.max(point.y, 8), Math.max(8, window.innerHeight - height - 8))}px`;
    (element.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? element).focus();
    return () => {
      if (restoreFocus.current && element.contains(document.activeElement) && previousFocus.current?.isConnected) {
        previousFocus.current.focus();
      }
    };
  }, [name, point.x, point.y, disabled]);

  useEffect(() => {
    const outside = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menu.current?.contains(target)) return;
      if (
        event.type === "pointerdown" &&
        target instanceof Element &&
        target.closest("button,a[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")
      ) {
        restoreFocus.current = false;
      }
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
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === "Tab") {
      onClose();
      return;
    }
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const items = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
    if (!items.length) return;
    const current = items.findIndex((item) => item === document.activeElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : event.key === "ArrowUp" || event.key === "ArrowLeft"
            ? current <= 0
              ? items.length - 1
              : current - 1
            : (current + 1) % items.length;
    items[next]?.focus();
  };

  return (
    <div
      ref={menu}
      role="menu"
      aria-label={`Acciones de ${name}`}
      tabIndex={-1}
      style={{ left: point.x, top: point.y }}
      onKeyDown={navigate}
      onContextMenu={(event) => event.preventDefault()}
      className="fixed z-[60] max-h-[calc(100dvh_-_1rem)] w-[min(14rem,calc(100vw_-_5rem))] overflow-y-auto overscroll-contain rounded-xl border border-stone-200 bg-white p-1.5 text-stone-900 shadow-lg outline-none"
    >
      <p className="mb-1 truncate px-2.5 py-1 text-xs font-semibold text-stone-500">{name}</p>
      <button
        {...transientButtonProps}
        type="button"
        role="menuitem"
        disabled={disabled}
        onClick={onAddTable}
        className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-stone-900 transition-colors hover:bg-stone-100 focus-visible:bg-stone-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={15} className="shrink-0" aria-hidden="true" />
        Agregar mesa aquí
      </button>
    </div>
  );
}
