"use client";

import { LayoutDashboard, PanelsTopLeft, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SuperadminNav() {
  const pathname = usePathname();
  const items = [{ href: "/superadmin", label: "Dashboard", icon: <LayoutDashboard size={15} /> }, { href: "/superadmin/clientes", label: "Clientes", icon: <Users size={15} /> }, { href: "/superadmin/plantillas", label: "Plantillas", icon: <PanelsTopLeft size={15} /> }];
  return <nav className="border-b border-zinc-200 bg-white" aria-label="Navegación de superadministración"><div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-8">{items.map((item) => { const active = pathname === item.href; return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium transition ${active ? "border-emerald-700 text-emerald-800" : "border-transparent text-zinc-500 hover:border-emerald-300 hover:text-emerald-800"}`}>{item.icon}{item.label}</Link>; })}</div></nav>;
}
