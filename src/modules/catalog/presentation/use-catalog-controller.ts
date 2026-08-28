"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { CatalogActionResult, GroupView, ProductView } from "../contracts";

export type CatalogModal = "create-group" | "edit-group" | "create-product" | "edit-product" | null;
export type CatalogDeleteTarget = { type: "product"; product: ProductView } | { type: "group"; group: GroupView };

export function useCatalogController(options: {
  groups: GroupView[];
  products: ProductView[];
  initialGroupId?: string;
  deleteGroup(command: { groupId: string }): Promise<CatalogActionResult>;
  deleteProduct(command: { productId: string }): Promise<CatalogActionResult>;
  reorderProducts(command: { groupId: string; productIds: string[] }): Promise<CatalogActionResult>;
}) {
  const router = useRouter();
  const initialSelection = options.initialGroupId && options.groups.some(({ id }) => id === options.initialGroupId)
    ? options.initialGroupId
    : "all";
  const [activeGroupId, setActiveGroupId] = useState(initialSelection);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<CatalogModal>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductView | null>(null);
  const [confirmAction, setConfirmAction] = useState<CatalogDeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [groupOrder, setGroupOrder] = useState<Record<string, string[]>>({});
  const [reordering, setReordering] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const activeGroup = options.groups.find(({ id }) => id === activeGroupId) ?? null;
  const groupCounts = useMemo(
    () => options.products.reduce<Record<string, number>>((counts, product) => {
      counts[product.groupId] = (counts[product.groupId] ?? 0) + 1;
      return counts;
    }, {}),
    [options.products],
  );

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es");
    const filtered = options.products.filter((product) => {
      const matchesGroup = activeGroupId === "all" || product.groupId === activeGroupId;
      const searchable = `${product.name} ${product.description}`.toLocaleLowerCase("es");
      return matchesGroup && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
    if (activeGroupId === "all") return filtered;
    const positions = new Map((groupOrder[activeGroupId] ?? []).map((id, index) => [id, index]));
    return [...filtered].sort((left, right) =>
      (positions.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(right.id) ?? Number.MAX_SAFE_INTEGER));
  }, [activeGroupId, groupOrder, options.products, search]);

  const selectGroup = (groupId: string) => {
    setActiveGroupId(groupId);
    setSearch("");
    router.replace(groupId === "all" ? "/admin/catalog" : `/admin/catalog?group=${encodeURIComponent(groupId)}`, { scroll: false });
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

  const handleConfirmDelete = async () => {
    if (!confirmAction) return;
    setDeleting(true);
    setActionError(null);
    try {
      const result = confirmAction.type === "product"
        ? await options.deleteProduct({ productId: confirmAction.product.id })
        : await options.deleteGroup({ groupId: confirmAction.group.id });
      if (!result.success) {
        setActionError(result.error.message);
        return;
      }
      setConfirmAction(null);
      if (confirmAction.type === "group") selectGroup("all");
      router.refresh();
    } catch {
      setActionError("No se pudo eliminar el elemento");
    } finally {
      setDeleting(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (activeGroupId !== "all" && !search.trim() && !reordering) setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    if (activeGroupId === "all" || search.trim() || !event.over || event.active.id === event.over.id) return;
    const oldIndex = visibleProducts.findIndex(({ id }) => id === event.active.id);
    const newIndex = visibleProducts.findIndex(({ id }) => id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextOrder = arrayMove(visibleProducts, oldIndex, newIndex).map(({ id }) => id);
    const previousOrder = groupOrder[activeGroupId];
    setGroupOrder((current) => ({ ...current, [activeGroupId]: nextOrder }));
    setReordering(true);
    setActionError(null);
    try {
      const result = await options.reorderProducts({ groupId: activeGroupId, productIds: nextOrder });
      if (!result.success) {
        rollbackOrder(activeGroupId, previousOrder);
        setActionError(result.error.message);
      }
    } catch {
      rollbackOrder(activeGroupId, previousOrder);
      setActionError("No se pudo guardar el orden");
    } finally {
      setReordering(false);
    }
  };

  const rollbackOrder = (groupId: string, previousOrder: string[] | undefined) => {
    setGroupOrder((current) => {
      const next = { ...current };
      if (previousOrder) next[groupId] = previousOrder;
      else delete next[groupId];
      return next;
    });
  };

  return {
    actionError,
    activeDragId,
    activeGroup,
    activeGroupId,
    closeModal,
    confirmAction,
    deleting,
    groupCounts,
    handleConfirmDelete,
    handleDragEnd,
    handleDragStart,
    modal,
    refreshCatalog,
    reordering,
    search,
    selectGroup,
    selectedProduct,
    setActionError,
    setActiveDragId,
    setConfirmAction,
    setModal,
    setSearch,
    setSelectedProduct,
    visibleProducts,
  };
}

