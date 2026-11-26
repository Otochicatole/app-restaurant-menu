import { AlertCircle, RefreshCw } from "lucide-react";
import { adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";

export const serviceInputClass = "min-h-10 min-w-0 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10 disabled:bg-stone-50 disabled:opacity-60";

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
    <div role="status" className="space-y-3 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-700 sm:p-5">
      <p>{message}</p>
      <div aria-hidden="true" className="h-2.5 w-2/3 rounded bg-stone-100 motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-2.5 w-1/2 rounded bg-stone-100 motion-safe:animate-pulse" />
    </div>
  );
}
