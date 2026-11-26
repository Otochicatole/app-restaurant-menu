"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Layers, Menu, X } from "lucide-react";
import { useState } from "react";
import { LogoutButton } from "@/modules/identity-access/ui";

const NAV_ITEMS = [
  { href: "/superadmin", label: "Resumen", icon: LayoutDashboard, exact: true },
  { href: "/superadmin/clients", label: "Clientes y planes", icon: Building2, exact: false },
  { href: "/superadmin/templates", label: "Plantillas", icon: Layers, exact: false },
] as const;

export function SuperadminNav({ accountEmail }: { accountEmail?: string | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const navContent = (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <Link
            href="/superadmin"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-stone-900"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-xs font-bold text-white">
              SA
            </span>
            <span>Consola Plataforma</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Navegación superadmin" className="grid gap-1 p-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-stone-200 p-4">
        {accountEmail && (
          <p className="mb-3 truncate text-xs text-stone-500" title={accountEmail}>
            {accountEmail}
          </p>
        )}
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
        <Link href="/superadmin" className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-900 text-[11px] font-bold text-white">
            SA
          </span>
          <span>Consola Plataforma</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
        >
          <Menu className="h-4 w-4" />
          Menú
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-stone-950/30 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-stone-200 bg-white shadow-xl">
            {navContent}
          </aside>
        </div>
      )}

      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64 lg:border-r lg:border-stone-200 lg:bg-white">
        {navContent}
      </aside>
    </>
  );
}
