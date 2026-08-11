"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { closestCenter, DndContext, DragOverlay, MeasuringStrategy, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { GroupDTO } from "@/features/groups/frontend/types";
import type { ProductDTO } from "@/features/products/frontend/types";
import { GroupForm } from "@/features/groups/frontend/components/GroupForm";
import { ProductForm } from "@/features/products/frontend/components/ProductForm";
import { AdminCard, AdminConfirmModal, AdminEmptyState, AdminModal, AdminPageHeader, adminDangerButtonClass, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/shared/frontend/components/admin/AdminUI";
import { AlertCircle, FolderPlus, GripVertical, Layers3, PackagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";

export interface CatalogActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

interface ProductCatalogClientProps {
  groups: GroupDTO[];
  products: ProductDTO[];
  initialGroupId?: string;
  createGroup: (data: { name: string; description: string }) => Promise<CatalogActionResult<GroupDTO>>;
  updateGroup: (id: string, data: { name: string; description: string }) => Promise<CatalogActionResult<GroupDTO>>;
  deleteGroup: (id: string) => Promise<CatalogActionResult>;
  createProduct: (data: { name: string; description: string; price: number; groupId: string }) => Promise<CatalogActionResult<ProductDTO>>;
  updateProduct: (id: string, data: { name: string; description: string; price: number; groupId: string }) => Promise<CatalogActionResult<ProductDTO>>;
  deleteProduct: (id: string) => Promise<CatalogActionResult>;
  reorderProducts: (groupId: string, productIds: string[]) => Promise<CatalogActionResult>;
}

function SortableProductRow({
  product,
  sortable,
  onEdit,
  onDelete,
}: {
  product: ProductDTO;
  sortable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: "transform",
  };

  return (
    <article ref={setNodeRef} style={style} className={`grid gap-4 px-5 py-5 transition-[background-color,box-shadow,opacity] hover:bg-emerald-50/40 sm:grid-cols-[minmax(0,1.5fr)_minmax(120px,0.5fr)_minmax(150px,0.8fr)_auto] sm:items-center ${isDragging ? "relative z-10 opacity-40" : ""}`}>
      <div className="flex min-w-0 items-start gap-3">
        {sortable ? (
          <button type="button" className="mt-0.5 cursor-grab touch-none rounded-sm p-1 text-zinc-400 hover:bg-zinc-100 hover:text-emerald-800 active:cursor-grabbing" aria-label={`Ordenar ${product.name}`} {...attributes} {...listeners}>
            <GripVertical size={18} />
          </button>
        ) : <span className="hidden w-7 shrink-0 sm:block" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4 sm:block">
            <h3 className="truncate text-base font-semibold text-zinc-950">{product.name}</h3>
            <span className="shrink-0 text-base font-semibold text-emerald-900 sm:hidden">${product.price.toFixed(2)}</span>
          </div>
          <p className="mt-1 truncate text-sm text-zinc-500">{product.description || "Sin descripción cargada."}</p>
        </div>
      </div>
      <span className="hidden text-base font-semibold text-emerald-900 sm:block">${product.price.toFixed(2)}</span>
      <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">{product.groupName}</span>
      <div className="flex gap-2 sm:justify-end">
        <button type="button" className={adminSecondaryButtonClass} onClick={onEdit}><Pencil size={15} /> Editar</button>
        <button type="button" className={adminDangerButtonClass} onClick={onDelete}><Trash2 size={15} /> Eliminar</button>
      </div>
    </article>
  );
}

function DragOverlayProduct({ product }: { product: ProductDTO }) {
  return (
    <div className="grid w-[min(680px,calc(100vw-2rem))] gap-4 rounded-sm border border-emerald-200 bg-white px-5 py-5 shadow-2xl sm:grid-cols-[minmax(0,1.5fr)_minmax(120px,0.5fr)_minmax(150px,0.8fr)_auto] sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <GripVertical size={18} className="shrink-0 text-emerald-700" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-zinc-950">{product.name}</p>
          <p className="truncate text-sm text-zinc-500">{product.description || "Sin descripción cargada."}</p>
        </div>
      </div>
      <span className="text-base font-semibold text-emerald-900">${product.price.toFixed(2)}</span>
      <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">{product.groupName}</span>
    </div>
  );
}

export function ProductCatalogClient({
  groups,
  products,
  initialGroupId,
  createGroup,
  updateGroup,
  deleteGroup,
  createProduct,
  updateProduct,
  deleteProduct,
  reorderProducts,
}: ProductCatalogClientProps) {
  const router = useRouter();
  const initialSelection = initialGroupId && groups.some((group) => group.id === initialGroupId) ? initialGroupId : "all";
  const [activeGroupId, setActiveGroupId] = useState(initialSelection);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create-group" | "edit-group" | "create-product" | "edit-product" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDTO | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "product"; product: ProductDTO } | { type: "group"; group: GroupDTO } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [groupOrder, setGroupOrder] = useState<Record<string, string[]>>({});
  const [reordering, setReordering] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? null;
  const groupCounts = useMemo(() => {
    return products.reduce<Record<string, number>>((counts, product) => {
      counts[product.groupId] = (counts[product.groupId] ?? 0) + 1;
      return counts;
    }, {});
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesGroup = activeGroupId === "all" || product.groupId === activeGroupId;
      const matchesSearch = !normalizedSearch || `${product.name} ${product.description}`.toLowerCase().includes(normalizedSearch);
      return matchesGroup && matchesSearch;
    });

    if (activeGroupId === "all") return filtered;
    const order = groupOrder[activeGroupId] ?? [];
    const positions = new Map(order.map((id, index) => [id, index]));
    return [...filtered].sort((a, b) => (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER));
  }, [activeGroupId, groupOrder, products, search]);

  const selectGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    setSearch("");
    router.replace(groupId === "all" ? "/admin/catalog" : `/admin/catalog?group=${groupId}`, { scroll: false });
  };

  const closeModal = () => {
    setModal(null);
    setSelectedProduct(null);
    setActionError(null);
  };

  const refreshCatalog = () => {
    closeModal();
    router.refresh();
  };

  const requestDeleteProduct = (product: ProductDTO) => {
    setActionError(null);
    setConfirmAction({ type: "product", product });
  };

  const requestDeleteGroup = () => {
    if (!activeGroup) return;
    setActionError(null);
    setConfirmAction({ type: "group", group: activeGroup });
  };

  const handleConfirmDelete = async () => {
    if (!confirmAction) return;
    setDeleting(true);
    setActionError(null);
    const result = confirmAction.type === "product"
      ? await deleteProduct(confirmAction.product.id)
      : await deleteGroup(confirmAction.group.id);

    if (result.success) {
      setConfirmAction(null);
      if (confirmAction.type === "group") selectGroup("all");
      router.refresh();
    } else {
      setActionError(result.error?.message ?? "No se pudo eliminar el elemento");
    }
    setDeleting(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    if (activeGroupId === "all" || search.trim() || !event.over || event.active.id === event.over.id) return;
    const oldIndex = visibleProducts.findIndex((product) => product.id === event.active.id);
    const newIndex = visibleProducts.findIndex((product) => product.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextOrder = arrayMove(visibleProducts, oldIndex, newIndex).map((product) => product.id);
    const previousOrder = groupOrder[activeGroupId];
    setGroupOrder((current) => ({ ...current, [activeGroupId]: nextOrder }));
    setReordering(true);
    setActionError(null);
    const result = await reorderProducts(activeGroupId, nextOrder);
    if (result.success) {
      setActionError(null);
    } else {
      setGroupOrder((current) => {
        const next = { ...current };
        if (previousOrder) next[activeGroupId] = previousOrder;
        else delete next[activeGroupId];
        return next;
      });
      setActionError(result.error?.message ?? "No se pudo guardar el orden");
    }
    setReordering(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (activeGroupId !== "all" && !search.trim() && !reordering) setActiveDragId(String(event.active.id));
  };

  const formGroups = groups.map((group) => ({ id: group.id, name: group.name }));
  const productInitialData = selectedProduct
    ? { name: selectedProduct.name, description: selectedProduct.description, price: selectedProduct.price, groupId: selectedProduct.groupId }
    : { name: "", description: "", price: 0, groupId: activeGroupId === "all" ? "" : activeGroupId };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catálogo"
        title="Catálogo del menú"
        description="Organizá tus grupos y mantené cada producto actualizado desde un solo lugar."
        actions={
          <>
            <button type="button" className={adminSecondaryButtonClass} onClick={() => setModal("create-group")}><FolderPlus size={16} /> Nuevo grupo</button>
            <button type="button" className={adminPrimaryButtonClass} onClick={() => setModal("create-product")} disabled={groups.length === 0}><PackagePlus size={16} /> Nuevo producto</button>
          </>
        }
      />

      {actionError && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={17} /> {actionError}</div>}

      {groups.length === 0 ? (
        <AdminEmptyState title="Tu catálogo está vacío" description="Creá tu primer grupo para comenzar a agregar productos al menú." action={<button type="button" className={adminPrimaryButtonClass} onClick={() => setModal("create-group")}><Plus size={16} /> Crear grupo</button>} />
      ) : (
        <>
          <AdminCard className="overflow-hidden">
            <div className="overflow-x-auto border-b border-zinc-200 bg-zinc-50/70 px-3 py-3 sm:px-5">
              <div className="flex min-w-max gap-2">
                <button type="button" onClick={() => selectGroup("all")} className={`flex cursor-pointer flex-row items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeGroupId === "all" ? "bg-emerald-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"}`}>
                  <Layers3 size={16} /> Todos <span className="ml-1.5 text-xs opacity-70">{products.length}</span>
                </button>
                {groups.map((group) => (
                  <button key={group.id} type="button" onClick={() => selectGroup(group.id)} className={`flex cursor-pointer flex-row items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeGroupId === group.id ? "bg-emerald-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"}`}>
                    {group.name} <span className="ml-1.5 text-xs opacity-70">{groupCounts[group.id] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{activeGroup ? "Vista de grupo" : "Menú completo"}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{activeGroup?.name ?? "Todos los productos"}</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">{activeGroup?.description || `${products.length} productos en ${groups.length} grupos.`}</p>
                {activeGroup && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700"><GripVertical size={15} />{search.trim() ? "Limpiá la búsqueda para ordenar" : reordering ? "Guardando el orden..." : "Arrastrá los productos para ordenarlos"}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {activeGroup && <>
                  <button type="button" className={adminSecondaryButtonClass} onClick={() => setModal("edit-group")}><Pencil size={15} /> Editar grupo</button>
                  <button type="button" className={adminDangerButtonClass} onClick={requestDeleteGroup}><Trash2 size={15} /> Eliminar grupo</button>
                </>}
                <label className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100 sm:w-52"><Search size={16} className="text-zinc-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar productos" className="w-full bg-transparent outline-none" /></label>
              </div>
            </div>
          </AdminCard>

          {visibleProducts.length === 0 ? (
            <AdminEmptyState title="No se encontraron productos" description={search ? "Probá con otro término de búsqueda." : "Este grupo todavía no tiene productos."} action={!search ? <button type="button" className={adminPrimaryButtonClass} onClick={() => setModal("create-product")}><Plus size={16} /> Agregar producto</button> : undefined} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_12px_40px_-28px_rgba(24,24,27,0.45)]">
              <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(120px,0.5fr)_minmax(150px,0.8fr)_auto] gap-4 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 sm:grid">
                <span>Producto</span>
                <span>Precio</span>
                <span>Grupo</span>
                <span className="text-right">Acciones</span>
              </div>
              <DndContext
                id="catalog-product-dnd"
                sensors={sensors}
                collisionDetection={closestCenter}
                measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                onDragStart={handleDragStart}
                onDragCancel={() => setActiveDragId(null)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={visibleProducts.map((product) => product.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-zinc-100">
                    {visibleProducts.map((product) => (
                      <SortableProductRow
                        key={product.id}
                        product={product}
                        sortable={activeGroupId !== "all" && !search.trim() && !reordering}
                        onEdit={() => { setSelectedProduct(product); setModal("edit-product"); }}
                        onDelete={() => requestDeleteProduct(product)}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
                  {activeDragId ? <DragOverlayProduct product={visibleProducts.find((product) => product.id === activeDragId) ?? products.find((product) => product.id === activeDragId)!} /> : null}
                </DragOverlay>
              </DndContext>
            </div>
          )}
        </>
      )}

      <AdminModal open={modal === "create-group"} title="Crear grupo" description="Los grupos organizan los productos de tu menú público." onClose={closeModal}>
        <GroupForm onSubmit={createGroup} submitLabel="Crear grupo" onSuccess={(result) => { const created = result.data as GroupDTO | undefined; if (created) { setActiveGroupId(created.id); router.replace(`/admin/catalog?group=${created.id}`, { scroll: false }); } refreshCatalog(); }} onCancel={closeModal} />
      </AdminModal>
      <AdminModal open={modal === "edit-group" && Boolean(activeGroup)} title="Editar grupo" description="Actualizá la información que se muestra en tu menú." onClose={closeModal}>
        {activeGroup && <GroupForm key={activeGroup.id} initialData={{ name: activeGroup.name, description: activeGroup.description }} onSubmit={(data) => updateGroup(activeGroup.id, data)} submitLabel="Guardar cambios" onSuccess={refreshCatalog} onCancel={closeModal} />}
      </AdminModal>
      <AdminModal open={modal === "create-product"} title="Crear producto" description="Agregá un producto a un grupo existente." onClose={closeModal}>
        <ProductForm key={`create-${activeGroupId}`} groups={formGroups} initialData={productInitialData} onSubmit={createProduct} submitLabel="Crear producto" onSuccess={refreshCatalog} onCancel={closeModal} />
      </AdminModal>
      <AdminModal open={modal === "edit-product" && Boolean(selectedProduct)} title="Editar producto" description="Mantené actualizados el nombre, el precio y el grupo." onClose={closeModal}>
        {selectedProduct && <ProductForm key={selectedProduct.id} groups={formGroups} initialData={productInitialData} onSubmit={(data) => updateProduct(selectedProduct.id, data)} submitLabel="Guardar cambios" onSuccess={refreshCatalog} onCancel={closeModal} />}
      </AdminModal>
      <AdminConfirmModal
        open={Boolean(confirmAction)}
        title={confirmAction?.type === "group" ? `¿Eliminar ${confirmAction.group.name}?` : `¿Eliminar ${confirmAction?.product.name ?? "producto"}?`}
        description={confirmAction?.type === "group" ? "También podrían eliminarse los productos asignados a este grupo. Esta acción no se puede deshacer." : "Este producto se eliminará del catálogo y no se podrá recuperar."}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
      />
    </div>
  );
}
