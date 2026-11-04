"use client";

import { useId } from "react";
import type { FloorTableCounts } from "./floor-table-summary";

const explanation = "Mesas físicas del salón según las asignaciones guardadas para el horario consultado, incluida la preparación. Libres son mesas activas sin asignación; la disponibilidad final se valida al armar. Los borradores no modifican estos conteos.";

export function FloorTableSummary({ counts }: { counts: FloorTableCounts }) {
  const descriptionId = useId();
  return <div role="group" aria-label="Mesas del salón" aria-describedby={descriptionId} title={explanation} className="w-fit max-w-full rounded-lg bg-white px-3 py-2 text-[var(--floor-ink,#173642)] shadow-[0_2px_10px_rgba(15,45,58,0.08)]">
    <dl aria-live="polite" aria-atomic="true" className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <div className="flex items-baseline gap-1.5"><dt className="text-[11px] text-[var(--floor-muted,#4b6470)]">Libres</dt><dd className="text-sm font-semibold tabular-nums text-[var(--floor-action,#155e75)]">{counts.free}</dd></div>
      <div className="flex items-baseline gap-1.5"><dt className="text-[11px] text-[var(--floor-muted,#4b6470)]">Ocupadas</dt><dd className="text-sm font-semibold tabular-nums text-[#8c4b2e]">{counts.occupied}</dd></div>
      <div className="flex items-baseline gap-1.5"><dt className="text-[11px] text-[var(--floor-muted,#4b6470)]">Activas</dt><dd className="text-sm font-semibold tabular-nums">{counts.total}</dd></div>
      {counts.inactive > 0 && <div className="flex items-baseline gap-1.5"><dt className="text-[11px] text-[var(--floor-muted,#4b6470)]">Inactivas</dt><dd className="text-sm font-semibold tabular-nums">{counts.inactive}</dd></div>}
    </dl>
    <span id={descriptionId} className="sr-only">{explanation}</span>
  </div>;
}
