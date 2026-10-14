"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/modules/identity-access/ui";
import { ExternalLink, Layers3, LayoutGrid, Menu, MonitorCog, Settings, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const navigation = [
  { label: "Editor", href: "/admin", exact: true, icon: Layers3 },
  { label: "Configuración", href: "/admin/settings", icon: Settings },
];

export function AdminShell({
  children,
  brandTitle,
  brandSubtitle,
  menuHref,
  showMenuPickerLink,
}: {
  children: React.ReactNode;
  brandTitle: string;
  brandSubtitle: string;
  menuHref: string;
  showMenuPickerLink: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isEditor = pathname === "/admin";
  const isMenusPage = pathname === "/admin/menus" || pathname.startsWith("/admin/menus/");
  const [desktopNavOpen, setDesktopNavOpen] = useState(!isEditor);
  const desktopNavCollapsed = !desktopNavOpen;

  const isActive = (item: (typeof navigation)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);
  const labelVisibility = desktopNavCollapsed
    ? "opacity-100 lg:pointer-events-none lg:opacity-0"
    : "opacity-100 delay-100";

  if (isMenusPage) {
    return <>{children}</>;
  }

  return (
    <div
      data-admin-panel
      style={{ "--admin-nav-width": desktopNavCollapsed ? "4rem" : "18rem" } as React.CSSProperties}
      className="min-h-screen bg-[#f8faf7] text-zinc-900"
    >
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 overflow-hidden border-r border-zinc-200/90 bg-white text-zinc-900 shadow-[4px_0_24px_rgba(24,24,27,0.04)] transition-[width,transform] duration-200 ease-out ${
          desktopNavCollapsed ? "lg:w-16" : "lg:w-72"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="flex h-full w-72 flex-col">
          {/* Header */}
          <div className="grid h-16 w-72 shrink-0 grid-cols-[4rem_1fr] items-center border-b border-zinc-100">
            <div className="flex h-full items-center justify-center">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#182618] text-[#f5f2eb] shadow-sm transition-colors hover:bg-[#101c10] focus:outline-none focus:ring-2 focus:ring-[#182618]/30"
                onClick={() => setDesktopNavOpen((open) => !open)}
                aria-label={desktopNavCollapsed ? "Expandir navegación" : "Contraer navegación"}
                title={desktopNavCollapsed ? "Expandir navegación" : "Contraer navegación"}
              >
                <MonitorCog size={18} strokeWidth={2} />
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
                <span className="block max-w-[170px] truncate whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Menú activo
                </span>
                <span className="mt-0.5 block max-w-[170px] truncate whitespace-nowrap text-sm font-semibold tracking-tight text-zinc-900">
                  {brandTitle}
                </span>
                <span className="mt-0.5 block max-w-[170px] truncate whitespace-nowrap text-[11px] text-zinc-500">
                  {brandSubtitle}
                </span>
              </Link>
              <button
                type="button"
                className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 lg:hidden"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Navegación principal" className="flex min-h-0 flex-1 flex-col justify-start py-4">
            {showMenuPickerLink && (
              <Link
                href="/admin/menus"
                onClick={() => setMobileOpen(false)}
                title={desktopNavCollapsed ? "Cambiar menú" : undefined}
                aria-current={isMenusPage ? "page" : undefined}
                className="group grid h-12 w-72 shrink-0 grid-cols-[4rem_1fr] items-center whitespace-nowrap text-sm transition-colors hover:bg-zinc-50"
              >
                <span className="flex h-full items-center justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 transition-colors group-hover:text-[#182618]">
                    <LayoutGrid size={17} />
                  </span>
                </span>
                <span
                  className={`min-w-[180px] whitespace-nowrap pr-4 font-medium text-zinc-600 transition-opacity duration-150 ease-out group-hover:text-zinc-950 ${labelVisibility}`}
                >
                  Cambiar menú
                </span>
              </Link>
            )}

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
                  className={`group grid h-12 w-72 shrink-0 grid-cols-[4rem_1fr] items-center whitespace-nowrap text-sm transition-colors ${
                    active && !desktopNavCollapsed
                      ? "my-0.5 rounded-xl bg-[#eef3eb] text-[#192b17]"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  <span className="flex h-full items-center justify-center">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                        active
                          ? "bg-[#e2edd9] text-[#192b17]"
                          : "text-zinc-500 group-hover:text-[#182618]"
                      }`}
                    >
                      <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                    </span>
                  </span>
                  <span
                    className={`min-w-[180px] whitespace-nowrap pr-4 font-medium transition-opacity duration-150 ease-out ${
                      active
                        ? "font-semibold text-[#192b17]"
                        : "text-zinc-600 group-hover:text-zinc-950"
                    } ${labelVisibility}`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}

            <Link
              href={menuHref}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileOpen(false)}
              title={desktopNavCollapsed ? "Ver menú público" : undefined}
              className="group grid h-12 w-72 shrink-0 grid-cols-[4rem_1fr] items-center whitespace-nowrap text-sm transition-colors hover:bg-zinc-50"
            >
              <span className="flex h-full items-center justify-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl text-[#3d5934] transition-colors group-hover:bg-[#eef3eb]">
                  <ExternalLink size={16} />
                </span>
              </span>
              <span
                className={`min-w-[180px] whitespace-nowrap pr-4 font-medium text-zinc-600 transition-opacity duration-150 ease-out group-hover:text-zinc-950 ${labelVisibility}`}
              >
                Ver carta pública
              </span>
            </Link>
          </nav>

          {/* Footer with Logout */}
          <div className="mt-auto w-72 shrink-0 border-t border-zinc-100 py-3">
            <LogoutButton compact={desktopNavCollapsed} sidebar />
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-30 bg-zinc-950/40 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <button
        type="button"
        className="fixed right-4 top-4 z-30 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={18} />
      </button>

      <div
        className={`transition-[padding] duration-200 ease-out ${
          desktopNavCollapsed ? "lg:pl-16" : "lg:pl-72"
        }`}
      >
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
