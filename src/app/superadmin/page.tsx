import { menuTemplates } from "@/modules/menu-editor/server";
import { tenantManagement } from "@/modules/tenant-management/server";
import { BarChart3, PanelsTopLeft, Store } from "lucide-react";
import Link from "next/link";

export default async function SuperAdminDashboardPage() {
  const [tenants, templates] = await Promise.all([
    tenantManagement.listTenants(),
    menuTemplates.listForSuperadmin({ tab: "all", query: "", page: 1, pageSize: 24 }),
  ]);
  const pending = templates.items.filter((template) => template.status === "PENDING").length;
  const active = tenants.filter((tenant) => tenant.status === "ACTIVE").length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4a6341]">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
          Resumen de plataforma
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500">
          Estado general de cuentas de clientes, actividad y plantillas comunitarias.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          href="/superadmin/clientes"
          icon={<Store size={18} />}
          label="Clientes"
          value={tenants.length}
          detail={`${active} activos`}
          highlight
        />
        <SummaryCard
          href="/superadmin/clientes"
          icon={<Store size={18} />}
          label="Suspendidos"
          value={tenants.length - active}
          detail="Sin acceso"
        />
        <SummaryCard
          href="/superadmin/plantillas"
          icon={<PanelsTopLeft size={18} />}
          label="Plantillas"
          value={templates.total}
          detail="Sistema y comunidad"
        />
        <SummaryCard
          href="/superadmin/plantillas"
          icon={<BarChart3 size={18} />}
          label="Pendientes"
          value={pending}
          detail="Requieren revisión"
          badge={pending > 0 ? "Atención" : undefined}
        />
      </div>
    </main>
  );
}

function SummaryCard({
  href,
  icon,
  label,
  value,
  detail,
  highlight = false,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-6 transition duration-150 hover:-translate-y-0.5 hover:shadow-md ${
        highlight
          ? "border-zinc-200/90 bg-white shadow-[0_4px_24px_-8px_rgba(24,24,27,0.06)] hover:border-zinc-300"
          : "border-zinc-200/80 bg-white shadow-xs hover:border-zinc-300"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3eb] text-[#1c2c1a]">
          {icon}
        </span>
        {badge ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200/60">
            {badge}
          </span>
        ) : null}
        <span className="text-3xl font-bold tabular-nums tracking-tight text-zinc-950 sm:text-4xl">
          {value}
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-zinc-900">{label}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>
    </Link>
  );
}
