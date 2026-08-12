import type { GroupWithProducts } from "../utils/layout";
import { ProductCard } from "@/features/products/frontend/components/ProductCard";
import Image from "next/image";

interface MenuSectionProps {
    group: GroupWithProducts;
}

export function MenuSectionRight({ group }: MenuSectionProps) {
    if (group.products.length === 0) return null;

    return (
        <section className="flex flex-col -mb-3 h-full pb-20 overflow-hidden">
            <header className="flex text-white flex-col w-full bg-primary rounded-t-2xl rounded-b-lg px-6 p-3">
                <h2 className="text-3xl font-bold tracking-widest">
                    {group.name}
                </h2>
                {group.description && (<p className="text-sm opacity-70">({group.description})</p>)}
            </header>
            <div className="flex flex-col-reverse justify-end sm:justify-start sm:flex-row relative -mt-3 sm:py-6 px-3 border-r border-l border-primary/50 h-full min-h-[70vh]">
                <ul className="flex flex-col min-w-60 w-full">
                    {group.products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </ul>
                <div className="flex sm:flex-col mb-6 pt-6 gap-1 sm:pt-20 items-center sm:max-w-40 w-full sm:w-fit sm:absolute top-0 right-0 sm:h-full justify-between">
                    <Image
                        src="/resources/medialuna.png"
                        alt=""
                        width={250}
                        height={250}
                        className="w-[25%] sm:-mt-10 sm:w-full transition-all sm:opacity-20"

                    />
                    <Image
                        src="/resources/si.png"
                        alt=""
                        width={250}
                        height={250}
                        className="w-[25%] mt-4 sm:w-full transition-all sm:opacity-20"
                    />
                    <Image
                        src="/resources/waffles.png"
                        alt=""
                        width={250}
                        height={250}
                        className="w-[25%] mt-4 sm:w-full transition-all sm:opacity-20"
                    />
                    <Image
                        src="/resources/cafe2.png"
                        alt=""
                        width={250}
                        height={250}
                        className="w-[25%] mt-4 sm:w-full transition-all sm:opacity-20"
                    />
                    <Image
                        src="/resources/tostada.png"
                        alt=""
                        width={250}
                        height={250}
                        className="w-[25%] mt-4 sm:w-full transition-all sm:opacity-20"
                    />
                </div>
            </div>
        </section>
    );
}
