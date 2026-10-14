import { requireSuperAdmin } from "@/modules/identity-access/server";
import { LogoutButton } from "@/modules/identity-access/ui";
import { UtensilsCrossed } from "lucide-react";
import { SuperadminNav } from "./SuperadminNav";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();
  return (
    <div data-admin-panel className="min-h-screen bg-[#f8faf7] text-zinc-900">
      <header className="border-b border-zinc-200/90 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#182618] text-[#f5f2eb] shadow-xs">
              <UtensilsCrossed size={16} strokeWidth={2} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4a6341]">
                Plataforma
              </p>
              <p className="text-sm font-bold text-zinc-950">
                Superadmin
              </p>
            </div>
          </div>
          <div className="w-auto sm:w-36">
            <LogoutButton />
          </div>
        </div>
      </header>
      <SuperadminNav />
      {children}
    </div>
  );
}
