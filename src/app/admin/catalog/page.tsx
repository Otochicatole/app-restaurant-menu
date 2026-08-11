import { getGroups, createGroup, updateGroup, deleteGroup } from "@/features/groups/backend/services/group.service";
import { getProducts, createProduct, updateProduct, deleteProduct, updateProductOrder } from "@/features/products/backend/services/product.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import type { GroupDTO } from "@/features/groups/frontend/types";
import type { ProductDTO } from "@/features/products/frontend/types";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { revalidatePath } from "next/cache";
import { ProductCatalogClient, type CatalogActionResult } from "./ProductCatalogClient";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const [{ group }, [groups, products]] = await Promise.all([
    searchParams,
    Promise.all([getGroups(), getProducts()]),
  ]);

  async function createCatalogGroup(data: { name: string; description: string }): Promise<CatalogActionResult<GroupDTO>> {
    "use server";
    try {
      await ensureAdmin();
      const created = await createGroup(data);
      revalidatePath("/admin/catalog");
      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : "No se pudo crear el grupo" } };
    }
  }

  async function updateCatalogGroup(id: string, data: { name: string; description: string }): Promise<CatalogActionResult<GroupDTO>> {
    "use server";
    try {
      await ensureAdmin();
      const updated = await updateGroup(id, data);
      revalidatePath("/admin/catalog");
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : "No se pudo actualizar el grupo" } };
    }
  }

  async function removeCatalogGroup(id: string): Promise<CatalogActionResult> {
    "use server";
    try {
      await ensureAdmin();
      await deleteGroup(id);
      revalidatePath("/admin/catalog");
      return { success: true };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : "No se pudo eliminar el grupo" } };
    }
  }

  async function createCatalogProduct(data: { name: string; description: string; price: number; groupId: string }): Promise<CatalogActionResult<ProductDTO>> {
    "use server";
    try {
      await ensureAdmin();
      const created = await createProduct(data);
      revalidatePath("/admin/catalog");
      return { success: true, data: created };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : "No se pudo crear el producto" } };
    }
  }

  async function updateCatalogProduct(id: string, data: { name: string; description: string; price: number; groupId: string }): Promise<CatalogActionResult<ProductDTO>> {
    "use server";
    try {
      await ensureAdmin();
      const updated = await updateProduct(id, data);
      revalidatePath("/admin/catalog");
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : "No se pudo actualizar el producto" } };
    }
  }

  async function removeCatalogProduct(id: string): Promise<CatalogActionResult> {
    "use server";
    try {
      await ensureAdmin();
      await deleteProduct(id);
      revalidatePath("/admin/catalog");
      return { success: true };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : "No se pudo eliminar el producto" } };
    }
  }

  async function reorderCatalogProducts(groupId: string, productIds: string[]): Promise<CatalogActionResult> {
    "use server";
    try {
      await ensureAdmin();
      await updateProductOrder(groupId, productIds);
      revalidatePath("/admin/catalog");
      revalidatePath("/");
      return { success: true };
    } catch (error) {
      return { success: false, error: { message: error instanceof Error ? error.message : "No se pudo guardar el orden" } };
    }
  }

  return (
    <AdminLayout>
      <ProductCatalogClient
        groups={groups}
        products={products}
        initialGroupId={group}
        createGroup={createCatalogGroup}
        updateGroup={updateCatalogGroup}
        deleteGroup={removeCatalogGroup}
        createProduct={createCatalogProduct}
        updateProduct={updateCatalogProduct}
        deleteProduct={removeCatalogProduct}
        reorderProducts={reorderCatalogProducts}
      />
    </AdminLayout>
  );
}
