import { Plus } from "lucide-react";

export const adminButtonClass =
  "inline-flex cursor-pointer flex-row items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50";

export const adminPrimaryButtonClass = `${adminButtonClass} bg-stone-900 text-white hover:bg-stone-800 focus:ring-stone-900/20`;
export const adminSecondaryButtonClass = `${adminButtonClass} border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:text-stone-900 focus:ring-stone-400/20`;
export const adminDangerButtonClass = `${adminButtonClass} border border-red-200 bg-white text-red-700 hover:bg-red-50 hover:border-red-300 focus:ring-red-500/20`;

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
    <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="mb-1 text-xs font-medium text-stone-500">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
    </div>
  );
}

export function AdminCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-stone-200 bg-white ${className}`}
    >
      {children}
    </section>
  );
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
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    terracotta: "border-orange-200 bg-orange-50 text-orange-800",
  };
  return (
    <a
      href={href}
      className="group cursor-pointer rounded-xl border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-medium text-stone-500">{label}</p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${accentClasses[accent]}`}
        >
          Panel
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-stone-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-stone-500 transition-colors group-hover:text-stone-700">
        {detail}
      </p>
    </a>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50/70 p-10 text-center sm:p-14">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700">
        <Plus size={20} strokeWidth={2} />
      </div>
      <h2 className="mt-4 text-base font-semibold text-stone-900">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-stone-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
