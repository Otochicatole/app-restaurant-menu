"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, FolderPlus, GripVertical, Layers3, PackagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  adminDangerButtonClass,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
} from "@/ui/admin/AdminPrimitives";
import { AdminConfirmModal, AdminModal } from "@/ui/admin/AdminUI";
import type { CatalogActionResult, GroupInput, GroupView, ProductInput, ProductView } from "../contracts";
import { GroupEditor } from "./GroupEditor";
import { ProductEditor } from "./ProductEditor";
import { useCatalogController } from "./use-catalog-controller";

export interface CatalogScreenProps {
  groups: GroupView[];
  products: ProductView[];
  initialGroupId?: string;
  createGroup(input: GroupInput): Promise<CatalogActionResult<GroupView>>;
  updateGroup(command: { groupId: string; input: GroupInput }): Promise<CatalogActionResult<GroupView>>;
  deleteGroup(command: { groupId: string }): Promise<CatalogActionResult>;
  createProduct(input: ProductInput): Promise<CatalogActionResult<ProductView>>;
  updateProduct(command: { productId: string; input: ProductInput }): Promise<CatalogActionResult<ProductView>>;
  deleteProduct(command: { productId: string }): Promise<CatalogActionResult>;
  reorderProducts(command: { groupId: string; productIds: string[] }): Promise<CatalogActionResult>;
}

