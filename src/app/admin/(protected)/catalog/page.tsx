import {
  createCatalogGroup,
  createCatalogProduct,
  getCatalogSnapshot,
  removeCatalogGroup,
  removeCatalogProduct,
  reorderCatalogProducts,
  updateCatalogGroup,
  updateCatalogProduct,
} from "@/modules/catalog/server";
import { CatalogScreen } from "@/modules/catalog/ui";
import { requireTenantAdmin } from "@/modules/identity-access/server";

export default async function AdminCatalogPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  const [account, { group }] = await Promise.all([requireTenantAdmin(), searchParams]);
  const snapshot = await getCatalogSnapshot({ tenantId: account.tenantId, tenantSlug: account.tenantSlug });

  return (
    <CatalogScreen
      groups={snapshot.groups}
      products={snapshot.products}
      initialGroupId={group}
      createGroup={createCatalogGroup}
      updateGroup={updateCatalogGroup}
      deleteGroup={removeCatalogGroup}
      createProduct={createCatalogProduct}
      updateProduct={updateCatalogProduct}
      deleteProduct={removeCatalogProduct}
      reorderProducts={reorderCatalogProducts}
    />
  );
}
