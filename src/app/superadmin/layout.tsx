import { requireSuperAdmin } from "@/modules/identity-access/server";
import { LogoutButton } from "@/modules/identity-access/ui";
import { UtensilsCrossed } from "lucide-react";
import { SuperadminNav } from "./SuperadminNav";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return <div data-admin-panel className="min-h-screen bg-[#f5f7f3] text-zinc-900"><header className="border-b border-emerald-900 bg-emerald-950 text-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-200 text-emerald-950"><UtensilsCrossed size={18} strokeWidth={2.5} /></span><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-200">Plataforma</p><p className="mt-1 text-sm font-semibold text-white sm:text-base">Administración general</p></div></div><div className="flex items-center gap-4"><span className="hidden text-xs font-medium text-emerald-200 md:block">Sesión de superadministrador</span><div className="w-auto sm:w-40"><LogoutButton /></div></div></div></header><SuperadminNav />{children}</div>;
}
