"use client";

import { useId, useState, type FormEvent } from "react";
import { ChefHat, Plus, Search, UtensilsCrossed, Wine, X } from "lucide-react";
import type { KitchenStation, ServiceProductView } from "@/modules/reservation-management/contracts";
import { floorInputClass } from "./floor-api";
import { amount, parsePrice, type DraftOrderItem } from "./floor-service-format";
import { floorSecondaryButtonClass } from "./floor-ui";

const fieldClass = "grid min-w-0 gap-1 text-xs font-medium text-[var(--floor-muted,#4b6470)]";
const searchNormalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es-AR");

export type FloorServiceCatalogProps = {
  products: ServiceProductView[];
  draftItems: DraftOrderItem[];
  busy: boolean;
  onAddItem: (item: Omit<DraftOrderItem, "key">) => void;
};

export function FloorServiceCatalog({
  products,
  draftItems,
  busy,
  onAddItem,
}: FloorServiceCatalogProps) {
  const activeProducts = products.filter((product) => product.active);
  const [searchQuery, setSearchQuery] = useState("");
  const [stationFilter, setStationFilter] = useState<"ALL" | KitchenStation>("ALL");
  const [manualOpen, setManualOpen] = useState(false);

  const [manualName, setManualName] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualQuantity, setManualQuantity] = useState("1");
  const [manualNotes, setManualNotes] = useState("");
  const [manualStation, setManualStation] = useState<KitchenStation>("KITCHEN");

  const searchId = useId();
  const normalizedTerm = searchNormalize(searchQuery).trim();
  const filteredProducts = activeProducts.filter((product) => {
    if (stationFilter !== "ALL" && product.station !== stationFilter) return false;
    return !normalizedTerm || searchNormalize(product.name).includes(normalizedTerm);
  });

  const draftQtyByProductId = new Map<string, number>();
  for (const item of draftItems) {
    if (item.productId) {
      draftQtyByProductId.set(item.productId, (draftQtyByProductId.get(item.productId) ?? 0) + item.quantity);
    }
  }

  const showManualForm = manualOpen || activeProducts.length === 0;
  const manualCents = parsePrice(manualPrice);
  const manualCount = Number(manualQuantity);
  const manualValid =
    Boolean(manualName.trim()) &&
    manualCents >= 1 &&
    manualCents <= 2_147_483_647 &&
    Number.isInteger(manualCount) &&
    manualCount >= 1 &&
    manualCount <= 99;

  const submitManual = (event: FormEvent) => {
    event.preventDefault();
    if (busy || !manualValid) return;
    onAddItem({
      name: manualName.trim(),
      unitPriceCents: manualCents,
      quantity: manualCount,
      notes: manualNotes.trim(),
      station: manualStation,
    });
    setManualName("");
    setManualPrice("");
    setManualQuantity("1");
    setManualNotes("");
    setManualStation(stationFilter === "BAR" ? "BAR" : "KITCHEN");
    if (activeProducts.length > 0) setManualOpen(false);
  };

  return (
    <section
      aria-label="Catálogo de productos"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--floor-border,#cad9df)] bg-white"
    >
      <div className="shrink-0 space-y-2.5 border-b border-[var(--floor-border,#cad9df)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          {activeProducts.length > 0 && (
            <div className="relative min-w-44 flex-1">
              <Search
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3 my-auto text-[var(--floor-muted,#4b6470)]"
              />
              <input
                id={searchId}
                type="search"
                aria-label="Buscar producto"
                disabled={busy}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar producto…"
                className={`${floorInputClass} min-h-10 pl-9 pr-8`}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-1.5 my-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--floor-muted,#4b6470)] hover:bg-[var(--floor-hover,#e6f2f6)] hover:text-[var(--floor-ink,#173642)]"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          <div
            role="group"
            aria-label="Filtrar por estación"
            className="inline-flex rounded-xl border border-[var(--floor-border,#cad9df)] bg-[var(--floor-canvas,#eef4f6)] p-0.5"
          >
            <button
              type="button"
              disabled={busy}
              aria-pressed={stationFilter === "ALL"}
              onClick={() => setStationFilter("ALL")}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                stationFilter === "ALL"
                  ? "bg-[var(--floor-action,#155e75)] text-white shadow-xs"
                  : "text-[var(--floor-ink,#173642)] hover:bg-white/70"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              disabled={busy}
              aria-pressed={stationFilter === "KITCHEN"}
              onClick={() => {
                setStationFilter("KITCHEN");
                setManualStation("KITCHEN");
              }}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                stationFilter === "KITCHEN"
                  ? "bg-[var(--floor-action,#155e75)] text-white shadow-xs"
                  : "text-[var(--floor-ink,#173642)] hover:bg-white/70"
              }`}
            >
              <ChefHat size={14} aria-hidden="true" />
              Cocina
            </button>
            <button
              type="button"
              disabled={busy}
              aria-pressed={stationFilter === "BAR"}
              onClick={() => {
                setStationFilter("BAR");
                setManualStation("BAR");
              }}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
                stationFilter === "BAR"
                  ? "bg-[var(--floor-action,#155e75)] text-white shadow-xs"
                  : "text-[var(--floor-ink,#173642)] hover:bg-white/70"
              }`}
            >
              <Wine size={14} aria-hidden="true" />
              Barra
            </button>
          </div>

          {activeProducts.length > 0 && (
            <button
              type="button"
              disabled={busy}
              aria-expanded={showManualForm}
              onClick={() => setManualOpen((current) => !current)}
              className={`${floorSecondaryButtonClass} min-h-10 text-xs`}
            >
              <Plus size={14} aria-hidden="true" />
              Otro producto
            </button>
          )}
        </div>

        {showManualForm && (
          <form
            aria-label="Cargar producto manual"
            onSubmit={submitManual}
            className="space-y-2.5 rounded-xl border border-[var(--floor-border,#cad9df)] bg-[var(--floor-canvas,#eef4f6)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-[var(--floor-ink,#173642)]">Producto fuera de catálogo</p>
              {activeProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setManualOpen(false)}
                  className="text-xs font-medium text-[var(--floor-muted,#4b6470)] underline underline-offset-2 hover:text-[var(--floor-ink,#173642)]"
                >
                  Ocultar
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <label className={fieldClass}>
                Nombre
                <input
                  className={floorInputClass}
                  disabled={busy}
                  required
                  maxLength={120}
                  value={manualName}
                  onChange={(event) => setManualName(event.target.value)}
                />
              </label>
              <label className={fieldClass}>
                Precio unitario ($)
                <input
                  className={floorInputClass}
                  disabled={busy}
                  required
                  inputMode="decimal"
                  pattern="[0-9]+([,.][0-9]{1,2})?"
                  maxLength={13}
                  value={manualPrice}
                  onChange={(event) => setManualPrice(event.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_5rem_auto] sm:items-end">
              <label className={fieldClass}>
                Notas de elaboración
                <input
                  className={floorInputClass}
                  disabled={busy}
                  maxLength={200}
                  placeholder="Ej: sin sal, punto jugoso"
                  value={manualNotes}
                  onChange={(event) => setManualNotes(event.target.value)}
                />
              </label>
              <label className={fieldClass}>
                Estación
                <select
                  className={floorInputClass}
                  disabled={busy}
                  value={manualStation}
                  onChange={(event) => setManualStation(event.target.value as KitchenStation)}
                >
                  <option value="KITCHEN">Cocina</option>
                  <option value="BAR">Barra</option>
                </select>
              </label>
              <label className={fieldClass}>
                Cantidad
                <input
                  className={floorInputClass}
                  disabled={busy}
                  required
                  type="number"
                  min={1}
                  max={99}
                  step={1}
                  value={manualQuantity}
                  onChange={(event) => setManualQuantity(event.target.value)}
                />
              </label>
              <button type="submit" className={floorSecondaryButtonClass} disabled={busy || !manualValid}>
                <Plus size={15} aria-hidden="true" />Agregar a la lista
              </button>
            </div>
          </form>
        )}
      </div>

      {activeProducts.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-[var(--floor-border,#cad9df)] p-4 text-xs text-[var(--floor-muted,#4b6470)]">
              {normalizedTerm ? (
                <>
                  <p>No encontramos productos para &ldquo;{searchQuery}&rdquo;.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setManualName(searchQuery.trim());
                      setManualOpen(true);
                    }}
                    className={floorSecondaryButtonClass}
                  >
                    <Plus size={14} aria-hidden="true" />Cargar &ldquo;{searchQuery.trim()}&rdquo; manual
                  </button>
                </>
              ) : (
                <>
                  <p>No hay productos de {stationFilter === "BAR" ? "Barra" : "Cocina"} en el catálogo.</p>
                  <button
                    type="button"
                    onClick={() => setStationFilter("ALL")}
                    className={floorSecondaryButtonClass}
                  >
                    Ver todos
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-3" role="group" aria-label="Productos rápidos">
              {filteredProducts.map((product) => {
                const countInDraft = draftQtyByProductId.get(product.id) ?? 0;
                const isBar = product.station === "BAR";
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={busy}
                    aria-label={`Agregar ${product.name}`}
                    onClick={() =>
                      onAddItem({
                        productId: product.id,
                        name: product.name,
                        unitPriceCents: product.unitPriceCents,
                        quantity: 1,
                        notes: "",
                        station: product.station,
                      })
                    }
                    className={`group relative flex min-h-17 flex-col justify-between gap-1.5 rounded-xl border p-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[var(--floor-focus,#0e7490)] disabled:cursor-not-allowed disabled:opacity-45 ${
                      countInDraft > 0
                        ? "border-[var(--floor-action,#155e75)] bg-[var(--floor-hover,#e6f2f6)]"
                        : "border-[var(--floor-border,#cad9df)] bg-white hover:border-[var(--floor-border-hover,#9fb8c3)] hover:bg-[var(--floor-hover,#e6f2f6)]/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--floor-ink,#173642)]">
                        {product.name}
                      </span>
                      {countInDraft > 0 && (
                        <span className="inline-flex shrink-0 items-center rounded-md bg-[var(--floor-action,#155e75)] px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
                          ×{countInDraft}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[var(--floor-action,#155e75)] tabular-nums">
                        {amount(product.unitPriceCents)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {product.stockStatus === "OUT" && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
                            Sin stock
                          </span>
                        )}
                        {product.stockStatus === "LOW" && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                            Stock bajo
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          isBar ? "bg-sky-50 text-sky-900" : "bg-amber-50 text-amber-950"
                        }`}>
                          {isBar ? <Wine size={10} aria-hidden="true" /> : <ChefHat size={10} aria-hidden="true" />}
                          {isBar ? "Barra" : "Cocina"}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--floor-muted,#4b6470)] group-hover:text-[var(--floor-ink,#173642)]">
                          <Plus size={12} aria-hidden="true" />1
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeProducts.length === 0 && (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-[var(--floor-muted,#4b6470)]">
          <p className="inline-flex items-center gap-1.5">
            <UtensilsCrossed size={14} aria-hidden="true" />
            Usá el formulario superior para agregar ítems manuales al pedido.
          </p>
        </div>
      )}
    </section>
  );
}
