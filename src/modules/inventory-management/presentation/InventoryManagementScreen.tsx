"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownUp,
  Boxes,
  ChefHat,
  Clock3,
  PackagePlus,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  Truck,
} from "lucide-react";
import {
  AdminCard,
  AdminPageHeader,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/ui/admin/AdminPrimitives";
import { matchesNormalizedSearch } from "@/platform/text/search";
import type {
  InventoryMovementKind,
  InventorySnapshot,
  StockStatus,
  StockWarningView,
} from "../contracts";
import { formatBaseQuantityMilli, formatIngredientQuantity } from "../domain/inventory-policy";
import { fetchInventorySnapshot, formatInventoryMoney, type InventoryCommandResponse } from "./inventory-client";
import {
  InventoryDialogs,
  formatStockWarningsSummary,
  type InventoryDialogState,
} from "./InventoryDialogs";

type InventoryTab = "items" | "suppliers" | "recipes" | "history";

const movementLabels: Record<InventoryMovementKind, string> = {
  PURCHASE_IN: "Compra / Entrada",
  SALE_CONSUMPTION: "Venta en sala",
  SALE_REVERSAL: "Anulación en sala",
  RECIPE_PREPARATION: "Preparación",
  MANUAL_ADJUSTMENT: "Ajuste manual",
};

const stockStatusBadge: Record<StockStatus, { label: string; className: string }> = {
  OK: { label: "Normal", className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  LOW: { label: "Reabastecer", className: "border-amber-200 bg-amber-50 text-amber-950" },
  OUT: { label: "Sin stock", className: "border-red-200 bg-red-50 text-red-900" },
};

export function InventoryManagementScreen({ restaurantId }: { restaurantId: string }) {
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<InventoryTab>("items");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<InventoryDialogState | null>(null);
  const [notice, setNotice] = useState("");
  const [warnings, setWarnings] = useState<StockWarningView[]>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      setSnapshot(await fetchInventorySnapshot(restaurantId));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo cargar el inventario.");
    }
  }, [restaurantId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [load]);

  const handleCompleted = (message: string, result: InventoryCommandResponse) => {
    setDialog(null);
    setNotice(message);
    setWarnings(result.warnings);
    setSnapshot(result.snapshot);
  };

  const activeItems = (snapshot?.items ?? []).filter((item) => item.active);
  const activeSuppliers = (snapshot?.suppliers ?? []).filter((supplier) => supplier.active);
  const activeRecipes = (snapshot?.recipes ?? []).filter((recipe) => recipe.active);
  const pendingProposalsCount = (snapshot?.proposals ?? []).filter((proposal) => proposal.status === "PENDING").length;

  const filteredItems = activeItems.filter((item) =>
    matchesNormalizedSearch(search, [item.name, item.code, item.supplierName]),
  );
  const filteredSuppliers = activeSuppliers.filter((supplier) =>
    matchesNormalizedSearch(search, [supplier.name, supplier.contactName, supplier.phone]),
  );
  const filteredRecipes = activeRecipes.filter((recipe) =>
    matchesNormalizedSearch(search, [recipe.name, recipe.code]),
  );
  const filteredMovements = (snapshot?.movements ?? []).filter((mov) =>
    matchesNormalizedSearch(search, [mov.itemName, mov.itemCode, mov.referenceLabel, mov.notes]),
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Inventario, proveedores y recetas"
        description="Registrá insumos, entradas de proveedores, recetas con ingredientes y envialos a aprobar para publicarlos en el Catálogo."
        actions={
          <>
            <Link
              href={`/admin/restaurants/${restaurantId}/products`}
              className={`${adminSecondaryButtonClass} whitespace-nowrap px-3.5 py-2`}
            >
              <span>Catálogo</span>
              {pendingProposalsCount > 0 && (
                <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[11px] font-bold leading-none text-amber-950 tabular-nums">
                  {pendingProposalsCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              className={`${adminSecondaryButtonClass} whitespace-nowrap px-3.5 py-2`}
              onClick={() => setDialog({ kind: "supplier" })}
            >
              <Truck size={16} aria-hidden="true" /> Proveedor
            </button>
            <button
              type="button"
              className={`${adminSecondaryButtonClass} whitespace-nowrap px-3.5 py-2`}
              onClick={() => setDialog({ kind: "recipe" })}
              disabled={activeItems.length === 0}
            >
              <ChefHat size={16} aria-hidden="true" /> Receta
            </button>
            <button
              type="button"
              className={`${adminPrimaryButtonClass} whitespace-nowrap px-4 py-2`}
              onClick={() => setDialog({ kind: "item" })}
            >
              <Plus size={16} aria-hidden="true" /> Nuevo insumo
            </button>
          </>
        }
      />

      {notice && (
        <p role="status" className="rounded-xl bg-[#e8efe6] px-4 py-3 text-sm font-medium text-[#263e23]">
          {notice}
        </p>
      )}

      {warnings.length > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="flex items-center gap-2">
            <AlertTriangle size={16} aria-hidden="true" />
            <span><strong>Aviso de consumo:</strong> {formatStockWarningsSummary(warnings)}</span>
          </p>
          <button type="button" className="text-xs font-semibold underline" onClick={() => setWarnings([])}>Descartar</button>
        </div>
      )}

      {snapshot && snapshot.alerts.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={16} aria-hidden="true" />
              Alertas de reabastecimiento ({snapshot.alerts.length})
            </p>
            <span className="text-xs text-amber-900">Productos en cero o por debajo del límite mínimo</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {snapshot.alerts.slice(0, 8).map((alert) => {
              const targetItem = activeItems.find((entry) => entry.id === alert.inventoryItemId);
              return (
                <button
                  key={alert.inventoryItemId}
                  type="button"
                  onClick={() => targetItem && setDialog({ kind: "purchase", item: targetItem })}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 shadow-2xs transition hover:border-amber-400 hover:bg-amber-100"
                >
                  <span>{alert.name}</span>
                  <strong className="tabular-nums">{formatBaseQuantityMilli(alert.currentStockMilli, alert.unit)}</strong>
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">+ Reponer</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!snapshot && !error && (
        <AdminCard>
          <p role="status" className="p-6 text-sm text-zinc-600">Cargando inventario y recetas…</p>
        </AdminCard>
      )}

      {error && (
        <AdminCard>
          <div className="flex flex-wrap items-center justify-between gap-3 p-6">
            <p role="alert" className="text-sm text-red-800">{error}</p>
            <button type="button" className={adminSecondaryButtonClass} onClick={() => void load()}>Reintentar</button>
          </div>
        </AdminCard>
      )}

      {snapshot && (
        <AdminCard>
          <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div role="tablist" aria-label="Secciones de inventario" className="inline-flex flex-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              {([
                ["items", "Inventario", Boxes, activeItems.length],
                ["suppliers", "Proveedores", Truck, activeSuppliers.length],
                ["recipes", "Recetas", ChefHat, activeRecipes.length],
                ["history", "Historial de consumo", Clock3, snapshot.movements.length],
              ] as const).map(([key, label, Icon, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  onClick={() => setTab(key)}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    tab === key ? "bg-[#263e23] text-white shadow-xs" : "text-zinc-700 hover:bg-white"
                  }`}
                >
                  <Icon size={14} aria-hidden="true" />
                  <span>{label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${tab === key ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-700"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative sm:w-72">
              <Search size={15} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                aria-label="Buscar en inventario"
                placeholder="Buscar por nombre o código…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-10 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-950 outline-none focus:border-[#3d5934]"
              />
            </div>
          </div>

          {tab === "items" && (
            filteredItems.length === 0 ? (
              <EmptyState title="No hay productos en inventario" body="Registrá tu primer ingrediente o insumo para empezar a controlar el stock y armar recetas." />
            ) : (
              <ul className="divide-y divide-zinc-100" aria-label="Tabla de productos de inventario">
                {filteredItems.map((item) => {
                  const status = stockStatusBadge[item.stockStatus];
                  return (
                    <li key={item.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 sm:px-5">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700">{item.code}</span>
                          <p className="text-sm font-semibold text-zinc-950">{item.name}</p>
                          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                          {item.isDirectSale && (
                            <span className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900">Venta directa</span>
                          )}
                          {item.linkedProductId && (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">En Catálogo</span>
                          )}
                          {!item.linkedProductId && item.pendingProposalId && (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950">Pendiente de aprobación</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600">
                          Stock: <strong className="text-zinc-900">{formatBaseQuantityMilli(item.currentStockMilli, item.unit)}</strong>
                          {" · "}Mínimo: {formatBaseQuantityMilli(item.minStockMilli, item.unit)}
                          {" · "}Costo: {formatInventoryMoney(item.unitCostCents)}
                          {item.supplierName ? ` · Prov: ${item.supplierName}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">
                        <button type="button" className={`${adminSecondaryButtonClass} min-h-9 px-2.5 py-1.5 text-xs`} onClick={() => setDialog({ kind: "purchase", item })}>
                          <PackagePlus size={14} aria-hidden="true" /> Compra / Entrada
                        </button>
                        <button type="button" className={`${adminSecondaryButtonClass} min-h-9 px-2.5 py-1.5 text-xs`} onClick={() => setDialog({ kind: "adjust", item })}>
                          <ArrowDownUp size={14} aria-hidden="true" /> Ajustar
                        </button>
                        {item.isDirectSale && !item.linkedProductId && !item.pendingProposalId && (
                          <button type="button" className={`${adminSecondaryButtonClass} min-h-9 px-2.5 py-1.5 text-xs`} onClick={() => setDialog({ kind: "proposal", sourceKind: "INVENTORY_ITEM", item })}>
                            <Send size={14} aria-hidden="true" /> Enviar a Catálogo
                          </button>
                        )}
                        <button type="button" aria-label={`Editar ${item.name}`} className={`${adminSecondaryButtonClass} min-h-9 px-2.5 py-1.5 text-xs`} onClick={() => setDialog({ kind: "item", item })}>
                          <Pencil size={14} aria-hidden="true" /> Editar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {tab === "suppliers" && (
            filteredSuppliers.length === 0 ? (
              <EmptyState title="Todavía no hay proveedores" body="Cargá tus proveedores para vincularlos a los insumos y registrar entradas de mercadería." />
            ) : (
              <ul className="divide-y divide-zinc-100" aria-label="Listado de proveedores">
                {filteredSuppliers.map((supplier) => (
                  <li key={supplier.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-950">{supplier.name}</p>
                      <p className="text-xs text-zinc-600">
                        {[
                          supplier.contactName && `Contacto: ${supplier.contactName}`,
                          supplier.phone && `Tel: ${supplier.phone}`,
                          supplier.email,
                          `${supplier.itemCount} ${supplier.itemCount === 1 ? "producto" : "productos"}`,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button type="button" className={`${adminSecondaryButtonClass} min-h-9 shrink-0 self-start px-3 py-1.5 text-xs sm:self-center`} onClick={() => setDialog({ kind: "supplier", supplier })}>
                      <Pencil size={14} aria-hidden="true" /> Editar
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === "recipes" && (
            filteredRecipes.length === 0 ? (
              <EmptyState title="Todavía no hay recetas" body="Armá una receta asociando ingredientes del inventario y definí su rendimiento por porciones." />
            ) : (
              <ul className="divide-y divide-zinc-100" aria-label="Listado de recetas">
                {filteredRecipes.map((recipe) => {
                  const status = stockStatusBadge[recipe.stockStatus];
                  return (
                    <li key={recipe.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4 sm:px-5">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700">{recipe.code}</span>
                          <p className="text-sm font-semibold text-zinc-950">{recipe.name}</p>
                          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                            {recipe.availablePortions} porciones disp.
                          </span>
                          {recipe.linkedProductId && (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">En Catálogo</span>
                          )}
                          {!recipe.linkedProductId && recipe.pendingProposalId && (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950">Pendiente de aprobación</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600">
                          Rinde {recipe.yieldPortions} {recipe.yieldPortions === 1 ? "porción" : "porciones"}
                          {" · "}Costo por porción: <strong className="text-zinc-900">{formatInventoryMoney(recipe.costPerPortionCents)}</strong>
                          {" · "}Ingredientes: {recipe.ingredients.map((ing) => `${formatIngredientQuantity(ing.quantityMilli, ing.displayUnit)} ${ing.itemName}`).join(", ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">
                        <button type="button" className={`${adminSecondaryButtonClass} min-h-9 px-2.5 py-1.5 text-xs`} onClick={() => setDialog({ kind: "prepare", recipe })}>
                          <Play size={14} aria-hidden="true" /> Preparar / Descontar
                        </button>
                        {!recipe.linkedProductId && !recipe.pendingProposalId && (
                          <button type="button" className={`${adminSecondaryButtonClass} min-h-9 px-2.5 py-1.5 text-xs`} onClick={() => setDialog({ kind: "proposal", sourceKind: "RECIPE", recipe })}>
                            <Send size={14} aria-hidden="true" /> Enviar a Catálogo
                          </button>
                        )}
                        <button type="button" aria-label={`Editar ${recipe.name}`} className={`${adminSecondaryButtonClass} min-h-9 px-2.5 py-1.5 text-xs`} onClick={() => setDialog({ kind: "recipe", recipe })}>
                          <Pencil size={14} aria-hidden="true" /> Editar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          )}

          {tab === "history" && (
            filteredMovements.length === 0 ? (
              <EmptyState title="Sin movimientos registrados" body="Cada compra, venta en sala o preparación de receta quedará asentada aquí." />
            ) : (
              <ul className="divide-y divide-zinc-100" aria-label="Historial de consumo e inventario">
                {filteredMovements.map((mov) => (
                  <li key={mov.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-950">
                        {mov.itemName} <span className="font-normal text-zinc-500">({mov.itemCode})</span>
                      </p>
                      <p className="text-xs text-zinc-600">
                        {movementLabels[mov.kind]}
                        {mov.referenceLabel ? ` · ${mov.referenceLabel}` : ""}
                        {mov.notes ? ` · ${mov.notes}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs tabular-nums">
                      <p className={`font-bold ${mov.deltaMilli >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {mov.deltaMilli >= 0 ? "+" : ""}{formatBaseQuantityMilli(mov.deltaMilli, mov.itemUnit)}
                      </p>
                      <p className="text-zinc-500">Saldo: {formatBaseQuantityMilli(mov.balanceMilli, mov.itemUnit)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </AdminCard>
      )}

      {dialog && snapshot && (
        <InventoryDialogs
          restaurantId={restaurantId}
          dialog={dialog}
          suppliers={snapshot.suppliers}
          items={snapshot.items}
          onClose={() => setDialog(null)}
          onCompleted={handleCompleted}
        />
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-10 text-center sm:px-5">
      <p className="text-sm font-semibold text-zinc-950">{title}</p>
      <p className="mt-1 text-sm text-zinc-600">{body}</p>
    </div>
  );
}
