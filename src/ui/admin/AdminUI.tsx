"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { adminDangerButtonClass, adminSecondaryButtonClass } from "./AdminPrimitives";

export function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hasAttribute("hidden"));

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      (firstFocusable ?? dialogRef.current)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/35 p-0 backdrop-blur-[1px] sm:items-center sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`max-h-[90dvh] w-full rounded-t-2xl border border-stone-200 bg-white shadow-xl outline-none sm:rounded-2xl ${wide ? "max-w-2xl" : "max-w-lg"} ${footer ? "flex flex-col overflow-hidden" : "overflow-y-auto p-5 sm:p-6"}`}
      >
        <div className={footer ? "min-h-0 overflow-y-auto p-5 sm:p-6" : undefined}>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-stone-900">{title}</h2>
              {description && <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-stone-500">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

export function AdminConfirmModal({
  open,
  title,
  description,
  onClose,
  onConfirm,
  loading = false,
  confirmLabel = "Eliminar",
  loadingLabel = "Eliminando...",
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  confirmLabel?: string;
  loadingLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <AdminModal open={open} title={title} description={description} onClose={loading ? () => undefined : onClose}>
      {children}
      <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
        <button type="button" className={adminSecondaryButtonClass} onClick={onClose} disabled={loading}>
          Cancelar
        </button>
        <button type="button" className={adminDangerButtonClass} onClick={onConfirm} disabled={loading}>
          {loading ? loadingLabel : confirmLabel}
        </button>
      </div>
    </AdminModal>
  );
}
