"use client";

import { useEffect } from "react";

export const adminButtonClass =
  "inline-flex cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50";

export const adminPrimaryButtonClass = `${adminButtonClass} bg-emerald-950 text-white shadow-sm hover:bg-emerald-900`;
export const adminSecondaryButtonClass = `${adminButtonClass} border border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50`;
export const adminDangerButtonClass = `${adminButtonClass} border border-red-200 bg-white text-red-700 hover:bg-red-50`;

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AdminCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-zinc-200/80 bg-white shadow-[0_12px_40px_-28px_rgba(24,24,27,0.45)] ${className}`}>{children}</section>;
}

export function AdminStatCard({
  label,
  value,
  detail,
  href,
  accent = "emerald",
}: {
  label: string;
  value: string | number;
  detail: string;
  href: string;
  accent?: "emerald" | "amber" | "terracotta";
}) {
  const accentClasses = {
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    terracotta: "bg-orange-100 text-orange-800",
  };

  return (
    <a href={href} className="group cursor-pointer rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_12px_40px_-28px_rgba(24,24,27,0.45)] transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${accentClasses[accent]}`}>CMS</span>
      </div>
      <p className="mt-5 text-4xl font-semibold tracking-tight text-zinc-950">{value}</p>
      <p className="mt-2 text-sm text-zinc-500 group-hover:text-zinc-700">{detail}</p>
    </a>
  );
}

export function AdminEmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 px-6 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-bold text-emerald-800">+</div>
      <h2 className="mt-4 text-base font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-8 ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="mb-6 flex items-start justify-between gap-5">
          <div>
            <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-2xl leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Close">
            x
          </button>
        </div>
        {children}
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
  confirmLabel = "Delete",
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  confirmLabel?: string;
}) {
  return (
    <AdminModal open={open} title={title} description={description} onClose={loading ? () => undefined : onClose}>
      <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end">
        <button type="button" className={adminSecondaryButtonClass} onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button type="button" className={adminDangerButtonClass} onClick={onConfirm} disabled={loading}>
          {loading ? "Deleting..." : confirmLabel}
        </button>
      </div>
    </AdminModal>
  );
}
