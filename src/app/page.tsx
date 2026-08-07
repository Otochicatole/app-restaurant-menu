import {getGroups} from "@/features/groups/backend/services/group.service";
import {getProducts} from "@/features/products/backend/services/product.service";
import {MenuGrid} from "@/features/menu/frontend/components/MenuGrid";
import {buildSections} from "@/features/menu/frontend/utils/layout";
import Link from "next/link";
import type {Metadata} from "next";

export const metadata: Metadata = {
    title: "Menu",
    description: "Our restaurant menu",
};

export default async function HomePage() {
    const [groups, products] = await Promise.all([getGroups(), getProducts()]);
    const sections = buildSections(groups, products);

    return (
        <main className="py-8 flex flex-col min-h-screen">
            {groups.length === 0 && (
                <p className="text-center text-zinc-500 py-16">No menu available yet.</p>
            )}
            <MenuGrid sections={sections}/>
        </main>
    );
}
