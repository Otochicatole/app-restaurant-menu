"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { transientButtonProps } from "@/ui/button-state";
import styles from "./floor-table-modal.module.css";

export type FloorTableModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  badge?: string;
  size?: "compact" | "wide";
  headerMeta?: React.ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  hasUnsavedChanges?: boolean;
  unsavedMessage?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: React.ReactNode;
};

export function FloorTableModal({
  open,
  title,
  subtitle,
  badge,
  size = "wide",
  headerMeta,
  onClose,
  closeDisabled = false,
  hasUnsavedChanges = false,
  unsavedMessage = "Hay ítems en borrador o un cobro en curso sin confirmar. ¿Descartar y cerrar?",
  onRefresh,
  refreshing = false,
  children,
}: FloorTableModalProps) {
  if (!open) return null;
  return (
    <FloorTableModalDialog
      title={title}
      subtitle={subtitle}
      badge={badge}
      size={size}
      headerMeta={headerMeta}
      onClose={onClose}
      closeDisabled={closeDisabled}
      hasUnsavedChanges={hasUnsavedChanges}
      unsavedMessage={unsavedMessage}
      onRefresh={onRefresh}
      refreshing={refreshing}
    >
      {children}
    </FloorTableModalDialog>
  );
}

function FloorTableModalDialog({
  title,
  subtitle,
  badge,
  size = "wide",
  headerMeta,
  onClose,
  closeDisabled = false,
  hasUnsavedChanges = false,
  unsavedMessage,
  onRefresh,
  refreshing = false,
  children,
}: Omit<FloorTableModalProps, "open">) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const discardButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const discardNoticeId = useId();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const stateRef = useRef({ onClose, closeDisabled, hasUnsavedChanges });
  useEffect(() => {
    stateRef.current = { onClose, closeDisabled, hasUnsavedChanges };
  }, [onClose, closeDisabled, hasUnsavedChanges]);

  const requestClose = useCallback(() => {
    const { onClose: closeCallback, closeDisabled: locked, hasUnsavedChanges: dirty } = stateRef.current;
    if (locked) return;
    if (dirty) {
      setConfirmingDiscard(true);
      window.requestAnimationFrame(() => discardButtonRef.current?.focus());
      return;
    }
    closeCallback();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const nativeShowModal = typeof dialog.showModal === "function";
    if (nativeShowModal) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute("open", "");
        }
      }
    } else {
      dialog.setAttribute("open", "");
    }

    const handleCancel = (event: Event) => {
      event.preventDefault();
      requestClose();
    };
    dialog.addEventListener("cancel", handleCancel);

    const handleFallbackKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || nativeShowModal) return;
      event.preventDefault();
      requestClose();
    };
    document.addEventListener("keydown", handleFallbackKeyDown);

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      document.removeEventListener("keydown", handleFallbackKeyDown);
      if (typeof dialog.close === "function") {
        if (dialog.open) dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    };
  }, [requestClose]);

  const showDiscardBar = confirmingDiscard && hasUnsavedChanges;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`${styles.modalDialog} ${size === "compact" ? styles.modalDialogCompact : ""}`}
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--floor-border,#cad9df)] bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {badge && (
            <span className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[var(--floor-action,#155e75)] px-3 text-sm font-bold tracking-tight text-white tabular-nums">
              {badge}
            </span>
          )}
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-bold text-[var(--floor-ink,#173642)] sm:text-lg">
              {title}
            </h2>
            {subtitle && (
              <p className="truncate text-xs text-[var(--floor-muted,#4b6470)] sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {headerMeta}
          {onRefresh && (
            <button
              {...transientButtonProps}
              type="button"
              aria-label="Actualizar cuenta"
              title="Actualizar cuenta"
              disabled={closeDisabled || refreshing}
              onClick={onRefresh}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--floor-border,#cad9df)] bg-white px-3 text-xs font-semibold text-[var(--floor-ink,#173642)] transition-colors hover:bg-[var(--floor-hover,#e6f2f6)] focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#0e7490)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          )}
          <button
            {...transientButtonProps}
            type="button"
            aria-label="Cerrar"
            disabled={closeDisabled}
            onClick={requestClose}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[var(--floor-border,#cad9df)] bg-white px-3 text-xs font-semibold text-[var(--floor-ink,#173642)] transition-colors hover:bg-[var(--floor-hover,#e6f2f6)] focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#0e7490)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={16} aria-hidden="true" />
            <span>Cerrar</span>
          </button>
        </div>
      </header>

      {showDiscardBar && (
        <div
          id={discardNoticeId}
          role="alert"
          className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-950 sm:px-6"
        >
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle size={16} className="shrink-0 text-amber-700" aria-hidden="true" />
            {unsavedMessage}
          </span>
          <div className="flex items-center gap-2">
            <button
              ref={discardButtonRef}
              type="button"
              aria-describedby={discardNoticeId}
              disabled={closeDisabled}
              onClick={() => {
                setConfirmingDiscard(false);
                onClose();
              }}
              className="inline-flex min-h-9 items-center rounded-lg border border-red-300 bg-white px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600"
            >
              Descartar y cerrar
            </button>
            <button
              type="button"
              disabled={closeDisabled}
              onClick={() => setConfirmingDiscard(false)}
              className="inline-flex min-h-9 items-center rounded-lg bg-[var(--floor-action,#155e75)] px-3 text-xs font-semibold text-white transition-colors hover:bg-[var(--floor-action-hover,#0e4d63)] focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#0e7490)]"
            >
              Seguir editando
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </dialog>
  );
}
