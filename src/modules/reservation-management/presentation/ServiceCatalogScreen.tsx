import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Archive, Check, ChefHat, ClipboardCheck, Pencil, Plus, Search, Wine, XCircle } from "lucide-react";
import type {
  CatalogProposalView,
  InventoryItemView,
  InventorySnapshot,
  RecipeView,
} from "@/modules/inventory-management/contracts";
import { AdminCard, AdminPageHeader, adminDangerButtonClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { AdminSearchableSelect } from "@/ui/admin/AdminSearchableSelect";
import { AdminModal } from "@/ui/admin/AdminUI";
import { matchesNormalizedSearch } from "@/platform/text/search";
import type { KitchenStation, ServiceCommand, ServiceProductView } from "../contracts";
import { ServiceLoadError, ServiceLoading, serviceInputClass } from "./ServiceAdminUi";
import { formatServiceMoney, parseServicePrice, sendServiceAdmin, serviceAdminError, serviceAdminUrl, useServiceAdminQuery } from "./service-admin-client";

type ProductDialog =
  | { kind: "edit"; product?: ServiceProductView }
  | { kind: "archive"; product: ServiceProductView }
  | { kind: "approve"; proposal: CatalogProposalView }
  | { kind: "reject"; proposal: CatalogProposalView };

export function ServiceCatalogScreen({ restaurantId }: { restaurantId: string }) {
  const { result, refresh } = useServiceAdminQuery<ServiceProductView[]>(serviceAdminUrl(restaurantId, { mode: "products" }));
  const [tab, setTab] = useState<"products" | "approvals">("products");
  const [search, setSearch] = useState("");
  const [stationFilter, setStationFilter] = useState<"ALL" | KitchenStation>("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState<ProductDialog | null>(null);
  const [notice, setNotice] = useState("");
  const [proposals, setProposals] = useState<CatalogProposalView[]>([]);
  const [recipes, setRecipes] = useState<RecipeView[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemView[]>([]);

  const loadInventoryContext = useCallback(async () => {
    try {
      const response = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/inventory`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json().catch(() => null);
      if (payload?.success && payload.data) {
        const snapshot = payload.data as Partial<InventorySnapshot>;
        setProposals(snapshot.proposals ?? []);
        setRecipes((snapshot.recipes ?? []).filter((recipe) => recipe.active));
        setInventoryItems((snapshot.items ?? []).filter((item) => item.active));
      }
    } catch {
      // Silencioso para no bloquear el catálogo si solo se consulta el listado operativo
    }
  }, [restaurantId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadInventoryContext();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [loadInventoryContext]);

  const products = result?.data ?? [];
  const pendingProposals = proposals.filter((proposal) => proposal.status === "PENDING");
  const visible = products.filter((product) =>
    (showArchived || product.active)
    && (stationFilter === "ALL" || product.station === stationFilter)
    && matchesNormalizedSearch(search, [product.name, product.sourceCode, product.sourceName]),
  );
  const saved = (message: string) => {
    setDialog(null);
    setNotice(message);
    refresh();
    void loadInventoryContext();
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Catálogo de productos"
        description="Cargá los productos, precios y si pertenecen a cocina o barra, y aprobá solicitudes enviadas desde Inventario y Recetas."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/restaurants/${restaurantId}/inventory`} className={adminSecondaryButtonClass}>
              Inventario y recetas
            </Link>
            <button type="button" className={adminPrimaryButtonClass} onClick={() => setDialog({ kind: "edit" })}>
              <Plus size={17} aria-hidden="true" /> Nuevo producto
            </button>
          </div>
        }
      />
      {notice && <p role="status" className="rounded-xl bg-[#e8efe6] px-4 py-3 text-sm font-medium text-[#263e23]">{notice}</p>}
      {!result && <ServiceLoading message="Cargando productos…" />}
      {result?.error && <ServiceLoadError message={result.error} onRetry={refresh} />}
      {result?.data && (
        <AdminCard>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3.5 sm:px-5">
            <div role="tablist" aria-label="Vistas del catálogo" className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "products"}
                onClick={() => setTab("products")}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  tab === "products" ? "bg-[#263e23] text-white shadow-xs" : "text-zinc-700 hover:bg-white"
                }`}
              >
                <span>Productos del catálogo</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${tab === "products" ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-700"}`}>
                  {products.filter((product) => product.active).length}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "approvals"}
                onClick={() => setTab("approvals")}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                  tab === "approvals" ? "bg-[#263e23] text-white shadow-xs" : "text-zinc-700 hover:bg-white"
                }`}
              >
                <ClipboardCheck size={14} aria-hidden="true" />
                <span>Pendientes de aprobación</span>
                {pendingProposals.length > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${tab === "approvals" ? "bg-white/20 text-white" : "bg-amber-200 text-amber-950"}`}>
                    {pendingProposals.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {tab === "products" ? (
            <>
              <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:px-5">
                <label className="grid gap-1 text-sm font-medium text-zinc-800 sm:w-80">
                  Buscar producto
                  <span className="relative block">
                    <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={`${serviceInputClass} w-full pl-9`} />
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div role="group" aria-label="Filtrar por estación" className="inline-flex rounded-xl border border-zinc-200 bg-zinc-50 p-1">
                    {([
                      ["ALL", "Todos"],
                      ["KITCHEN", "Cocina"],
                      ["BAR", "Barra"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={stationFilter === value}
                        onClick={() => setStationFilter(value)}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                          stationFilter === value
                            ? "bg-[#263e23] text-white shadow-xs"
                            : "text-zinc-700 hover:bg-white"
                        }`}
                      >
                        {value === "KITCHEN" && <ChefHat size={13} aria-hidden="true" />}
                        {value === "BAR" && <Wine size={13} aria-hidden="true" />}
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-700">
                    <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="size-4 accent-[#3d5934]" />
                    Mostrar archivados
                  </label>
                </div>
              </div>
              {visible.length === 0 ? (
                <div className="px-4 py-9 text-center sm:px-5">
                  <p className="text-sm font-semibold text-zinc-950">{products.length === 0 ? "Todavía no hay productos" : "No hay productos para mostrar"}</p>
                  <p className="mt-1 text-sm text-zinc-600">{products.length === 0 ? "Agregá el primero o aprobá una propuesta enviada desde Inventario." : "Probá con otra búsqueda, otro filtro de estación o activá Mostrar archivados."}</p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100" aria-label="Productos del catálogo">
                  {visible.map((product) => (
                    <li key={product.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-5 sm:px-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-sm font-semibold text-zinc-950">{product.name}</p>
                          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                            product.station === "BAR"
                              ? "border-sky-200 bg-sky-50 text-sky-900"
                              : "border-amber-200 bg-amber-50 text-amber-950"
                          }`}>
                            {product.station === "BAR" ? <Wine size={11} aria-hidden="true" /> : <ChefHat size={11} aria-hidden="true" />}
                            {product.station === "BAR" ? "Barra" : "Cocina"}
                          </span>
                          {product.sourceKind === "RECIPE" && (
                            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                              Receta{product.sourceCode ? ` · ${product.sourceCode}` : ""}{product.sourceName ? ` · ${product.sourceName}` : ""}
                            </span>
                          )}
                          {product.sourceKind === "INVENTORY_ITEM" && (
                            <span className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-900">
                              Inventario{product.sourceCode ? ` · ${product.sourceCode}` : ""}{product.sourceName ? ` · ${product.sourceName}` : ""}
                            </span>
                          )}
                          {(!product.sourceKind || product.sourceKind === "MANUAL") && product.recipeId == null && product.inventoryItemId == null && (
                            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                              Sin vínculo
                            </span>
                          )}
                          {product.stockStatus === "LOW" && (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-950">Stock bajo</span>
                          )}
                          {product.stockStatus === "OUT" && (
                            <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-900">Sin stock</span>
                          )}
                        </div>
                        {product.unitCostCents != null && (
                          <p className="mt-0.5 text-xs text-zinc-600">
                            Costo ref.: {formatServiceMoney(product.unitCostCents)}
                            {product.availableUnits != null ? ` · Disp.: ${product.availableUnits} u` : ""}
                          </p>
                        )}
                        {!product.active && <p className="mt-0.5 text-xs font-medium text-zinc-600">Archivado</p>}
                      </div>
                      <p className="whitespace-nowrap text-sm font-medium tabular-nums text-zinc-900">{formatServiceMoney(product.unitPriceCents)}</p>
                      {product.active && <div className="col-span-2 flex flex-wrap justify-end gap-2 sm:col-span-1">
                        <button type="button" aria-label={`Editar ${product.name}`} className={`${adminSecondaryButtonClass} min-h-10 px-3 py-2`} onClick={() => setDialog({ kind: "edit", product })}><Pencil size={15} aria-hidden="true" /> Editar</button>
                        <button type="button" aria-label={`Archivar ${product.name}`} className={`${adminSecondaryButtonClass} min-h-10 px-3 py-2`} onClick={() => setDialog({ kind: "archive", product })}><Archive size={15} aria-hidden="true" /> Archivar</button>
                      </div>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            pendingProposals.length === 0 ? (
              <div className="px-4 py-10 text-center sm:px-5">
                <p className="text-sm font-semibold text-zinc-950">No hay solicitudes pendientes de aprobación</p>
                <p className="mt-1 text-sm text-zinc-600">Enviá recetas o insumos de venta directa desde Inventario y recetas para aprobarlos acá.</p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100" aria-label="Propuestas pendientes de aprobación">
                {pendingProposals.map((proposal) => (
                  <li key={proposal.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-700">{proposal.sourceCode}</span>
                        <p className="text-sm font-semibold text-zinc-950">{proposal.proposedName}</p>
                        <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-800">
                          {proposal.sourceKind === "RECIPE" ? "Receta" : "Venta directa"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-600">
                        Costo ref.: <strong className="text-zinc-900">{formatServiceMoney(proposal.estimatedCostCents)}</strong>
                        {proposal.suggestedPriceCents != null ? ` · Precio sugerido: ${formatServiceMoney(proposal.suggestedPriceCents)}` : ""}
                        {proposal.ingredientSummary.length > 0 ? ` · ${proposal.ingredientSummary.join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={`${adminPrimaryButtonClass} min-h-10 px-3 py-2 text-xs`}
                        onClick={() => setDialog({ kind: "approve", proposal })}
                      >
                        <Check size={15} aria-hidden="true" /> Aprobar y crear producto
                      </button>
                      <button
                        type="button"
                        className={`${adminSecondaryButtonClass} min-h-10 px-3 py-2 text-xs`}
                        onClick={() => setDialog({ kind: "reject", proposal })}
                      >
                        <XCircle size={15} aria-hidden="true" /> Rechazar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}
        </AdminCard>
      )}
      {dialog && (dialog.kind === "approve" || dialog.kind === "reject") && (
        <ProposalDecisionModal
          key={dialog.proposal.id + dialog.kind}
          restaurantId={restaurantId}
          dialog={dialog}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
      {dialog && (dialog.kind === "edit" || dialog.kind === "archive") && (
        <ProductModal
          key={dialog.product?.id ?? "new"}
          restaurantId={restaurantId}
          dialog={dialog}
          recipes={recipes}
          inventoryItems={inventoryItems}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
    </div>
  );
}

type ProductLinkKind = "MANUAL" | "RECIPE" | "INVENTORY_ITEM";

function ProductModal({ restaurantId, dialog, recipes, inventoryItems, onClose, onSaved }: {
  restaurantId: string;
  dialog: Extract<ProductDialog, { kind: "edit" | "archive" }>;
  recipes: RecipeView[];
  inventoryItems: InventoryItemView[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const product = dialog.product;
  const initialLinkKind: ProductLinkKind = product?.recipeId
    ? "RECIPE"
    : product?.inventoryItemId
      ? "INVENTORY_ITEM"
      : "MANUAL";
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? (product.unitPriceCents / 100).toFixed(2).replace(".", ",") : "");
  const [station, setStation] = useState<KitchenStation>(product?.station ?? "KITCHEN");
  const [linkKind, setLinkKind] = useState<ProductLinkKind>(initialLinkKind);
  const [selectedRecipeId, setSelectedRecipeId] = useState(product?.recipeId ?? "");
  const [selectedItemId, setSelectedItemId] = useState(product?.inventoryItemId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const archiving = dialog.kind === "archive";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    let command: ServiceCommand;
    if (dialog.kind === "archive") {
      command = { action: "archive-product", id: dialog.product.id };
    } else {
      const unitPriceCents = parseServicePrice(price);
      if (!name.trim() || unitPriceCents === null) {
        setError("Ingresá un nombre y un precio válido mayor a cero, con hasta dos decimales.");
        return;
      }
      if (linkKind === "RECIPE" && !selectedRecipeId) {
        setError("Seleccioná la receta que querés vincular a este producto.");
        return;
      }
      if (linkKind === "INVENTORY_ITEM" && !selectedItemId) {
        setError("Seleccioná el insumo del inventario que querés vincular.");
        return;
      }
      const hadLink = Boolean(product?.recipeId || product?.inventoryItemId);
      const linkFields =
        linkKind === "RECIPE"
          ? { recipeId: selectedRecipeId, inventoryItemId: null }
          : linkKind === "INVENTORY_ITEM"
            ? { recipeId: null, inventoryItemId: selectedItemId }
            : hadLink
              ? { recipeId: null, inventoryItemId: null }
              : {};
      command = {
        action: "save-product",
        id: product?.id,
        name: name.trim(),
        unitPriceCents,
        station,
        ...linkFields,
      };
    }
    setBusy(true);
    setError("");
    try {
      await sendServiceAdmin(restaurantId, command);
      onSaved(archiving ? "Producto archivado." : "Producto guardado.");
    } catch (failure) {
      setError(serviceAdminError(failure));
      setBusy(false);
    }
  }

  return (
    <AdminModal open title={archiving ? "Archivar producto" : product ? "Editar producto" : "Nuevo producto"} onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        {archiving ? <p className="text-sm leading-6 text-zinc-700">{product?.name} dejará de estar disponible para pedidos nuevos. Podés seguir consultando los pedidos y recibos donde se usó.</p> : (
          <fieldset disabled={busy} className="grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-zinc-800">Nombre<input className={serviceInputClass} required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">Precio unitario en pesos<input className={serviceInputClass} required inputMode="decimal" maxLength={16} placeholder="Ej. 8500,00" value={price} onChange={(event) => setPrice(event.target.value)} /><span className="text-xs font-normal text-zinc-600">Usá hasta dos decimales y escribí el importe sin separador de miles.</span></label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium text-zinc-800">Estación de preparación</legend>
              <div className="grid grid-cols-2 gap-2.5">
                <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  station === "KITCHEN"
                    ? "border-amber-400 bg-amber-50 text-amber-950"
                    : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                }`}>
                  <input
                    type="radio"
                    name="product-station"
                    value="KITCHEN"
                    checked={station === "KITCHEN"}
                    onChange={() => setStation("KITCHEN")}
                    className="size-4 accent-[#3d5934]"
                  />
                  <ChefHat size={15} aria-hidden="true" />
                  <span>Cocina</span>
                </label>
                <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                  station === "BAR"
                    ? "border-sky-400 bg-sky-50 text-sky-950"
                    : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                }`}>
                  <input
                    type="radio"
                    name="product-station"
                    value="BAR"
                    checked={station === "BAR"}
                    onChange={() => setStation("BAR")}
                    className="size-4 accent-[#3d5934]"
                  />
                  <Wine size={15} aria-hidden="true" />
                  <span>Barra</span>
                </label>
              </div>
              <span className="text-xs font-normal text-zinc-600">Al agregar este producto en sala se selecciona automáticamente esta estación.</span>
            </fieldset>

            <fieldset className="grid gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-700">Vínculo con Inventario / Recetas</legend>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["MANUAL", "Sin vínculo"],
                  ["RECIPE", "Receta"],
                  ["INVENTORY_ITEM", "Inventario"],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={linkKind === value}
                    onClick={() => setLinkKind(value)}
                    className={`min-h-9 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                      linkKind === value
                        ? "border-[#3d5934] bg-[#e8efe6] text-[#263e23]"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {linkKind === "RECIPE" && (
                <label className="grid gap-1 text-xs font-medium text-zinc-800">
                  Receta vinculada
                  <AdminSearchableSelect
                    ariaLabel="Receta vinculada"
                    disabled={busy}
                    value={selectedRecipeId}
                    placeholder="Elegí una receta…"
                    searchPlaceholder="Buscar receta por nombre o código…"
                    options={[
                      ...(product?.recipeId && !recipes.some((recipe) => recipe.id === product.recipeId)
                        ? [{
                            value: product.recipeId,
                            label: `${product.sourceCode ? `${product.sourceCode} · ` : ""}${product.sourceName ?? product.name}`,
                          }]
                        : []),
                      ...recipes.map((recipe) => ({
                        value: recipe.id,
                        label: `${recipe.code} · ${recipe.name}`,
                        hint: `Costo ref.: ${formatServiceMoney(recipe.costPerPortionCents)}/porc.`,
                      })),
                    ]}
                    onChange={(nextId) => {
                      setSelectedRecipeId(nextId);
                      if (!name.trim()) {
                        const matched = recipes.find((recipe) => recipe.id === nextId);
                        if (matched) setName(matched.name);
                      }
                    }}
                  />
                  <span className="text-[11px] font-normal text-zinc-600">
                    Al vender este producto en Sala se descontarán automáticamente sus ingredientes del inventario.
                  </span>
                </label>
              )}

              {linkKind === "INVENTORY_ITEM" && (
                <label className="grid gap-1 text-xs font-medium text-zinc-800">
                  Producto de inventario vinculado
                  <AdminSearchableSelect
                    ariaLabel="Insumo vinculado"
                    disabled={busy}
                    value={selectedItemId}
                    placeholder="Elegí un insumo del inventario…"
                    searchPlaceholder="Buscar insumo por nombre o código…"
                    options={[
                      ...(product?.inventoryItemId && !inventoryItems.some((item) => item.id === product.inventoryItemId)
                        ? [{
                            value: product.inventoryItemId,
                            label: `${product.sourceCode ? `${product.sourceCode} · ` : ""}${product.sourceName ?? product.name}`,
                          }]
                        : []),
                      ...inventoryItems.map((item) => ({
                        value: item.id,
                        label: `${item.code} · ${item.name}`,
                        hint: item.isDirectSale ? "Venta directa" : `Unidad: ${item.unit.toLowerCase()}`,
                      })),
                    ]}
                    onChange={(nextId) => {
                      setSelectedItemId(nextId);
                      if (!name.trim()) {
                        const matched = inventoryItems.find((item) => item.id === nextId);
                        if (matched) setName(matched.name);
                      }
                    }}
                  />
                  <span className="text-[11px] font-normal text-zinc-600">
                    Al vender este producto en Sala se descontará 1 unidad directa del inventario.
                  </span>
                </label>
              )}

              {linkKind === "MANUAL" && (
                <p className="text-[11px] text-zinc-600">
                  Sin vínculo: no descontará insumos ni recetas del inventario al confirmarse en Sala.
                </p>
              )}
            </fieldset>
          </fieldset>
        )}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" className={adminSecondaryButtonClass} disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className={archiving ? adminDangerButtonClass : adminPrimaryButtonClass} disabled={busy}>
            {busy ? "Guardando…" : archiving ? "Archivar producto" : "Guardar producto"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function ProposalDecisionModal({
  restaurantId,
  dialog,
  onClose,
  onSaved,
}: {
  restaurantId: string;
  dialog: Extract<ProductDialog, { kind: "approve" | "reject" }>;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const proposal = dialog.proposal;
  const rejecting = dialog.kind === "reject";
  const [name, setName] = useState(proposal.proposedName);
  const [price, setPrice] = useState(
    proposal.suggestedPriceCents != null ? (proposal.suggestedPriceCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [station, setStation] = useState<KitchenStation>(proposal.suggestedStation);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    let command: ServiceCommand;
    if (rejecting) {
      command = {
        action: "reject-catalog-proposal",
        proposalId: proposal.id,
        reason: reason.trim() || undefined,
      };
    } else {
      const unitPriceCents = parseServicePrice(price);
      if (!name.trim() || unitPriceCents === null) {
        setError("Ingresá un nombre y un precio válido mayor a cero.");
        return;
      }
      command = {
        action: "approve-catalog-proposal",
        proposalId: proposal.id,
        name: name.trim(),
        unitPriceCents,
        station,
      };
    }
    setBusy(true);
    setError("");
    try {
      await sendServiceAdmin(restaurantId, command);
      onSaved(rejecting ? "Solicitud rechazada." : "Producto aprobado y creado en el Catálogo.");
    } catch (failure) {
      setError(serviceAdminError(failure));
      setBusy(false);
    }
  }

  return (
    <AdminModal open title={rejecting ? "Rechazar solicitud" : "Aprobar y crear producto"} onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        {rejecting ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-700">
              Vas a rechazar la publicación de <strong>{proposal.proposedName}</strong>.
            </p>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Motivo (opcional)
              <input className={serviceInputClass} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          </div>
        ) : (
          <fieldset disabled={busy} className="grid gap-4">
            <p className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
              Origen: <strong>{proposal.sourceKind === "RECIPE" ? "Receta" : "Venta directa"}</strong> · Costo de referencia: <strong>{formatServiceMoney(proposal.estimatedCostCents)}</strong>
            </p>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Nombre en Catálogo
              <input className={serviceInputClass} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Precio unitario en pesos
              <input className={serviceInputClass} required inputMode="decimal" placeholder="Ej. 8500,00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(["KITCHEN", "BAR"] as const).map((value) => (
                <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${station === value ? "border-[#3d5934] bg-[#e8efe6] text-[#263e23]" : "border-zinc-200 bg-white text-zinc-800"}`}>
                  <input type="radio" name="approve-station" checked={station === value} onChange={() => setStation(value)} className="size-4 accent-[#3d5934]" />
                  {value === "BAR" ? <Wine size={15} aria-hidden="true" /> : <ChefHat size={15} aria-hidden="true" />}
                  <span>{value === "BAR" ? "Barra" : "Cocina"}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
          <button type="button" className={adminSecondaryButtonClass} disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className={rejecting ? adminDangerButtonClass : adminPrimaryButtonClass} disabled={busy}>
            {busy ? "Procesando…" : rejecting ? "Rechazar solicitud" : "Aprobar y crear producto"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
