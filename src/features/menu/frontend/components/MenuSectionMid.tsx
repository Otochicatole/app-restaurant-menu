import type {GroupWithProducts} from "../utils/layout";
import {ProductCard} from "@/features/products/frontend/components/ProductCard";
import type {FeaturedProductDTO} from "@/features/featured-products/frontend/types";
import Image from "next/image"

interface MenuSectionProps {
    group: GroupWithProducts;
    featured: (FeaturedProductDTO | null)[];
}

const bgColors = ["text-beige bg-primary", "bg-beige", "text-white bg-terracota"];

export function MenuSectionMid({group, featured}: MenuSectionProps) {
    if (group.products.length === 0) return null;

    const validFeatured = featured.filter((f): f is FeaturedProductDTO => f !== null);

    return (
        <div className="mt-10 border-r border-l border-primary/10 py-6 px-3 h-full pb-20 rounded-3xl">
            <header style={{
                borderTopLeftRadius: 18,
                borderBottomLeftRadius: 3,
                borderBottomRightRadius: 32,
                borderTopRightRadius: 32,
                fontFamily: "var(--font-menu-group)",
            }}
                    className="flex text-white flex-col bg-primary w-fit px-6 p-3">
                <h2 className="text-3xl font-bold tracking-widest">
                    {group.name}
                </h2>
                {group.description && (<p className="text-sm opacity-70">({group.description})</p>)}
            </header>
            <section className="flex flex-col h-full pb-10 relative overflow-hidden">
                <ul className="flex flex-col h-full -mt-3 py-6 px-3 border-l sm:border-r border-primary/50">
                    {group.products.map((product) => (
                        <ProductCard key={product.id} product={product}/>
                    ))}
                </ul>
                {validFeatured.length > 0 && (
                <div className="flex w-full lg:border-r border-primary/50 pr-6">
                    <div className="flex flex-col max-w-100 gap-2 w-fit rounded-b-3xl rounded-r-3xl border-l border-b border-r border-primary/50 p-4">
                        {validFeatured.map((f, i) => (
                            <article key={f.id} className={`px-10 py-4 sm:py-6 w-full rounded-xl border border-black/10 shadow-2xl ${bgColors[i % 3]}`} style={{ fontFamily: "var(--font-menu-featured)" }}>
                                <h1 className={`font-bold ${i === 0 ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-3xl'}`}>{f.product.name}</h1>
                                <p className="font-semibold text-sm sm:text-md">${f.product.price.toFixed(2)}</p>
                            </article>
                        ))}
                    </div>
                </div>
                )}
                <div className="flex flex-col items-center max-w-40 gap-6 sm:gap-0 sm:max-w-55 w-fit absolute -top-20 -right-8 z-0">
                    <Image
                        src="/resources/tiramisu.png"
                        alt=""
                        width={250}
                        height={250}
                        className="mt-14 sm:mt-6 w-full transition-all opacity-20"
                    />
                    <Image
                        src="/resources/tetera.png"
                        alt=""
                        width={250}
                        height={250}
                        className="-mt-20 w-full transition-all opacity-20"
                    />
                    <Image
                        src="/resources/cafe.png"
                        alt=""
                        width={250}
                        height={250}
                        className="-mt-20 w-full transition-all opacity-20"
                    />
                </div>
            </section>
        </div>
    );
}
