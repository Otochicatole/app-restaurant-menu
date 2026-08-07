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
            <header className="absolute top-0 w-full flex items-center justify-between">
                <section className="w-full">
                    <h1 className="text-center text-primary/90 font-serif font-bold text-[20px] lg:text-[40px] xl:text-[60px]">
                        Healthy
                    </h1>
                </section>
                <section className="flex flex-col w-full">
                    <h1 className="text-center text-desert font-bold text-[40px] sm:text-[60px] xl:text-[90px]">
                        Fuzion
                    </h1>
                    <div className="hidden xl:flex w-full items-center justify-center -mt-6">
                        <div className="border border-desert w-10 mx-5 mt-2"/>
                        <div className="text-center text-desert font-mono text-md mt-2 w-fit px-3 border-r-2 border-l-2 ">
                            Desayunos y meriendas
                        </div>
                        <div className="border border-desert w-10 mx-5 mt-2"/>
                    </div>
                </section>
                <section className="w-full">
                    <h1 className="text-center text-primary/90 font-serif font-bold text-[20px] lg:text-[40px] xl:text-[60px]">
                        Classic
                    </h1>
                </section>
            </header>
            {groups.length === 0 && (
                <p className="text-center text-zinc-500 py-16">No menu available yet.</p>
            )}
            <MenuGrid sections={sections}/>
        </main>
    );
}
