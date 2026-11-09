import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { adminPrimaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { type ReservationStatus } from "../contracts";
import { reservationWorkspace } from "./reservation-workspace";
import { STATUS_LABEL } from "./reservation-labels";

export const STATUS_BADGE_CLASSES: Record<ReservationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-950 border-amber-200 font-medium",
  CONFIRMED: "bg-[#e3eee0] text-[#294525] border-[#d6e5d3] font-medium",
  COMPLETED: "bg-zinc-100 text-zinc-700 border-zinc-200 font-medium",
  CANCELLED: "bg-red-50 text-red-800 border-red-200 font-medium",
  REJECTED: "bg-zinc-100 text-zinc-700 border-zinc-200 font-medium",
};

export function PreferredSector({ label }: { label: string }) {
  if (!label) return null;
  return <p className="mb-1 flex flex-wrap items-baseline gap-x-1.5 text-xs text-zinc-700">
    <span>Sector preferido</span><strong className="break-words font-semibold text-zinc-950">{label}</strong>
  </p>;
}

export const agendaActionClass = "inline-flex min-h-11 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm text-zinc-700 transition-colors hover:bg-[#edf2ea] hover:text-[#263e23] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d5934] disabled:opacity-50";
export const reservationInputClass = "min-h-11 rounded-lg border border-[#d7dfd4] bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-600 focus:border-[#3d5934] focus:ring-2 focus:ring-[#3d5934]/25 disabled:bg-zinc-100";

export function ReservationSelect({ label, children, ...props }: React.ComponentProps<"select"> & { label: string }) {
  return (
    <span className="relative block min-w-0">
      <select {...props} aria-label={label} className={`${reservationInputClass} w-full min-w-0 pr-8`}>{children}</select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600" aria-hidden="true" />
    </span>
  );
}

export function ReservationField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 space-y-1.5"><span className="block text-sm font-medium text-zinc-800">{label}</span>{children}</label>;
}

export function ReservationSectionHeader({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#182618] sm:text-2xl">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
      </div>
      {action && <button type="button" onClick={onAction} className={adminPrimaryButtonClass}><Plus size={16} aria-hidden="true" />{action}</button>}
    </div>
  );
}

export function ReservationStatusLabel({ status }: { status: ReservationStatus }) {
  return <span className={`inline-flex w-fit items-center rounded-md px-2 py-1 text-xs ${STATUS_BADGE_CLASSES[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function useReservationClipboard() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode((previous) => previous === id ? null : previous), 2000);
  };
  return { copiedCode, copyToClipboard };
}

export function ReservationWriteError({ dialogId }: { dialogId: number }) {
  const error = reservationWorkspace.useSelector(({ feedback }) =>
    feedback?.type === "error" && feedback.dialogId === dialogId ? feedback.message : null);
  return error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>;
}
