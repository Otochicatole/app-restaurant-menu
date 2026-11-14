import { useState, type FormEvent } from "react";
import { Archive, Pencil, Plus, Search } from "lucide-react";
import { AdminCard, AdminPageHeader, adminDangerButtonClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/ui/admin/AdminPrimitives";
import { AdminModal } from "@/ui/admin/AdminUI";
import type { ServiceCommand, ServiceProductView } from "../contracts";
import { ServiceLoadError, ServiceLoading, serviceInputClass } from "./ServiceAdminUi";
import { formatServiceMoney, parseServicePrice, sendServiceAdmin, serviceAdminError, serviceAdminUrl, useServiceAdminQuery } from "./service-admin-client";

type ProductDialog = { kind: "edit"; product?: ServiceProductView } | { kind: "archive"; product: ServiceProductView };

export function ServiceCatalogScreen({ restaurantId }: { restaurantId: string }) {
  const { result, refresh } = useServiceAdminQuery<ServiceProductView[]>(serviceAdminUrl(restaurantId, { mode: "products" }));
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [dialog, setDialog] = useState<ProductDialog | null>(null);
  const [notice, setNotice] = useState("");

  const products = result?.data ?? [];
  const query = search.trim().toLocaleLowerCase("es-AR");
  const visible = products.filter((product) => (showArchived || product.active) && product.name.toLocaleLowerCase("es-AR").includes(query));
  const saved = (message: string) => {
    setDialog(null);
    setNotice(message);
    refresh();
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Catálogo de productos" description="Cargá los productos y precios que el equipo usa para tomar pedidos en sala."
        actions={<button type="button" className={adminPrimaryButtonClass} onClick={() => setDialog({ kind: "edit" })}><Plus size={17} aria-hidden="true" /> Nuevo producto</button>} />
      {notice && <p role="status" className="rounded-xl bg-[#e8efe6] px-4 py-3 text-sm font-medium text-[#263e23]">{notice}</p>}
      {!result && <ServiceLoading message="Cargando productos…" />}
      {result?.error && <ServiceLoadError message={result.error} onRetry={refresh} />}
      {result?.data && (
        <AdminCard>
          <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <label className="grid gap-1 text-sm font-medium text-zinc-800 sm:w-80">
              Buscar producto
              <span className="relative block">
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={`${serviceInputClass} w-full pl-9`} />
              </span>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="size-4 accent-[#3d5934]" />
              Mostrar archivados
            </label>
          </div>
          {visible.length === 0 ? (
            <div className="px-4 py-9 text-center sm:px-5">
              <p className="text-sm font-semibold text-zinc-950">{products.length === 0 ? "Todavía no hay productos" : "No hay productos para mostrar"}</p>
              <p className="mt-1 text-sm text-zinc-600">{products.length === 0 ? "Agregá el primero para que aparezca al tomar pedidos." : "Probá con otra búsqueda o activá Mostrar archivados."}</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100" aria-label="Productos del catálogo">
              {visible.map((product) => (
                <li key={product.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-x-5 sm:px-5">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-zinc-950">{product.name}</p>
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
        </AdminCard>
      )}
      {dialog && <ProductModal key={dialog.product?.id ?? "new"} restaurantId={restaurantId} dialog={dialog} onClose={() => setDialog(null)} onSaved={saved} />}
    </div>
  );
}

function ProductModal({ restaurantId, dialog, onClose, onSaved }: {
  restaurantId: string; dialog: ProductDialog; onClose: () => void; onSaved: (message: string) => void;
}) {
  const product = dialog.product;
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? (product.unitPriceCents / 100).toFixed(2).replace(".", ",") : "");
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
      command = { action: "save-product", id: product?.id, name: name.trim(), unitPriceCents };
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
