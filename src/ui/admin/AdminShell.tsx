"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/modules/identity-access/ui";
import { CalendarDays, Globe, Layers3, LayoutGrid, Menu, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function AdminShell({
  children,
  brandTitle,
  brandSubtitle,
  showMenuPickerLink,
  landingEnabled = false,
}: {
  children: React.ReactNode;
  brandTitle: string;
  brandSubtitle: string;
  showMenuPickerLink: boolean;
  landingEnabled?: boolean;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMenusPage = pathname === "/admin/menus" || pathname.startsWith("/admin/menus/");
  const isLandingPage = pathname === "/admin/landing" || pathname.startsWith("/admin/landing/");

  const navigation = [
    { label: "Editor", href: "/admin", exact: true, icon: Layers3 },
    ...(landingEnabled
      ? [
          { label: "Landing", href: "/admin/landing", exact: true, icon: Globe },
          { label: "Reservas", href: "/admin/reservas", icon: CalendarDays },
        ]
      : []),
    { label: "Configuración", href: "/admin/settings", icon: Settings },
  ];

  const isActive = (item: (typeof navigation)[number]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  if (isMenusPage) {
    return <>{children}</>;
  }

  return (
    <div
      data-admin-panel
      style={{ "--admin-nav-width": "4rem" } as React.CSSProperties}
      className="min-h-screen bg-[#f8faf7] text-zinc-900"
    >
      {/* Sidebar Fija Siempre Contraída (w-16 / 64px) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-16 select-none flex-col items-center border-r border-zinc-200/90 bg-white/95 text-zinc-900 shadow-[1px_0_16px_rgba(24,24,27,0.03)] backdrop-blur-md transition-transform duration-200 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Logo de la aplicación */}
        <div className="group relative flex h-14 w-full shrink-0 items-center justify-center border-b shadow-xs border-zinc-200">
          <Link
            href="/admin"
            className="flex h-10 w-10 items-center justify-center rounded-xl p-2 transition-all hover:scale-105 hover:bg-black/10 hover:border-zinc-300 active:scale-95"
            aria-label={brandTitle}
          >
            <Image src="/icon.svg" alt="Logo" width={22} height={22} priority />
          </Link>
          <div className="pointer-events-none absolute left-full ml-3.5 z-50 hidden flex-col rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white shadow-xl whitespace-nowrap group-hover:flex">
            <span className="font-semibold text-zinc-100">{brandTitle}</span>
            <span className="text-[11px] text-zinc-400">{brandSubtitle}</span>
          </div>
        </div>

        {/* Enlaces de navegación */}
        <nav aria-label="Navegación principal" className="flex min-h-0 flex-1 flex-col items-center gap-2.5 py-4 w-full">
          {showMenuPickerLink && (
            <div className="group relative flex w-full items-center justify-center">
              <Link
                href="/admin/menus"
                onClick={() => setMobileOpen(false)}
                aria-label="Cambiar menú"
                aria-current={isMenusPage ? "page" : undefined}
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ${
                  isMenusPage
                    ? "bg-[#182618] text-white shadow-2xs"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 active:scale-95"
                }`}
              >
                <LayoutGrid size={18} strokeWidth={isMenusPage ? 2.3 : 2} />
                {isMenusPage && (
                  <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#182618]" />
                )}
              </Link>
              <div className="pointer-events-none absolute left-full ml-3.5 z-50 hidden items-center rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white shadow-xl whitespace-nowrap group-hover:flex">
                <span>Cambiar menú</span>
              </div>
            </div>
          )}

          {navigation.map((item) => {
            const active = isActive(item);
            const Icon = item.icon as LucideIcon;
            return (
              <div key={item.href} className="group relative flex w-full items-center justify-center">
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 ${
                    active
                      ? "bg-[#182618] text-white shadow-2xs"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 active:scale-95"
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.3 : 2} />
                  {active && (
                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#182618]" />
                  )}
                </Link>
                <div className="pointer-events-none absolute left-full ml-3.5 z-50 hidden items-center rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white shadow-xl whitespace-nowrap group-hover:flex">
                  <span>{item.label}</span>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer con Cerrar Sesión */}
        <div className="mt-auto flex w-full shrink-0 flex-col items-center border-t border-zinc-100 py-3">
          <div className="group relative flex w-full items-center justify-center">
            <LogoutButton compact />
            <div className="pointer-events-none absolute left-full ml-3.5 z-50 hidden items-center rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white shadow-xl whitespace-nowrap group-hover:flex">
              <span>Cerrar sesión</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay para móviles */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-30 bg-zinc-950/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <button
        type="button"
        className="fixed right-4 top-4 z-30 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={18} />
      </button>

      {/* Contenido principal: vista completa para /admin/landing o contenedor con padding para settings */}
      <div className="md:pl-16">
        {isLandingPage ? (
          <div className="h-screen w-full flex flex-col">{children}</div>
        ) : (
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
        )}
      </div>
    </div>
  );
}
