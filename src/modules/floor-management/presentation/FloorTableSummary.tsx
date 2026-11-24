"use client";

import { useId } from "react";
import type { FloorTableCounts } from "./floor-table-summary";

const explanation =
  "Mesas fijas activas por sector en el horario consultado y ocupación respecto al cupo configurado. Las cuentas abiertas y asignaciones reflejan el estado operativo.";

export function FloorTableSummary({ counts, embedded = false }: { counts: FloorTableCounts; embedded?: boolean }) {
  const descriptionId = useId();
  const wrapperClass = embedded
    ? "w-full min-w-0 text-[var(--floor-ink,#173642)]"
    : "w-fit max-w-full rounded-lg bg-white px-3 py-2 text-[var(--floor-ink,#173642)] shadow-[0_2px_10px_rgba(15,45,58,0.08)]";
  return <div role="group" aria-label="Mesas del salón" aria-describedby={descriptionId} title={explanation} className={wrapperClass}>
    <dl aria-live="polite" aria-atomic="true" className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <div className="flex items-baseline gap-1.5"><dt className="text-[11px] text-[var(--floor-muted,#4b6470)]">Libres</dt><dd className="text-sm font-semibold tabular-nums text-[var(--floor-action,#155e75)]">{counts.free}</dd></div>
      <div className="flex items-baseline gap-1.5"><dt className="text-[11px] text-[var(--floor-muted,#4b6470)]">Reservadas</dt><dd className="text-sm font-semibold tabular-nums text-[#8c4b2e]">{counts.reserved}</dd></div>
      <div className="flex items-baseline gap-1.5"><dt className="text-[11px] text-[var(--floor-muted,#4b6470)]">Ocupadas</dt><dd className="text-sm font-semibold tabular-nums text-[#0e7490]">{counts.occupied}</dd></div>
      <div className="flex items-baseline gap-1.5"><dt className="text-[11px] text-[var(--floor-muted,#4b6470)]">Activas</dt><dd className="text-sm font-semibold tabular-nums">{counts.total}</dd></div>
      {counts.inactive > 0 && <div className="flex items-baseline gap-1.5"><dt className="text-[11px] text-[var(--floor-muted,#4b6470)]">Inactivas</dt><dd className="text-sm font-semibold tabular-nums">{counts.inactive}</dd></div>}
    </dl>
    {counts.sectors.length > 0 && <div className="mt-2 border-t border-[var(--floor-border,#dbe5e9)] pt-2">
      <p className="mb-1 text-[11px] font-semibold text-[var(--floor-muted,#4b6470)]">Sectores y cupos</p>
      <ul role="list" aria-label="Estado por sector" tabIndex={counts.sectors.length > 4 ? 0 : undefined}
        className="pointer-events-auto grid max-h-32 gap-1 overflow-y-auto overscroll-contain rounded focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#155e75)] [scrollbar-width:thin]">
        {counts.sectors.map((sector) => {
          const warn = sector.status === "warning" || sector.status === "exceeded";
          const peopleLabel = sector.maxCapacity != null ? `${sector.occupiedPartySize}/${sector.maxCapacity}p` : `${sector.occupiedPartySize}p`;
          const tableLabel = `${sector.freeTables}/${sector.placedTables} libres`;
          return (
            <li
              key={sector.locationId}
              className={`flex items-baseline justify-between gap-3 rounded px-1.5 py-0.5 text-xs ${sector.status === "exceeded" ? "bg-amber-100 text-amber-950" : sector.status === "warning" ? "bg-amber-50 text-amber-900" : ""}`}
            >
              <span className="min-w-0 truncate font-medium">
                {sector.name}
                {sector.status === "exceeded" && " · Cupo superado"}
                {sector.status === "warning" && " · Cerca del cupo"}
              </span>
              <span className={`shrink-0 font-semibold tabular-nums ${warn ? "text-amber-900" : "text-[var(--floor-action,#155e75)]"}`}>
                {tableLabel} · {peopleLabel}
              </span>
            </li>
          );
        })}
      </ul>
    </div>}
    <span id={descriptionId} className="sr-only">{explanation}</span>
  </div>;
}
