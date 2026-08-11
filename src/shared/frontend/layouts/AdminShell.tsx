"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoutButton } from "@/shared/frontend/components/LogoutButton";

const navigation = [
  { label: "Overview", href: "/admin", exact: true },
  { label: "Catalog", href: "/admin/catalog" },
  { label: "Home page", href: "/admin/home-page" },
  { label: "Featured", href: "/admin/featured-products" },
];

export function AdminShell({ children, brandTitle, brandSubtitle }: { children: React.ReactNode; brandTitle: string; brandSubtitle: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: (typeof navigation)[number]) => item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <div className="min-h-screen bg-[#f5f7f3] text-zinc-900">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-zinc-200/80 bg-emerald-950 px-5 py-6 text-white transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-3">
            <Link href="/admin" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-200 text-sm font-black text-emerald-950">{brandTitle.charAt(0).toUpperCase()}</span>
              <span>
                <span className="block text-sm font-bold tracking-wide">{brandTitle}</span>
                <span className="block text-xs text-emerald-200">{brandSubtitle}</span>
              </span>
            </Link>
            <button type="button" className="rounded-lg px-2 py-1 text-emerald-200 lg:hidden" onClick={() => setMobileOpen(false)}>x</button>
          </div>
          <p className="mt-12 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">Workspace</p>
          <nav className="mt-3 space-y-1">
            {navigation.map((item) => {
              const active = isActive(item);
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${active ? "bg-white text-emerald-950 shadow-lg shadow-emerald-950/20" : "text-emerald-100 hover:bg-emerald-900 hover:text-white"}`}>
                  <span className={`h-2 w-2 rounded-full ${active ? "bg-amber-500" : "bg-emerald-500"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto rounded-2xl border border-emerald-800 bg-emerald-900/70 p-4">
            <p className="text-xs font-semibold text-white">Keep your menu fresh</p>
            <p className="mt-1 text-xs leading-5 text-emerald-200">Manage your menu content from one place.</p>
          </div>
          <div className="mt-4 border-t border-emerald-800 pt-4"><LogoutButton /></div>
        </div>
      </aside>
      {mobileOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-30 bg-zinc-950/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[#f5f7f3]/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-8">
            <button type="button" className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 lg:hidden" onClick={() => setMobileOpen(true)}>Menu</button>
            <div className="hidden text-sm text-zinc-500 lg:block">Admin workspace <span className="mx-2 text-zinc-300">/</span> {navigation.find((item) => isActive(item))?.label ?? "Overview"}</div>
            <Link href="/" target="_blank" className="rounded-xl px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">View menu</Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
