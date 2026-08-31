"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/modules/identity-access/ui";
import { ExternalLink, Layers3, Menu, Settings, UtensilsCrossed, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navigation = [
  { label: "Editor", href: "/admin", exact: true, icon: Layers3 },
  { label: "Configuración", href: "/admin/settings", icon: Settings },
];

export function AdminShell({ children, brandTitle, brandSubtitle, menuHref }: { children: React.ReactNode; brandTitle: string; brandSubtitle: string; menuHref: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isEditor = pathname === "/admin";
  const [desktopNavOpen, setDesktopNavOpen] = useState(!isEditor);
  const desktopNavCollapsed = !desktopNavOpen;

  const isActive = (item: (typeof navigation)[number]) => item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const labelVisibility = desktopNavCollapsed
    ? "opacity-100 lg:pointer-events-none lg:opacity-0"
    : "opacity-100 delay-100";

  return (
    <div
      data-admin-panel
      style={{ "--admin-nav-width": desktopNavCollapsed ? "4rem" : "18rem" } as React.CSSProperties}
      className="min-h-screen bg-[#f5f7f3] text-zinc-900"
    >
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 overflow-hidden border-r border-zinc-200 bg-white text-zinc-900 shadow-[8px_0_30px_rgba(24,24,27,0.06)] transition-[width,transform] duration-200 ease-out ${desktopNavCollapsed ? "lg:w-16" : "lg:w-72"} ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex h-full w-72 flex-col">
          <div className="grid h-16 w-72 shrink-0 grid-cols-[4rem_1fr] items-center">
            <div className="flex h-full items-center justify-center">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-emerald-950 text-amber-200 shadow-sm shadow-emerald-950/20 transition-colors hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                onClick={() => setDesktopNavOpen((open) => !open)}
                aria-label={desktopNavCollapsed ? "Expandir navegación" : "Contraer navegación"}
                title={desktopNavCollapsed ? "Expandir navegación" : "Contraer navegación"}
              >
                <UtensilsCrossed size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex min-w-0 items-center justify-between pr-4">
              <Link
                href="/admin"
                className={`min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-150 ease-out ${labelVisibility}`}
                onClick={() => {
                  setMobileOpen(false);
                  setDesktopNavOpen(false);
                }}
              >
                <span className="block max-w-[170px] truncate whitespace-nowrap text-sm font-semibold tracking-tight">{brandTitle}</span>
                <span className="mt-0.5 block max-w-[170px] truncate whitespace-nowrap text-[11px] text-zinc-500">{brandSubtitle}</span>
              </Link>
              <button type="button" className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú">
                <X size={18} />
              </button>
            </div>
          </div>

          <nav aria-label="Navegación principal" className="flex min-h-0 flex-1 flex-col justify-center py-4">
            {navigation.map((item) => {
              const active = isActive(item);
              const Icon = item.icon as LucideIcon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setMobileOpen(false);
                    if (item.exact) setDesktopNavOpen(false);
                  }}
                  title={desktopNavCollapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className="group grid h-12 w-72 shrink-0 grid-cols-[4rem_1fr] items-center whitespace-nowrap text-sm"
                >
                  <span className="flex h-full items-center justify-center">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${active ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200" : "text-zinc-500 group-hover:bg-zinc-50 group-hover:text-emerald-700"}`}>
                      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                    </span>
                  </span>
                  <span className={`min-w-[180px] whitespace-nowrap pr-4 font-medium transition-opacity duration-150 ease-out ${active ? "font-semibold text-emerald-800" : "text-zinc-600 group-hover:text-emerald-950"} ${labelVisibility}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <div className={`my-3 ml-16 mr-4 border-t border-zinc-200 transition-opacity duration-150 ${labelVisibility}`} />

            <Link
              href={menuHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileOpen(false)}
              title={desktopNavCollapsed ? "Ver menú público" : undefined}
              className="group grid h-12 w-72 shrink-0 grid-cols-[4rem_1fr] items-center whitespace-nowrap text-sm"
            >
              <span className="flex h-full items-center justify-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl text-amber-700 transition-colors group-hover:bg-amber-50">
                  <ExternalLink size={16} />
                </span>
              </span>
              <span className={`min-w-[180px] whitespace-nowrap pr-4 font-medium text-zinc-600 transition-opacity duration-150 ease-out group-hover:text-emerald-950 ${labelVisibility}`}>
                Ver menú público
              </span>
            </Link>
          </nav>

          <div className="mt-auto w-72 shrink-0 border-t border-zinc-200 py-3">
            <LogoutButton compact={desktopNavCollapsed} sidebar />
          </div>
        </div>
      </aside>

      {mobileOpen && <button type="button" aria-label="Cerrar navegación" className="fixed inset-0 z-30 bg-zinc-950/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <button type="button" className="fixed right-4 top-4 z-30 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
        <Menu size={18} />
      </button>
      <div className={`transition-[padding] duration-200 ease-out ${desktopNavCollapsed ? "lg:pl-16" : "lg:pl-72"}`}>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
