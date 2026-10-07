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
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Dashboard</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">Resumen</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
          Estado general de clientes y plantillas.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard href="/superadmin/clientes" icon={<Store size={17} />} label="Clientes" value={tenants.length} detail={`${active} activos`} />
        <SummaryCard href="/superadmin/clientes" icon={<Store size={17} />} label="Suspendidos" value={tenants.length - active} detail="Sin acceso" />
        <SummaryCard href="/superadmin/plantillas" icon={<PanelsTopLeft size={17} />} label="Plantillas" value={templates.total} detail="Sistema y comunidad" />
        <SummaryCard href="/superadmin/plantillas" icon={<BarChart3 size={17} />} label="Pendientes" value={pending} detail="Requieren revisión" />
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
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">{icon}</span>
        <span className="text-3xl font-semibold tabular-nums tracking-tight text-zinc-950">{value}</span>
      </div>
      <p className="mt-4 text-sm font-semibold text-zinc-900">{label}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{detail}</p>
    </Link>
  );
}
