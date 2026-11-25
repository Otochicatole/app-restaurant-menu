"use client";

import { useState, type FormEvent } from "react";
import { ChefHat, Plus, Trash2, Wine } from "lucide-react";
import { adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { AdminModal } from "@/ui/admin/AdminUI";
import type {
  InventoryBaseUnit,
  InventoryCommand,
  InventoryItemView,
  InventoryStation,
  RecipeDisplayUnit,
  RecipeView,
  StockWarningView,
  SupplierView,
} from "../contracts";
import {
  baseUnitLabels,
  compatibleDisplayUnits,
  displayUnitLabels,
  formatBaseQuantityMilli,
  fromBaseMilli,
} from "../domain/inventory-policy";
import {
  formatInventoryMoney,
  parseInventoryDecimal,
  parseInventoryMoneyCents,
  sendInventoryCommand,
  type InventoryCommandResponse,
} from "./inventory-client";

const inputClass =
  "min-h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-[#3d5934] focus:ring-2 focus:ring-[#3d5934]/15";

export type InventoryDialogState =
  | { kind: "supplier"; supplier?: SupplierView }
  | { kind: "item"; item?: InventoryItemView }
  | { kind: "purchase"; item: InventoryItemView }
  | { kind: "adjust"; item: InventoryItemView }
  | { kind: "recipe"; recipe?: RecipeView }
  | { kind: "prepare"; recipe: RecipeView }
  | { kind: "proposal"; sourceKind: "RECIPE"; recipe: RecipeView }
  | { kind: "proposal"; sourceKind: "INVENTORY_ITEM"; item: InventoryItemView };

export function InventoryDialogs({
  restaurantId,
  dialog,
  suppliers,
  items,
  onClose,
  onCompleted,
}: {
  restaurantId: string;
  dialog: InventoryDialogState;
  suppliers: SupplierView[];
  items: InventoryItemView[];
  onClose: () => void;
  onCompleted: (message: string, result: InventoryCommandResponse) => void;
}) {
  if (dialog.kind === "supplier") {
    return (
      <SupplierModal
        restaurantId={restaurantId}
        supplier={dialog.supplier}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    );
  }
  if (dialog.kind === "item") {
    return (
      <ItemModal
        restaurantId={restaurantId}
        item={dialog.item}
        suppliers={suppliers.filter((supplier) => supplier.active)}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    );
  }
  if (dialog.kind === "purchase") {
    return (
      <PurchaseModal
        restaurantId={restaurantId}
        item={dialog.item}
        suppliers={suppliers.filter((supplier) => supplier.active)}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    );
  }
  if (dialog.kind === "adjust") {
    return (
      <AdjustStockModal
        restaurantId={restaurantId}
        item={dialog.item}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    );
  }
  if (dialog.kind === "recipe") {
    return (
      <RecipeModal
        restaurantId={restaurantId}
        recipe={dialog.recipe}
        items={items.filter((item) => item.active)}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    );
  }
  if (dialog.kind === "prepare") {
    return (
      <PrepareRecipeModal
        restaurantId={restaurantId}
        recipe={dialog.recipe}
        onClose={onClose}
        onCompleted={onCompleted}
      />
    );
  }
  return (
    <SubmitProposalModal
      restaurantId={restaurantId}
      dialog={dialog}
      onClose={onClose}
      onCompleted={onCompleted}
    />
  );
}

function SupplierModal({
  restaurantId,
  supplier,
  onClose,
  onCompleted,
}: {
  restaurantId: string;
  supplier?: SupplierView;
  onClose: () => void;
  onCompleted: (message: string, result: InventoryCommandResponse) => void;
}) {
  const [name, setName] = useState(supplier?.name ?? "");
  const [contactName, setContactName] = useState(supplier?.contactName ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Ingresá el nombre del proveedor.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await sendInventoryCommand(restaurantId, {
        action: "save-supplier",
        id: supplier?.id,
        name: name.trim(),
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
        active: true,
      });
      onCompleted(supplier ? "Proveedor actualizado." : "Proveedor registrado.", result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo guardar el proveedor.");
      setBusy(false);
    }
  }

  return (
    <AdminModal open title={supplier ? "Editar proveedor" : "Nuevo proveedor"} onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Nombre o razón social
            <input className={inputClass} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Contacto
              <input className={inputClass} maxLength={120} value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Teléfono
              <input className={inputClass} maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Email (opcional)
            <input type="email" className={inputClass} maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Notas
            <textarea className={inputClass} rows={2} maxLength={400} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <ModalFooter busy={busy} onClose={onClose} submitLabel="Guardar proveedor" />
      </form>
    </AdminModal>
  );
}

function ItemModal({
  restaurantId,
  item,
  suppliers,
  onClose,
  onCompleted,
}: {
  restaurantId: string;
  item?: InventoryItemView;
  suppliers: SupplierView[];
  onClose: () => void;
  onCompleted: (message: string, result: InventoryCommandResponse) => void;
}) {
  const [code, setCode] = useState(item?.code ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const [unit, setUnit] = useState<InventoryBaseUnit>(item?.unit ?? "KG");
  const [unitCost, setUnitCost] = useState(item ? (item.unitCostCents / 100).toFixed(2).replace(".", ",") : "0");
  const [initialStock, setInitialStock] = useState("0");
  const [minStock, setMinStock] = useState(item ? String(item.minStockMilli / 1000).replace(".", ",") : "0");
  const [supplierId, setSupplierId] = useState(item?.supplierId ?? "");
  const [isDirectSale, setIsDirectSale] = useState(item?.isDirectSale ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const unitCostCents = parseInventoryMoneyCents(unitCost);
    const minValue = parseInventoryDecimal(minStock);
    const initialValue = item ? undefined : parseInventoryDecimal(initialStock);

    if (!name.trim() || unitCostCents === null || minValue === null || (!item && initialValue === null)) {
      setError("Completá nombre, costo y cantidades válidas (usá coma o punto decimal).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await sendInventoryCommand(restaurantId, {
        action: "save-item",
        id: item?.id,
        code: code.trim() || undefined,
        name: name.trim(),
        unit,
        unitCostCents,
        ...(initialValue !== undefined && initialValue !== null ? { initialStock: initialValue } : {}),
        minStock: minValue,
        isDirectSale,
        supplierId: supplierId || null,
      });
      onCompleted(item ? "Producto de inventario actualizado." : "Producto registrado en inventario.", result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo guardar el producto.");
      setBusy(false);
    }
  }

  return (
    <AdminModal open title={item ? "Editar producto / insumo" : "Registrar producto / ingrediente"} onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              ID / Código
              <input className={inputClass} maxLength={40} placeholder="Auto (INS-001)" value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Nombre
              <input className={inputClass} required maxLength={120} placeholder="Ej. Harina 000" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Unidad de medida
              <select className={inputClass} value={unit} onChange={(e) => setUnit(e.target.value as InventoryBaseUnit)}>
                <option value="KG">Kilogramos (kg)</option>
                <option value="L">Litros (L)</option>
                <option value="U">Unidades (u)</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Costo por {baseUnitLabels[unit]} ($)
              <input className={inputClass} required inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </label>
          </div>
          <div className={`grid gap-3 ${item ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
            {!item && (
              <label className="grid gap-1 text-sm font-medium text-zinc-800">
                Stock inicial ({baseUnitLabels[unit]})
                <input className={inputClass} required inputMode="decimal" value={initialStock} onChange={(e) => setInitialStock(e.target.value)} />
              </label>
            )}
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Límite mínimo alerta ({baseUnitLabels[unit]})
              <input className={inputClass} required inputMode="decimal" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Proveedor habitual
            <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Sin proveedor asignado</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2.5 text-sm text-zinc-800">
            <input
              type="checkbox"
              checked={isDirectSale}
              onChange={(e) => setIsDirectSale(e.target.checked)}
              className="mt-0.5 size-4 accent-[#3d5934]"
            />
            <span>
              <strong className="block font-semibold text-zinc-950">Producto de venta directa</strong>
              <span className="text-xs text-zinc-600">Permite enviarlo a aprobación del Catálogo sin armar receta (ej. bebidas o envasados).</span>
            </span>
          </label>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <ModalFooter busy={busy} onClose={onClose} submitLabel="Guardar producto" />
      </form>
    </AdminModal>
  );
}

function PurchaseModal({
  restaurantId,
  item,
  suppliers,
  onClose,
  onCompleted,
}: {
  restaurantId: string;
  item: InventoryItemView;
  suppliers: SupplierView[];
  onClose: () => void;
  onCompleted: (message: string, result: InventoryCommandResponse) => void;
}) {
  const units = compatibleDisplayUnits(item.unit);
  const [quantity, setQuantity] = useState("");
  const [displayUnit, setDisplayUnit] = useState<RecipeDisplayUnit>(item.unit);
  const [unitCost, setUnitCost] = useState((item.unitCostCents / 100).toFixed(2).replace(".", ","));
  const [supplierId, setSupplierId] = useState(item.supplierId ?? "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsedQty = parseInventoryDecimal(quantity);
    const parsedCost = parseInventoryMoneyCents(unitCost);
    if (parsedQty === null || parsedQty <= 0 || parsedCost === null) {
      setError("Ingresá una cantidad mayor a cero y un costo válido.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await sendInventoryCommand(restaurantId, {
        action: "record-purchase",
        inventoryItemId: item.id,
        quantity: parsedQty,
        displayUnit,
        unitCostCents: parsedCost,
        supplierId: supplierId || null,
        notes: notes.trim(),
      });
      onCompleted(`Compra registrada: +${quantity} ${displayUnitLabels[displayUnit]} de ${item.name}.`, result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo registrar la compra.");
      setBusy(false);
    }
  }

  return (
    <AdminModal open title={`Compra / Entrada · ${item.name}`} onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-zinc-600">
          Stock actual: <strong className="text-zinc-900">{formatBaseQuantityMilli(item.currentStockMilli, item.unit)}</strong>
        </p>
        <fieldset disabled={busy} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Cantidad ingresada
              <input className={inputClass} required inputMode="decimal" placeholder="Ej. 10" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Unidad
              <select className={inputClass} value={displayUnit} onChange={(e) => setDisplayUnit(e.target.value as RecipeDisplayUnit)}>
                {units.map((u) => (
                  <option key={u} value={u}>{displayUnitLabels[u]}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Costo unitario por {baseUnitLabels[item.unit]} ($)
              <input className={inputClass} required inputMode="decimal" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Proveedor
              <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Sin especificar</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Remito / Notas (opcional)
            <input className={inputClass} maxLength={400} placeholder="Ej. Factura B-0012" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <ModalFooter busy={busy} onClose={onClose} submitLabel="Sumar al stock" />
      </form>
    </AdminModal>
  );
}

function AdjustStockModal({
  restaurantId,
  item,
  onClose,
  onCompleted,
}: {
  restaurantId: string;
  item: InventoryItemView;
  onClose: () => void;
  onCompleted: (message: string, result: InventoryCommandResponse) => void;
}) {
  const units = compatibleDisplayUnits(item.unit);
  const [delta, setDelta] = useState("");
  const [displayUnit, setDisplayUnit] = useState<RecipeDisplayUnit>(item.unit);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseInventoryDecimal(delta, true);
    if (parsed === null || parsed === 0 || !notes.trim()) {
      setError("Ingresá una variación distinta de cero (negativa para merma) y un motivo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await sendInventoryCommand(restaurantId, {
        action: "adjust-stock",
        inventoryItemId: item.id,
        delta: parsed,
        displayUnit,
        notes: notes.trim(),
      });
      onCompleted(`Ajuste registrado en ${item.name}.`, result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo ajustar el stock.");
      setBusy(false);
    }
  }

  return (
    <AdminModal open title={`Ajustar stock · ${item.name}`} onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-zinc-600">
          Stock actual: <strong className="text-zinc-900">{formatBaseQuantityMilli(item.currentStockMilli, item.unit)}</strong>. Usá valores negativos para registrar mermas o roturas.
        </p>
        <fieldset disabled={busy} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Variación (+ o -)
              <input className={inputClass} required inputMode="decimal" placeholder="Ej. -2 o 1,5" value={delta} onChange={(e) => setDelta(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Unidad
              <select className={inputClass} value={displayUnit} onChange={(e) => setDisplayUnit(e.target.value as RecipeDisplayUnit)}>
                {units.map((u) => (
                  <option key={u} value={u}>{displayUnitLabels[u]}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Motivo del ajuste
            <input className={inputClass} required maxLength={400} placeholder="Ej. Merma por vencimiento" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <ModalFooter busy={busy} onClose={onClose} submitLabel="Aplicar ajuste" />
      </form>
    </AdminModal>
  );
}

type RecipeDraftRow = {
  inventoryItemId: string;
  amount: string;
  displayUnit: RecipeDisplayUnit;
};

function RecipeModal({
  restaurantId,
  recipe,
  items,
  onClose,
  onCompleted,
}: {
  restaurantId: string;
  recipe?: RecipeView;
  items: InventoryItemView[];
  onClose: () => void;
  onCompleted: (message: string, result: InventoryCommandResponse) => void;
}) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const [code, setCode] = useState(recipe?.code ?? "");
  const [name, setName] = useState(recipe?.name ?? "");
  const [yieldPortions, setYieldPortions] = useState(String(recipe?.yieldPortions ?? 1));
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [rows, setRows] = useState<RecipeDraftRow[]>(() => {
    if (recipe && recipe.ingredients.length > 0) {
      return recipe.ingredients.map((ing) => ({
        inventoryItemId: ing.inventoryItemId,
        amount: String(fromBaseMilli(ing.quantityMilli, ing.itemUnit, ing.displayUnit)).replace(".", ","),
        displayUnit: ing.displayUnit,
      }));
    }
    const first = items[0];
    return first
      ? [{ inventoryItemId: first.id, amount: "", displayUnit: compatibleDisplayUnits(first.unit)[0] }]
      : [];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function addIngredientRow() {
    const used = new Set(rows.map((row) => row.inventoryItemId));
    const nextItem = items.find((item) => !used.has(item.id)) ?? items[0];
    if (!nextItem) return;
    setRows((current) => [
      ...current,
      { inventoryItemId: nextItem.id, amount: "", displayUnit: compatibleDisplayUnits(nextItem.unit)[0] },
    ]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const portions = Number(yieldPortions);
    if (!name.trim() || !Number.isInteger(portions) || portions < 1) {
      setError("Ingresá un nombre y rendimiento válido (mínimo 1 porción).");
      return;
    }
    const parsedIngredients: Extract<InventoryCommand, { action: "save-recipe" }>["ingredients"] = [];
    for (const row of rows) {
      const parsedAmount = parseInventoryDecimal(row.amount);
      if (!row.inventoryItemId || parsedAmount === null || parsedAmount <= 0) {
        setError("Cada ingrediente debe tener una cantidad válida mayor a cero.");
        return;
      }
      parsedIngredients.push({
        inventoryItemId: row.inventoryItemId,
        amount: parsedAmount,
        displayUnit: row.displayUnit,
      });
    }
    if (parsedIngredients.length === 0) {
      setError("Agregá al menos un ingrediente a la receta.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await sendInventoryCommand(restaurantId, {
        action: "save-recipe",
        id: recipe?.id,
        code: code.trim() || undefined,
        name: name.trim(),
        yieldPortions: portions,
        notes: notes.trim(),
        ingredients: parsedIngredients,
      });
      onCompleted(recipe ? "Receta actualizada." : "Receta guardada.", result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo guardar la receta.");
      setBusy(false);
    }
  }

  return (
    <AdminModal open title={recipe ? "Editar receta" : "Crear / Armar receta"} onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[120px_1fr_110px]">
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              ID / Código
              <input className={inputClass} maxLength={40} placeholder="Auto" value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Nombre de la receta
              <input className={inputClass} required maxLength={120} placeholder="Ej. Pizza Muzzarella" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-zinc-800">
              Porciones
              <input type="number" min={1} max={1000} required className={inputClass} value={yieldPortions} onChange={(e) => setYieldPortions(e.target.value)} />
            </label>
          </div>

          <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-zinc-700">Ingredientes asociados</span>
              <button type="button" className={`${adminSecondaryButtonClass} min-h-8 px-2.5 py-1 text-xs`} onClick={addIngredientRow}>
                <Plus size={14} aria-hidden="true" /> Agregar ingrediente
              </button>
            </div>
            {rows.length === 0 ? (
              <p className="text-xs text-zinc-600">Primero registrá insumos en la pestaña Inventario.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((row, index) => {
                  const selectedItem = itemById.get(row.inventoryItemId);
                  const allowedUnits = selectedItem ? compatibleDisplayUnits(selectedItem.unit) : ["U" as const];
                  return (
                    <div key={`${index}-${row.inventoryItemId}`} className="grid grid-cols-[minmax(0,1fr)_90px_80px_auto] items-center gap-2">
                      <select
                        aria-label={`Ingrediente ${index + 1}`}
                        className={inputClass}
                        value={row.inventoryItemId}
                        onChange={(e) => {
                          const nextItem = itemById.get(e.target.value);
                          const nextUnits = nextItem ? compatibleDisplayUnits(nextItem.unit) : ["U" as const];
                          setRows((current) =>
                            current.map((entry, idx) =>
                              idx === index
                                ? { ...entry, inventoryItemId: e.target.value, displayUnit: nextUnits[0] }
                                : entry,
                            ),
                          );
                        }}
                      >
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>{item.name} ({baseUnitLabels[item.unit]})</option>
                        ))}
                      </select>
                      <input
                        aria-label={`Cantidad ingrediente ${index + 1}`}
                        className={inputClass}
                        required
                        inputMode="decimal"
                        placeholder="200"
                        value={row.amount}
                        onChange={(e) =>
                          setRows((current) =>
                            current.map((entry, idx) => (idx === index ? { ...entry, amount: e.target.value } : entry)),
                          )
                        }
                      />
                      <select
                        aria-label={`Unidad ingrediente ${index + 1}`}
                        className={inputClass}
                        value={row.displayUnit}
                        onChange={(e) =>
                          setRows((current) =>
                            current.map((entry, idx) =>
                              idx === index ? { ...entry, displayUnit: e.target.value as RecipeDisplayUnit } : entry,
                            ),
                          )
                        }
                      >
                        {allowedUnits.map((unit) => (
                          <option key={unit} value={unit}>{displayUnitLabels[unit]}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        aria-label={`Quitar ingrediente ${index + 1}`}
                        disabled={rows.length <= 1}
                        onClick={() => setRows((current) => current.filter((_, idx) => idx !== index))}
                        className="inline-flex h-10 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Notas de preparación (opcional)
            <textarea className={inputClass} rows={2} maxLength={400} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <ModalFooter busy={busy} onClose={onClose} submitLabel="Guardar receta" />
      </form>
    </AdminModal>
  );
}

function PrepareRecipeModal({
  restaurantId,
  recipe,
  onClose,
  onCompleted,
}: {
  restaurantId: string;
  recipe: RecipeView;
  onClose: () => void;
  onCompleted: (message: string, result: InventoryCommandResponse) => void;
}) {
  const [portions, setPortions] = useState(String(recipe.yieldPortions));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const parsedPortions = Math.max(0, Math.floor(Number(portions) || 0));
  const lacksStock = parsedPortions > recipe.availablePortions;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!Number.isInteger(parsedPortions) || parsedPortions < 1) {
      setError("Ingresá una cantidad de porciones mayor a cero.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await sendInventoryCommand(restaurantId, {
        action: "prepare-recipe",
        recipeId: recipe.id,
        portions: parsedPortions,
        notes: notes.trim(),
      });
      onCompleted(`Preparación registrada: ${parsedPortions} porciones de ${recipe.name}.`, result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo descontar el stock.");
      setBusy(false);
    }
  }

  return (
    <AdminModal open title={`Preparar / Descontar · ${recipe.name}`} onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs text-zinc-600">
          Stock disponible estimado para <strong className="text-zinc-900">{recipe.availablePortions}</strong> porciones.
        </p>
        {lacksStock && (
          <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
            <strong>Alerta de stock insuficiente:</strong> faltan insumos para {parsedPortions} porciones, pero podés registrar el consumo igual (quedará saldo negativo y alerta de reabastecimiento).
          </p>
        )}
        <fieldset disabled={busy} className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Cantidad de porciones a preparar
            <input type="number" min={1} max={1000} required className={inputClass} value={portions} onChange={(e) => setPortions(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Notas (opcional)
            <input className={inputClass} maxLength={400} placeholder="Ej. Producción turno noche" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <ModalFooter busy={busy} onClose={onClose} submitLabel="Descontar stock" />
      </form>
    </AdminModal>
  );
}

function SubmitProposalModal({
  restaurantId,
  dialog,
  onClose,
  onCompleted,
}: {
  restaurantId: string;
  dialog: Extract<InventoryDialogState, { kind: "proposal" }>;
  onClose: () => void;
  onCompleted: (message: string, result: InventoryCommandResponse) => void;
}) {
  const defaultName = dialog.sourceKind === "RECIPE" ? dialog.recipe.name : dialog.item.name;
  const costRef = dialog.sourceKind === "RECIPE" ? dialog.recipe.costPerPortionCents : dialog.item.unitCostCents;
  const [proposedName, setProposedName] = useState(defaultName);
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [suggestedStation, setSuggestedStation] = useState<InventoryStation>("KITCHEN");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const priceCents = suggestedPrice.trim() ? parseInventoryMoneyCents(suggestedPrice) : undefined;
    if (!proposedName.trim() || (suggestedPrice.trim() && (priceCents === null || priceCents === undefined || priceCents < 1))) {
      setError("Ingresá un nombre válido y, si sugerís precio, que sea mayor a cero.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await sendInventoryCommand(restaurantId, {
        action: "submit-proposal",
        sourceKind: dialog.sourceKind,
        sourceId: dialog.sourceKind === "RECIPE" ? dialog.recipe.id : dialog.item.id,
        proposedName: proposedName.trim(),
        suggestedPriceCents: priceCents ?? undefined,
        suggestedStation,
      });
      onCompleted(`"${proposedName.trim()}" quedó pendiente de aprobación en Catálogo.`, result);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo enviar la solicitud.");
      setBusy(false);
    }
  }

  return (
    <AdminModal open title="Enviar a aprobación de Catálogo" onClose={() => { if (!busy) onClose(); }}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-xs leading-relaxed text-zinc-600">
          El producto no aparecerá en las comandas de Sala hasta que sea aprobado desde <strong>Catálogo → Pendientes de aprobación</strong>. Costo estimado de referencia: <strong className="text-zinc-900">{formatInventoryMoney(costRef)}</strong>.
        </p>
        <fieldset disabled={busy} className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Nombre propuesto para la carta
            <input className={inputClass} required maxLength={120} value={proposedName} onChange={(e) => setProposedName(e.target.value)} />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-800">
            Precio sugerido en pesos (opcional)
            <input className={inputClass} inputMode="decimal" placeholder="Se confirma al aprobar" value={suggestedPrice} onChange={(e) => setSuggestedPrice(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {(["KITCHEN", "BAR"] as const).map((station) => (
              <label key={station} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${suggestedStation === station ? "border-[#3d5934] bg-[#e8efe6] text-[#263e23]" : "border-zinc-200 bg-white text-zinc-800"}`}>
                <input type="radio" name="proposal-station" checked={suggestedStation === station} onChange={() => setSuggestedStation(station)} className="size-4 accent-[#3d5934]" />
                {station === "BAR" ? <Wine size={15} aria-hidden="true" /> : <ChefHat size={15} aria-hidden="true" />}
                <span>{station === "BAR" ? "Barra" : "Cocina"}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
        <ModalFooter busy={busy} onClose={onClose} submitLabel="Enviar a aprobación" />
      </form>
    </AdminModal>
  );
}

function ModalFooter({ busy, onClose, submitLabel }: { busy: boolean; onClose: () => void; submitLabel: string }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
      <button type="button" className={adminSecondaryButtonClass} disabled={busy} onClick={onClose}>Cancelar</button>
      <button type="submit" className={adminPrimaryButtonClass} disabled={busy}>{busy ? "Guardando…" : submitLabel}</button>
    </div>
  );
}

export function formatStockWarningsSummary(warnings: StockWarningView[]): string {
  return warnings
    .map((warning) => `${warning.itemName}: ${warning.kind === "INSUFFICIENT" ? "stock insuficiente" : "bajo mínimo"}`)
    .join(" · ");
}
