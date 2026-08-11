import { getProductCount } from "@/features/products/backend/services/product.service";
import { getGroupCount } from "@/features/groups/backend/services/group.service";
import { getFeaturedProducts } from "@/features/featured-products/backend/services/featured-product.service";
import { getOrCreateHomePage } from "@/features/home-page/backend/services/home-page.service";
import { AdminLayout } from "@/shared/frontend/layouts/AdminLayout";
import { AdminCard, AdminPageHeader, AdminStatCard, adminPrimaryButtonClass, adminSecondaryButtonClass } from "@/shared/frontend/components/admin/AdminUI";
import Link from "next/link";

export default async function AdminDashboard() {
  const [productCount, groupCount, featured, homePage] = await Promise.all([
    getProductCount(),
    getGroupCount(),
    getFeaturedProducts(),
    getOrCreateHomePage(),
  ]);

  const featuredCount = featured.filter(Boolean).length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <AdminPageHeader
          eyebrow="Good morning"
          title="Menu overview"
          description="A quick look at your menu content and the tools you use most."
          actions={<>
            <Link href="/admin/home-page" className={adminSecondaryButtonClass}>Edit home page</Link>
            <Link href="/admin/catalog" className={adminPrimaryButtonClass}>Open catalog</Link>
          </>}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard label="Catalog" value={productCount} detail={`${groupCount} groups, managed from one place`} href="/admin/catalog" />
          <AdminStatCard label="Groups" value={groupCount} detail="Organize sections inside the catalog" href="/admin/catalog" accent="amber" />
          <AdminStatCard label="Featured" value={`${featuredCount}/3`} detail="Highlight products on the menu" href="/admin/featured-products" accent="terracotta" />
          <AdminStatCard label="Home page" value="Ready" detail="Update the public heading" href="/admin/home-page" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <AdminCard className="overflow-hidden">
            <div className="border-b border-zinc-100 px-6 py-5 sm:px-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Live content</p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-950">Home page preview</h2>
            </div>
            <div className="bg-emerald-950 px-6 py-10 text-white sm:px-10">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">Public heading</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{homePage.title}</p>
              <p className="mt-3 text-base text-emerald-100">{homePage.description}</p>
              <Link href="/admin/home-page" className="mt-8 inline-flex rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-amber-100">Customize heading</Link>
            </div>
          </AdminCard>
          <AdminCard className="p-6 sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Quick actions</p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-950">Keep moving</h2>
            <div className="mt-6 space-y-2">
              <Link href="/admin/catalog" className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50">Manage catalog <span>{"->"}</span></Link>
              <Link href="/admin/catalog" className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50">Create a group <span>{"->"}</span></Link>
              <Link href="/admin/featured-products" className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50">Set featured products <span>{"->"}</span></Link>
            </div>
          </AdminCard>
        </div>
      </div>
    </AdminLayout>
  );
}
