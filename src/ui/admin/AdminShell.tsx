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

  const isActive = (item: (typeof navigation)[number]) => item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div data-admin-panel className="min-h-screen bg-[#f5f7f3] text-zinc-900">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-zinc-200/80 bg-emerald-950 px-5 py-6 text-white transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-3">
            <Link href="/admin" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-200 text-emerald-950"><UtensilsCrossed size={19} strokeWidth={2.5} /></span>
              <span>
                <span className="block text-sm font-bold tracking-wide">{brandTitle}</span>
                <span className="block text-xs text-emerald-200">{brandSubtitle}</span>
              </span>
            </Link>
            <button type="button" className="rounded-lg px-2 py-1 text-emerald-200 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><X size={19} /></button>
          </div>
          <p className="mt-12 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">Espacio de trabajo</p>
          <nav className="mt-3 space-y-1">
            {navigation.map((item) => {
              const active = isActive(item);
              const Icon = item.icon as LucideIcon;
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? "bg-white text-emerald-950 shadow-lg shadow-emerald-950/20" : "text-emerald-100 hover:bg-emerald-900 hover:text-white"}`}>
                  <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              );
            })}
            <Link href={menuHref} target="_blank" rel="noreferrer" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-emerald-100 transition hover:bg-emerald-900 hover:text-white">
              <ExternalLink size={17} />
              Ver menú público
            </Link>
          </nav>
          <div className="mt-auto rounded-2xl border border-emerald-800 bg-emerald-900/70 p-4">
            <p className="text-xs font-semibold text-white">Mantené tu menú actualizado</p>
            <p className="mt-1 text-xs leading-5 text-emerald-200">Administrá todo tu contenido desde un solo lugar.</p>
          </div>
          <div className="mt-4 border-t border-emerald-800 pt-4"><LogoutButton /></div>
        </div>
      </aside>
      {mobileOpen && <button type="button" aria-label="Cerrar navegación" className="fixed inset-0 z-30 bg-zinc-950/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <button type="button" className="fixed right-4 top-4 z-30 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu size={18} /></button>
      <div className="lg:pl-72">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
