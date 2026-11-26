"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type MenuPlacement = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUpward: boolean;
};

function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR");
}

export function AdminSearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Elegí una opción…",
  searchPlaceholder = "Buscar…",
  emptyMessage = "Sin resultados",
  searchable = true,
  ariaLabel,
  disabled = false,
  className = "",
}: {
  value: string;
  options: readonly SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  searchable?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [placement, setPlacement] = useState<MenuPlacement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const normalized = normalizeSearch(query.trim());
    if (!normalized) return options;
    return options.filter((option) => {
      const target = normalizeSearch(`${option.label} ${option.hint ?? ""}`);
      return target.includes(normalized);
    });
  }, [options, query]);

  const computePlacement = (): MenuPlacement | null => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 768;
    const viewportWidth = window.innerWidth || 1024;
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const available = Math.max(150, openUpward ? spaceAbove : spaceBelow);
    const maxHeight = Math.min(280, available);
    const width = Math.max(rect.width, 220);
    const maxLeft = Math.max(8, viewportWidth - width - 8);
    const left = Math.min(Math.max(8, rect.left), maxLeft);
    return {
      top: openUpward ? rect.top - 4 : rect.bottom + 4,
      left,
      width,
      maxHeight,
      openUpward,
    };
  };

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => setPlacement(computePlacement());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = searchable
      ? window.requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        })
      : null;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, searchable]);

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((prev) => {
      const next = !prev;
      if (next) setQuery("");
      return next;
    });
  };

  const selectValue = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  };

  const menuContent = open && placement ? (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: placement.top,
        left: placement.left,
        width: placement.width,
        transform: placement.openUpward ? "translateY(-100%)" : undefined,
        zIndex: 80,
      }}
      className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_14px_34px_-6px_rgba(24,24,27,0.22)]"
    >
      {searchable && (
        <div className="border-b border-zinc-100 p-2">
          <div className="relative">
            <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="search"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-9 w-full rounded-lg border border-zinc-200 bg-zinc-50/70 pl-8 pr-2.5 text-xs text-zinc-950 outline-none focus:border-[#3d5934] focus:bg-white"
            />
          </div>
        </div>
      )}
      <ul
        id={listboxId}
        role="listbox"
        aria-label={ariaLabel}
        style={{ maxHeight: Math.max(120, placement.maxHeight - (searchable ? 52 : 8)) }}
        className="overflow-y-auto overscroll-contain p-1"
      >
        {filtered.length === 0 ? (
          <li className="px-3 py-3 text-center text-xs text-zinc-500">{emptyMessage}</li>
        ) : (
          filtered.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectValue(option.value)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-[#e8efe6] font-semibold text-[#182618]"
                      : "text-zinc-800 hover:bg-zinc-100"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{option.label}</span>
                    {option.hint && (
                      <span className="block truncate text-[11px] font-normal text-zinc-500">{option.hint}</span>
                    )}
                  </span>
                  {isSelected && <Check size={14} aria-hidden="true" className="shrink-0 text-[#3d5934]" />}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={toggleOpen}
        className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-left text-sm text-zinc-950 outline-none transition focus:border-[#3d5934] focus:ring-2 focus:ring-[#3d5934]/15 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <span className={`min-w-0 truncate ${selected ? "text-zinc-950" : "text-zinc-500"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={15} aria-hidden="true" className={`shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {typeof document !== "undefined" && menuContent ? createPortal(menuContent, document.body) : null}
    </>
  );
}