export function CatalogScreen(props: CatalogScreenProps) {
  const controller = useCatalogController({
    groups: props.groups,
    products: props.products,
    initialGroupId: props.initialGroupId,
    deleteGroup: props.deleteGroup,
    deleteProduct: props.deleteProduct,
    reorderProducts: props.reorderProducts,
  });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );
  const formGroups = props.groups.map(({ id, name }) => ({ id, name }));
  const sortable = controller.activeGroupId !== "all" && !controller.search.trim() && !controller.reordering;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catálogo"
        title="Catálogo del menú"
        description="Organizá tus grupos y mantené cada producto actualizado desde un solo lugar."
        actions={<>
          <button type="button" className={adminSecondaryButtonClass} onClick={() => controller.setModal("create-group")}><FolderPlus size={16} /> Nuevo grupo</button>
          <button type="button" className={adminPrimaryButtonClass} onClick={() => controller.setModal("create-product")} disabled={props.groups.length === 0}><PackagePlus size={16} /> Nuevo producto</button>
        </>}
      />

      {controller.actionError && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={17} /> {controller.actionError}</div>}

      {props.groups.length === 0 ? (
        <AdminEmptyState
          title="Tu catálogo está vacío"
          description="Creá tu primer grupo para comenzar a agregar productos al menú."
          action={<button type="button" className={adminPrimaryButtonClass} onClick={() => controller.setModal("create-group")}><Plus size={16} /> Crear grupo</button>}
        />
      ) : <>
        <CatalogToolbar
          groups={props.groups}
          productCount={props.products.length}
          activeGroup={controller.activeGroup}
          activeGroupId={controller.activeGroupId}
          groupCounts={controller.groupCounts}
          search={controller.search}
          reordering={controller.reordering}
          onSelectGroup={controller.selectGroup}
          onSearch={controller.setSearch}
          onEditGroup={() => controller.setModal("edit-group")}
          onDeleteGroup={() => controller.activeGroup && controller.setConfirmAction({ type: "group", group: controller.activeGroup })}
        />

        {controller.visibleProducts.length === 0 ? (
          <AdminEmptyState
            title="No se encontraron productos"
            description={controller.search ? "Probá con otro término de búsqueda." : "Este grupo todavía no tiene productos."}
            action={!controller.search ? <button type="button" className={adminPrimaryButtonClass} onClick={() => controller.setModal("create-product")}><Plus size={16} /> Agregar producto</button> : undefined}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_12px_40px_-28px_rgba(24,24,27,0.45)]">
            <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(120px,0.5fr)_minmax(150px,0.8fr)_auto] gap-4 border-b border-zinc-100 bg-zinc-50/70 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500 sm:grid">
              <span>Producto</span><span>Precio</span><span>Grupo</span><span className="text-right">Acciones</span>
            </div>
            <DndContext
              id="catalog-product-dnd"
              sensors={sensors}
              collisionDetection={closestCenter}
              measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
              onDragStart={controller.handleDragStart}
              onDragCancel={() => controller.setActiveDragId(null)}
              onDragEnd={controller.handleDragEnd}
            >
              <SortableContext items={controller.visibleProducts.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
                <div className="divide-y divide-zinc-100">
                  {controller.visibleProducts.map((product) => (
                    <SortableProductRow
                      key={product.id}
                      product={product}
                      sortable={sortable}
                      onEdit={() => { controller.setSelectedProduct(product); controller.setModal("edit-product"); }}
                      onDelete={() => controller.setConfirmAction({ type: "product", product })}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
                {controller.activeDragId
                  ? <DragOverlayProduct product={controller.visibleProducts.find(({ id }) => id === controller.activeDragId) ?? props.products.find(({ id }) => id === controller.activeDragId)!} />
                  : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </>}

      <AdminModal open={controller.modal === "create-group"} title="Crear grupo" description="Los grupos organizan los productos de tu menú público." onClose={controller.closeModal}>
        <GroupEditor
          onSubmit={props.createGroup}
          submitLabel="Crear grupo"
          onSuccess={(group) => { controller.selectGroup(group.id); controller.refreshCatalog(); }}
          onCancel={controller.closeModal}
        />
      </AdminModal>
      <AdminModal open={controller.modal === "edit-group" && Boolean(controller.activeGroup)} title="Editar grupo" description="Actualizá la información que se muestra en tu menú." onClose={controller.closeModal}>
        {controller.activeGroup && <GroupEditor
          key={controller.activeGroup.id}
          initialData={{ name: controller.activeGroup.name, description: controller.activeGroup.description }}
          onSubmit={(input) => props.updateGroup({ groupId: controller.activeGroup!.id, input })}
          submitLabel="Guardar cambios"
          onSuccess={controller.refreshCatalog}
          onCancel={controller.closeModal}
        />}
      </AdminModal>
      <AdminModal open={controller.modal === "create-product"} title="Crear producto" description="Agregá un producto a un grupo existente." onClose={controller.closeModal}>
        <ProductEditor
          key={`create-${controller.activeGroupId}`}
          groups={formGroups}
          defaultGroupId={controller.activeGroupId === "all" ? undefined : controller.activeGroupId}
          createProduct={props.createProduct}
          updateProduct={props.updateProduct}
          submitLabel="Crear producto"
          onSuccess={controller.refreshCatalog}
          onCancel={controller.closeModal}
        />
      </AdminModal>
      <AdminModal open={controller.modal === "edit-product" && Boolean(controller.selectedProduct)} title="Editar producto" description="Mantené actualizados el nombre, el precio y el grupo." onClose={controller.closeModal}>
        {controller.selectedProduct && <ProductEditor
          key={controller.selectedProduct.id}
          groups={formGroups}
          product={controller.selectedProduct}
          updateProduct={props.updateProduct}
          submitLabel="Guardar cambios"
          onSuccess={controller.refreshCatalog}
          onCancel={controller.closeModal}
        />}
      </AdminModal>
      <AdminConfirmModal
        open={Boolean(controller.confirmAction)}
        title={controller.confirmAction?.type === "group" ? `¿Eliminar ${controller.confirmAction.group.name}?` : `¿Eliminar ${controller.confirmAction?.product.name ?? "producto"}?`}
        description={controller.confirmAction?.type === "group" ? "También se eliminarán los productos asignados a este grupo. Esta acción no se puede deshacer." : "Este producto se eliminará del catálogo y no se podrá recuperar."}
        onClose={() => controller.setConfirmAction(null)}
        onConfirm={controller.handleConfirmDelete}
        loading={controller.deleting}
      />
    </div>
  );
}

function CatalogToolbar(props: {
  groups: GroupView[];
  productCount: number;
  activeGroup: GroupView | null;
  activeGroupId: string;
  groupCounts: Record<string, number>;
  search: string;
  reordering: boolean;
  onSelectGroup(groupId: string): void;
  onSearch(value: string): void;
  onEditGroup(): void;
  onDeleteGroup(): void;
}) {
  return <AdminCard className="overflow-hidden">
    <div className="overflow-x-auto border-b border-zinc-200 bg-zinc-50/70 px-3 py-3 sm:px-5">
      <div className="flex min-w-max gap-2">
        <button type="button" onClick={() => props.onSelectGroup("all")} className={groupTabClass(props.activeGroupId === "all")}><Layers3 size={16} /> Todos <span className="ml-1.5 text-xs opacity-70">{props.productCount}</span></button>
        {props.groups.map((group) => <button key={group.id} type="button" onClick={() => props.onSelectGroup(group.id)} className={groupTabClass(props.activeGroupId === group.id)}>{group.name} <span className="ml-1.5 text-xs opacity-70">{props.groupCounts[group.id] ?? 0}</span></button>)}
      </div>
    </div>
    <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{props.activeGroup ? "Vista de grupo" : "Menú completo"}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{props.activeGroup?.name ?? "Todos los productos"}</h2>
        <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500">{props.activeGroup?.description || `${props.productCount} productos en ${props.groups.length} grupos.`}</p>
        {props.activeGroup && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-700"><GripVertical size={15} />{props.search.trim() ? "Limpiá la búsqueda para ordenar" : props.reordering ? "Guardando el orden..." : "Arrastrá los productos para ordenarlos"}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {props.activeGroup && <>
          <button type="button" className={adminSecondaryButtonClass} onClick={props.onEditGroup}><Pencil size={15} /> Editar grupo</button>
          <button type="button" className={adminDangerButtonClass} onClick={props.onDeleteGroup}><Trash2 size={15} /> Eliminar grupo</button>
        </>}
        <label className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100 sm:w-52"><Search size={16} className="text-zinc-400" /><input value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="Buscar productos" className="w-full bg-transparent outline-none" /></label>
      </div>
    </div>
  </AdminCard>;
}

function SortableProductRow({ product, sortable, onEdit, onDelete }: { product: ProductView; sortable: boolean; onEdit(): void; onDelete(): void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id, disabled: !sortable });
  return <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, willChange: "transform" }} className={`grid gap-4 px-5 py-5 transition-[background-color,box-shadow,opacity] hover:bg-emerald-50/40 sm:grid-cols-[minmax(0,1.5fr)_minmax(120px,0.5fr)_minmax(150px,0.8fr)_auto] sm:items-center ${isDragging ? "relative z-10 opacity-40" : ""}`}>
    <div className="flex min-w-0 items-start gap-3">
      {sortable ? <button type="button" className="mt-0.5 cursor-grab touch-none rounded-sm p-1 text-zinc-400 hover:bg-zinc-100 hover:text-emerald-800 active:cursor-grabbing" aria-label={`Ordenar ${product.name}`} {...attributes} {...listeners}><GripVertical size={18} /></button> : <span className="hidden w-7 shrink-0 sm:block" />}
      <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-4 sm:block"><h3 className="truncate text-base font-semibold text-zinc-950">{product.name}</h3><span className="shrink-0 text-base font-semibold text-emerald-900 sm:hidden">${product.price.toFixed(2)}</span></div><p className="mt-1 truncate text-sm text-zinc-500">{product.description || "Sin descripción cargada."}</p></div>
    </div>
    <span className="hidden text-base font-semibold text-emerald-900 sm:block">${product.price.toFixed(2)}</span>
    <span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">{product.groupName}</span>
    <div className="flex gap-2 sm:justify-end"><button type="button" className={adminSecondaryButtonClass} onClick={onEdit}><Pencil size={15} /> Editar</button><button type="button" className={adminDangerButtonClass} onClick={onDelete}><Trash2 size={15} /> Eliminar</button></div>
  </article>;
}

function DragOverlayProduct({ product }: { product: ProductView }) {
  return <div className="grid w-[min(680px,calc(100vw-2rem))] gap-4 rounded-sm border border-emerald-200 bg-white px-5 py-5 shadow-2xl sm:grid-cols-[minmax(0,1.5fr)_minmax(120px,0.5fr)_minmax(150px,0.8fr)_auto] sm:items-center">
    <div className="flex min-w-0 items-center gap-3"><GripVertical size={18} className="shrink-0 text-emerald-700" /><div className="min-w-0"><p className="truncate text-base font-semibold text-zinc-950">{product.name}</p><p className="truncate text-sm text-zinc-500">{product.description || "Sin descripción cargada."}</p></div></div>
    <span className="text-base font-semibold text-emerald-900">${product.price.toFixed(2)}</span><span className="w-fit rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">{product.groupName}</span>
  </div>;
}

function groupTabClass(active: boolean): string {
  return `flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${active ? "bg-emerald-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"}`;
}
