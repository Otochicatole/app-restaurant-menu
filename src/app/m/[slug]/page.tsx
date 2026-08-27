import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getActiveTenantBySlug } from "@/features/tenants/backend/services/tenant.service";
import { getGroups } from "@/features/groups/backend/services/group.service";
import { getProducts } from "@/features/products/backend/services/product.service";
import { getOrCreateHomePage } from "@/features/home-page/backend/services/home-page.service";
import { getFeaturedProducts } from "@/features/featured-products/backend/services/featured-product.service";
import { MenuGrid } from "@/features/menu/frontend/components/MenuGrid";
import { buildSections } from "@/features/menu/frontend/utils/layout";
import { MenuSearch } from "@/features/menu/frontend/components/MenuSearch";

export const dynamic = "force-dynamic";

async function getPageData(slug: string) {
  const tenant = await getActiveTenantBySlug(slug);
  const [groups, products, homePage, featured] = await Promise.all([
    getGroups(tenant.id), getProducts(tenant.id, tenant.slug), getOrCreateHomePage(tenant.id), getFeaturedProducts(tenant.id),
  ]);
  return { tenant, groups, products, homePage, featured };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try { const { homePage } = await getPageData((await params).slug); return { title: homePage.title, description: homePage.description, openGraph: { title: homePage.title, description: homePage.description, type: "website" } }; }
  catch { return { title: "Menú no disponible", robots: { index: false, follow: false } }; }
}

export default async function PublicMenuPage({ params }: { params: Promise<{ slug: string }> }) {
  let data;
  try { data = await getPageData((await params).slug); } catch { notFound(); }
  const { groups, products, homePage, featured } = data!;
  const sections = buildSections(groups, products);
  return <>
    <main className="py-8 flex flex-col min-h-screen">
      <header className="absolute top-0 w-full flex items-center justify-between">
        <section className="w-full flex items-center justify-center gap-1"><h1 className="hidden lg:block text-center text-primary/90 font-serif font-bold text-[20px] lg:text-[40px] xl:text-[60px]">Healthy</h1><div className="flex opacity-90"><Image className="mt-1" src="/svgs/leaf-1.svg" alt="" width={40} height={40} /><Image className="-ml-1.5" src="/svgs/leaf-2.svg" alt="" width={40} height={40} /></div></section>
        <section className="flex flex-col w-full relative"><Image className="absolute top-3 scale-x-[-1] -left-14 -z-1 hidden lg:block" src="/svgs/leaves-branch.svg" alt="" width={140} height={140} /><Image className="absolute top-3 -right-14 -z-1 hidden lg:block" src="/svgs/leaves-branch.svg" alt="" width={140} height={140} /><h1 className="text-center text-desert font-bold text-[40px] sm:text-[60px] xl:text-[90px]" style={{ fontFamily: "var(--font-menu-title)" }}>{homePage.title}</h1><div className="hidden xl:flex w-full items-center justify-center -mt-6"><div className="border border-desert w-10 mx-5 mt-2" /><div className="text-center text-desert font-mono text-md mt-2 w-fit px-3 border-r-2 border-l-2" style={{ fontFamily: "var(--font-menu-subtitle)" }}>{homePage.description}</div><div className="border border-desert w-10 mx-5 mt-2" /></div></section>
        <section className="w-full flex items-center justify-center gap-6"><h1 className="hidden lg:block text-center text-primary/90 font-serif font-bold text-[20px] lg:text-[40px] xl:text-[60px]">Classic</h1><Image className="rotate-12" src="/svgs/croissant.svg" alt="" width={90} height={90} /></section>
      </header>
      {groups.length === 0 ? <p className="text-center text-zinc-500 py-16">No menu available yet.</p> : <MenuGrid sections={sections} featured={featured} />}
    </main>
    <MenuSearch sections={sections} />
    <footer className="w-full h-60 flex items-center gap-3 justify-center"><div className="w-full max-w-12.5 sm:max-w-full border border-primary/30" /><div className="flex items-center justify-center text-center w-full"><p>Ingredientes reales. Opciones ricas y consistentes. Elegí lo que te hace bien.</p></div><div className="w-full max-w-12.5 sm:max-w-full border border-primary/30" /></footer>
  </>;
}
