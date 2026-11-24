"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, ReceiptText, Search, Users } from "lucide-react";
import type { ServiceAccountView, ServiceUnservedGroup } from "@/modules/reservation-management/contracts";
import { transientButtonProps } from "@/ui/button-state";
import { getJoinedTableGroups, type FloorAllocationView, type FloorLocation, type FloorPose } from "../contracts";
import type { FloorTableCounts } from "./floor-table-summary";
import { FloorTableSummary } from "./FloorTableSummary";
import { FloorServiceAccounts, type FloorServiceTarget } from "./FloorServiceWindow";
import { floorSecondaryButtonClass } from "./floor-ui";

export type BoardInspectorTab = "summary" | "accounts" | "reservations";

export type BoardInspectorTableItem = {
  id: string;
  label: string;
  capacity: number;
  locationId?: string;
  state: "available" | "reserved" | "occupied";
  partySize?: number;
  readyQuantity?: number;
  hasPartialPayments?: boolean;
  customerName?: string;
  waiterName?: string;
};

type FloorBoardInspectorProps = {
  activeTab: BoardInspectorTab;
  onTabChange: (tab: BoardInspectorTab) => void;
  tableFilter: "all" | "available" | "reserved" | "occupied";
  onTableFilterChange: (filter: "all" | "available" | "reserved" | "occupied") => void;
  roomName: string;
  when: string;
  historical: boolean;
  canUseService: boolean;
  saving: boolean;
  tableCounts: FloorTableCounts | null;
  sectors: FloorLocation[];
  tables: BoardInspectorTableItem[];
  allocations: FloorAllocationView[];
  serviceAccounts: ServiceAccountView[];
  unservedGroups: ServiceUnservedGroup[];
  serviceLoading: boolean;
  serviceError: string | null;
  selectedAllocationId: string | null;
  onSelectAllocationId: (id: string | null) => void;
  onTableAction: (tableId: string) => void;
  onOpenService: (target: FloorServiceTarget) => void;
  onRecoverGroup: (group: ServiceUnservedGroup) => void;
  onRefreshService: () => void;
  onReleaseAllocation: (allocation: FloorAllocationView) => void;
  canReleaseAllocation: (allocation: FloorAllocationView) => boolean;
  serviceTargetsForAllocation: (allocation: FloorAllocationView) => FloorServiceTarget[];
  onCloseMobile?: () => void;
};

function serviceTargetFromAccount(account: ServiceAccountView): FloorServiceTarget | null {
  const tableId = account.tableIds.slice().sort()[0];
  if (!tableId) return null;
  return {
    allocationId: account.allocationId,
    customerName: account.customerName,
    reservationCode: account.reservationCode,
    tableLabels: account.tableLabels,
    tableId,
    partySize: account.partySize,
  };
}

const stateMeta: Record<BoardInspectorTableItem["state"], { label: string; badgeClass: string; chipClass: string }> = {
  available: {
    label: "Libre",
    badgeClass: "bg-[#e6f2f6] text-[#155e75] border-[#cad9df]",
    chipClass: "text-[#155e75] bg-[#e6f2f6]",
  },
  reserved: {
    label: "Reservada",
    badgeClass: "bg-[#f8ebe2] text-[#8c4b2e] border-[#e7cab8]",
    chipClass: "text-[#8c4b2e] bg-[#f8ebe2]",
  },
  occupied: {
    label: "Ocupada",
    badgeClass: "bg-[#dbeff5] text-[#0e4d63] border-[#9ec9d8]",
    chipClass: "text-[#0e4d63] bg-[#dbeff5]",
  },
};

