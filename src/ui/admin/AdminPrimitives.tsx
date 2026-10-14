import { Plus } from "lucide-react";

export const adminButtonClass =
  "inline-flex cursor-pointer flex-row items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50";

export const adminPrimaryButtonClass = `${adminButtonClass} bg-[#182618] text-white shadow-sm hover:bg-[#101c10] active:scale-[0.99] focus:ring-[#182618]/25`;
export const adminSecondaryButtonClass = `${adminButtonClass} border border-zinc-200/90 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.99] focus:ring-zinc-400/25`;
export const adminDangerButtonClass = `${adminButtonClass} border border-red-200 bg-white text-red-700 hover:bg-red-50 hover:border-red-300 focus:ring-red-500/25`;

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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-[#3d5934]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
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
      className={`rounded-2xl border border-zinc-200/80 bg-white shadow-[0_4px_24px_-8px_rgba(24,24,27,0.06)] ${className}`}
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
    emerald: "bg-[#e8efe6] text-[#2b4226]",
    amber: "bg-amber-50 text-amber-800 border border-amber-200/50",
    terracotta: "bg-orange-50 text-orange-800 border border-orange-200/50",
  };
  return (
    <a
      href={href}
      className="group cursor-pointer rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-[0_4px_24px_-8px_rgba(24,24,27,0.06)] transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${accentClasses[accent]}`}
        >
          Panel
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-zinc-950 sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500 transition-colors group-hover:text-zinc-700">
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
    <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 p-12 text-center sm:p-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8efe6] text-[#2b4226]">
        <Plus size={22} strokeWidth={2} />
      </div>
      <h2 className="mt-4 text-base font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-zinc-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
