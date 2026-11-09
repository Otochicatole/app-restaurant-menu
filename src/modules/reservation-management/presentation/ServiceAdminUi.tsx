import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";

export const serviceInputClass = "min-h-11 min-w-0 rounded-lg border border-[#d7dfd4] bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-[#3d5934] focus:ring-2 focus:ring-[#3d5934]/25 disabled:opacity-60";

export function ServiceAdminNavigation({ restaurantId, current }: { restaurantId: string; current: "cash" | "products" }) {
  const cashPath = `/admin/restaurants/${encodeURIComponent(restaurantId)}/cash`;
  return (
    <nav aria-label="Caja y catálogo" className="flex gap-4 border-b border-[#dce4d9]">
      {([{ id: "cash", name: "Recibos y cierre", href: cashPath }, { id: "products", name: "Catálogo", href: `${cashPath}/products` }] as const).map(({ id, name, href }) => (
        <Link key={id} href={href} aria-current={id === current ? "page" : undefined} className={`flex min-h-11 items-center border-b-2 px-2 text-sm font-semibold focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-[#3d5934] ${id === current ? "border-[#3d5934] text-[#263e23]" : "border-transparent text-zinc-600 hover:border-[#cbd8c7] hover:text-[#263e23]"}`}>
          {name}
        </Link>
      ))}
    </nav>
  );
}

export function ServiceLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <p role="alert" className="flex items-start gap-2 text-sm text-red-900"><AlertCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />{message}</p>
      <button type="button" className={adminSecondaryButtonClass} onClick={onRetry}><RefreshCw size={15} aria-hidden="true" /> Reintentar</button>
    </div>
  );
}

export function ServiceLoading({ message }: { message: string }) {
  return (
    <div role="status" className="space-y-3 rounded-xl border border-[#dce4d9] bg-white p-4 text-sm text-zinc-700 sm:p-5">
      <p>{message}</p>
      <div aria-hidden="true" className="h-2.5 w-2/3 rounded bg-[#e9eee7] motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-2.5 w-1/2 rounded bg-[#e9eee7] motion-safe:animate-pulse" />
    </div>
  );
}