export function FloorBoardInspector({
  activeTab,
  onTabChange,
  tableFilter,
  onTableFilterChange,
  roomName,
  when,
  historical,
  canUseService,
  saving,
  tableCounts,
  sectors,
  tables,
  allocations,
  serviceAccounts,
  unservedGroups,
  serviceLoading,
  serviceError,
  selectedAllocationId,
  onSelectAllocationId,
  onTableAction,
  onOpenService,
  onRecoverGroup,
  onRefreshService,
  onReleaseAllocation,
  canReleaseAllocation,
  serviceTargetsForAllocation,
  onCloseMobile,
}: FloorBoardInspectorProps) {
  const [tableSearch, setTableSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [reservationSearch, setReservationSearch] = useState("");

  const openAccountsCount = serviceAccounts.filter((acc) => !acc.closedAt).length;
  const visibleTab: BoardInspectorTab = !canUseService && activeTab === "accounts" ? "summary" : activeTab;

  const sectorNameById = new Map(sectors.map((sector) => [sector.id, sector.name]));
  const normalizedTableQuery = tableSearch.trim().toLocaleLowerCase("es-AR");
  const sortedTables = [...tables].sort((a, b) => a.label.localeCompare(b.label, "es-AR", { numeric: true }));
  const filteredTables = sortedTables.filter((table) => {
    if (tableFilter !== "all" && table.state !== tableFilter) return false;
    if (sectorFilter !== "all" && table.locationId !== sectorFilter) return false;
    if (!normalizedTableQuery) return true;
    const sectorName = (table.locationId && sectorNameById.get(table.locationId)) || "";
    return (
      table.label.toLocaleLowerCase("es-AR").includes(normalizedTableQuery) ||
      (table.customerName ?? "").toLocaleLowerCase("es-AR").includes(normalizedTableQuery) ||
      sectorName.toLocaleLowerCase("es-AR").includes(normalizedTableQuery)
    );
  });

  const detailAllocation = selectedAllocationId
    ? allocations.find((item) => item.id === selectedAllocationId) ?? null
    : null;
  const normalizedReservationQuery = reservationSearch.trim().toLocaleLowerCase("es-AR");
  const filteredAllocations = allocations.filter((allocation) => {
    if (!normalizedReservationQuery) return true;
    const tableLabels = allocation.poses.map((pose) => pose.label).join(" ");
    return (
      allocation.customerName.toLocaleLowerCase("es-AR").includes(normalizedReservationQuery) ||
      allocation.code.toLocaleLowerCase("es-AR").includes(normalizedReservationQuery) ||
      tableLabels.toLocaleLowerCase("es-AR").includes(normalizedReservationQuery)
    );
  });

  const tabs: { id: BoardInspectorTab; label: string; count?: number }[] = [
    { id: "summary", label: "Sala" },
    ...(canUseService ? [{ id: "accounts" as const, label: "Cuentas", count: openAccountsCount }] : []),
    { id: "reservations", label: "Reservas", count: allocations.length },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-white text-[var(--floor-ink,#173642)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--floor-border,#cad9df)] px-3 py-2">
        <div role="tablist" aria-label="Panel operativo de sala" className="grid min-w-0 flex-1 grid-flow-col gap-1 rounded-lg bg-[#eef4f6] p-1">
          {tabs.map((tab) => {
            const active = visibleTab === tab.id;
            return (
              <button
                key={tab.id}
                {...transientButtonProps}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (tab.id !== "reservations") onSelectAllocationId(null);
                  onTabChange(tab.id);
                }}
                className={`inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#0e7490)] ${
                  active
                    ? "bg-white text-[var(--floor-ink,#173642)] shadow-xs"
                    : "text-[var(--floor-muted,#4b6470)] hover:text-[var(--floor-ink,#173642)]"
                }`}
              >
                <span className="truncate">{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                      active ? "bg-[#e6f2f6] text-[#155e75]" : "bg-white/80 text-[#4b6470]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {onCloseMobile && (
          <button
            {...transientButtonProps}
            type="button"
            onClick={onCloseMobile}
            className="inline-flex h-8 shrink-0 items-center rounded-lg border border-[var(--floor-border,#cad9df)] bg-white px-2.5 text-xs font-semibold text-[var(--floor-ink,#173642)] hover:bg-[var(--floor-hover,#e6f2f6)] xl:hidden"
          >
            Cerrar
          </button>
        )}
      </div>

      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-4">
        {visibleTab === "summary" && (
          <div className="space-y-4">
            {tableCounts && (
              <section className="rounded-xl border border-[var(--floor-border,#cad9df)] bg-[#f7fbfc] p-3">
                <FloorTableSummary embedded counts={tableCounts} />
              </section>
            )}

            <section aria-label="Listado rápido de mesas" className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--floor-muted,#4b6470)]">
                  Mesas activas ({filteredTables.length})
                </h2>
                {sectors.length > 1 && (
                  <select
                    aria-label="Filtrar mesas por sector"
                    value={sectorFilter}
                    onChange={(event) => setSectorFilter(event.target.value)}
                    className="h-7 max-w-36 rounded-lg border border-[var(--floor-border,#cad9df)] bg-white px-2 text-xs font-medium text-[var(--floor-ink,#173642)] outline-none focus:border-[var(--floor-focus,#0e7490)]"
                  >
                    <option value="all">Todos los sectores</option>
                    {sectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div role="group" aria-label="Filtrar por estado de mesa" className="grid grid-cols-4 gap-1 rounded-lg bg-[#eef4f6] p-1">
                {(
                  [
                    { id: "all", label: "Todas" },
                    { id: "available", label: "Libres" },
                    { id: "reserved", label: "Reserv." },
                    { id: "occupied", label: "Ocup." },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={tableFilter === option.id}
                    onClick={() => onTableFilterChange(option.id)}
                    className={`rounded-md py-1 text-[11px] font-semibold transition-colors ${
                      tableFilter === option.id
                        ? "bg-white text-[var(--floor-ink,#173642)] shadow-xs"
                        : "text-[var(--floor-muted,#4b6470)] hover:text-[var(--floor-ink,#173642)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {tables.length > 5 && (
                <div className="relative">
                  <Search size={14} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2.5 my-auto text-[#4b6470]" />
                  <input
                    type="search"
                    aria-label="Buscar mesa o cliente"
                    placeholder="Buscar mesa, sector o cliente…"
                    value={tableSearch}
                    onChange={(event) => setTableSearch(event.target.value)}
                    className="h-9 w-full rounded-lg border border-[var(--floor-border,#cad9df)] bg-white pl-8 pr-3 text-xs text-[var(--floor-ink,#173642)] outline-none focus:border-[var(--floor-focus,#0e7490)]"
                  />
                </div>
              )}

              {!filteredTables.length ? (
                <p className="rounded-xl border border-dashed border-[var(--floor-border,#cad9df)] p-4 text-center text-xs text-[var(--floor-muted,#4b6470)]">
                  No hay mesas que coincidan con el filtro actual.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {filteredTables.map((table) => {
                    const meta = stateMeta[table.state];
                    const sectorName = table.locationId ? sectorNameById.get(table.locationId) : undefined;
                    const canTrigger = canUseService && (!historical || table.state !== "available");
                    const content = (
                      <>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className={`inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border px-2 text-xs font-bold tabular-nums ${meta.badgeClass}`}>
                            {table.label}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-[var(--floor-ink,#173642)]">
                              {table.customerName ? table.customerName : `Mesa ${table.label}`}
                            </p>
                            <p className="truncate text-[11px] text-[var(--floor-muted,#4b6470)]">
                              {[
                                sectorName,
                                `${table.partySize ?? table.capacity}p`,
                                table.waiterName ? `Mozo: ${table.waiterName}` : undefined,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {Boolean(table.readyQuantity && table.readyQuantity > 0) && (
                            <span
                              title="Platos listos para retirar"
                              className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 tabular-nums"
                            >
                              <CheckCircle2 size={10} aria-hidden="true" />
                              {table.readyQuantity}
                            </span>
                          )}
                          {table.hasPartialPayments && (
                            <span
                              title="Cuenta con pagos parciales"
                              className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900"
                            >
                              Parcial
                            </span>
                          )}
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${meta.chipClass}`}>
                            {meta.label}
                          </span>
                        </div>
                      </>
                    );
                    return (
                      <li key={table.id}>
                        {canTrigger ? (
                          <button
                            {...transientButtonProps}
                            type="button"
                            disabled={saving}
                            aria-label={`Gestionar mesa ${table.label}`}
                            onClick={() => onTableAction(table.id)}
                            className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--floor-border,#cad9df)] bg-white px-2.5 py-2 text-left transition-colors hover:border-[var(--floor-border-hover,#9fb8c3)] hover:bg-[var(--floor-hover,#e6f2f6)] focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#0e7490)] disabled:opacity-50"
                          >
                            {content}
                          </button>
                        ) : (
                          <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--floor-border,#cad9df)] bg-white/80 px-2.5 py-2">
                            {content}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}

        {visibleTab === "accounts" && canUseService && (
          <FloorServiceAccounts
            accounts={serviceAccounts}
            unserved={unservedGroups}
            loading={serviceLoading}
            error={serviceError}
            historical={historical}
            onRefresh={onRefreshService}
            onRecover={onRecoverGroup}
            onChoose={(account) => {
              const target = serviceTargetFromAccount(account);
              if (target) onOpenService(target);
            }}
          />
        )}

        {visibleTab === "reservations" && (
          <section aria-label={`Reservas de ${roomName}`} className="space-y-3">
            {detailAllocation ? (
              <section aria-label="Detalle de la reserva" className="space-y-3">
                <button
                  {...transientButtonProps}
                  type="button"
                  onClick={() => onSelectAllocationId(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--floor-action,#155e75)] hover:underline"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  Volver a reservas
                </button>
                <div className="rounded-xl border border-[var(--floor-border,#cad9df)] bg-[#f7fbfc] p-3.5">
                  <AllocationCard
                    allocation={detailAllocation}
                    serviceTargets={canUseService ? serviceTargetsForAllocation(detailAllocation) : []}
                    onService={onOpenService}
                    onRelease={canReleaseAllocation(detailAllocation) ? () => onReleaseAllocation(detailAllocation) : undefined}
                  />
                </div>
              </section>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--floor-ink,#173642)]">Reservas de {roomName}</h2>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-[var(--floor-muted,#4b6470)]">
                      <Clock3 size={12} aria-hidden="true" />
                      {when} · {allocations.length} grupos con mesas asignadas.
                    </p>
                  </div>
                </div>

                {allocations.length > 4 && (
                  <div className="relative">
                    <Search size={14} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2.5 my-auto text-[#4b6470]" />
                    <input
                      type="search"
                      aria-label="Buscar reserva"
                      placeholder="Buscar por nombre, código o mesa…"
                      value={reservationSearch}
                      onChange={(event) => setReservationSearch(event.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--floor-border,#cad9df)] bg-white pl-8 pr-3 text-xs text-[var(--floor-ink,#173642)] outline-none focus:border-[var(--floor-focus,#0e7490)]"
                    />
                  </div>
                )}

                {!filteredAllocations.length ? (
                  <p className="rounded-xl border border-dashed border-[var(--floor-border,#cad9df)] p-5 text-center text-xs text-[var(--floor-muted,#4b6470)]">
                    {allocations.length ? "No hay reservas que coincidan con tu búsqueda." : "No hay reservas asignadas para este horario."}
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {filteredAllocations.map((allocation) => (
                      <div
                        key={allocation.id}
                        className="rounded-xl border border-[var(--floor-border,#cad9df)] bg-white p-3"
                      >
                        <AllocationCard
                          allocation={allocation}
                          serviceTargets={canUseService ? serviceTargetsForAllocation(allocation) : []}
                          onService={onOpenService}
                          onDetails={() => onSelectAllocationId(allocation.id)}
                          onRelease={canReleaseAllocation(allocation) ? () => onReleaseAllocation(allocation) : undefined}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export function AllocationCard({
  allocation,
  onDetails,
  onRelease,
  serviceTargets = [],
  onService,
}: {
  allocation: FloorAllocationView;
  onDetails?: () => void;
  onRelease?: () => void;
  serviceTargets?: FloorServiceTarget[];
  onService?: (target: FloorServiceTarget) => void;
}) {
  return (
    <article className="space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[var(--floor-ink,#173642)]">{allocation.customerName}</h3>
          <p className="mt-0.5 text-xs text-[var(--floor-muted,#4b6470)]">
            {allocation.poses.map((pose: FloorPose) => pose.label).join(" + ")} · {allocation.time} hs
            {allocation.source === "WALK_IN" && " · Sin reserva"}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-[var(--floor-muted,#4b6470)]">{allocation.code}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-[var(--floor-hover,#e6f2f6)] px-2 py-1 text-xs font-semibold text-[var(--floor-action,#155e75)] tabular-nums">
          <Users size={13} aria-hidden="true" />
          {allocation.partySize}
        </span>
      </div>
      {allocation.serviceConflict && (
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-950">
          Las mesas siguen ocupadas por una cuenta anterior.
        </p>
      )}
      {allocation.serviceOverrun && (
        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-950">
          Servicio activo fuera del horario previsto.
        </p>
      )}
      {allocation.notes && (
        <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--floor-muted,#4b6470)]">{allocation.notes}</p>
      )}
      <div className="flex flex-wrap gap-2 pt-0.5">
        {onDetails && (
          <button {...transientButtonProps} type="button" className={`${floorSecondaryButtonClass} min-h-8 px-2.5 text-xs`} onClick={onDetails}>
            Ver detalle
          </button>
        )}
        {onRelease && (
          <button {...transientButtonProps} type="button" className={`${floorSecondaryButtonClass} min-h-8 px-2.5 text-xs`} onClick={onRelease}>
            Liberar mesas
          </button>
        )}
        {onService &&
          serviceTargets.map((target) => (
            <button
              key={target.tableId}
              type="button"
              className={`${floorSecondaryButtonClass} min-h-8 px-2.5 text-xs`}
              onClick={() => onService(target)}
            >
              <ReceiptText size={13} aria-hidden="true" />
              Cuenta {target.tableLabels.join(" + ")}
            </button>
          ))}
      </div>
    </article>
  );
}

export function buildAllocationTargets(allocation: FloorAllocationView): FloorServiceTarget[] {
  return getJoinedTableGroups(allocation.poses).map((group) => ({
    allocationId: allocation.id,
    customerName: allocation.customerName,
    reservationCode: allocation.code,
    tableLabels: group.map(({ label }) => label),
    tableId: group.map(({ tableId }) => tableId).sort()[0],
    partySize: allocation.partySize,
  }));
}
