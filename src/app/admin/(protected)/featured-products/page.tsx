import { listProducts } from "@/modules/catalog/server";
import { merchandising, replaceHighlightsAction } from "@/modules/merchandising/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { FeaturedProductsForm } from "@/modules/merchandising/ui";
import { AdminCard, AdminPageHeader } from "@/ui/admin/AdminPrimitives";

export default async function AdminFeaturedProductsPage() {
  const account = await requireTenantAdmin();
  const [products, featured] = await Promise.all([
    listProducts({ tenantId: account.tenantId, tenantSlug: account.tenantSlug }),
    merchandising.getHighlights(account.tenantId),
  ]);

  const featuredIds = featured.map((f) => f?.product.id ?? null);

  return (
    <div className="space-y-8">
        <AdminPageHeader eyebrow="Menú público" title="Productos destacados" description="Elegí hasta tres productos para destacar en el centro de tu menú." />
        <AdminCard className="max-w-3xl p-6 sm:p-8">
          <FeaturedProductsForm
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              groupName: p.groupName ?? "",
              price: p.price,
            }))}
            featured={featuredIds}
            onSave={replaceHighlightsAction}
          />
        </AdminCard>
    </div>
  );
}
