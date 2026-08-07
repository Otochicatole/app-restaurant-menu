import type {GroupWithProducts} from "../utils/layout";
import {ProductCard} from "@/features/products/frontend/components/ProductCard";

interface MenuSectionProps {
    group: GroupWithProducts;
}

export function MenuSectionMid({group}: MenuSectionProps) {
    if (group.products.length === 0) return null;

    return (
        <div className="-mb-3 border-r border-l border-primary/10 p-6 h-full pb-20 rounded-3xl">
            <header style={{
                borderTopLeftRadius: 18,
                borderBottomLeftRadius: 3,
                borderBottomRightRadius: 32,
                borderTopRightRadius: 32,
            }}
                    className="flex text-white flex-col bg-primary w-fit px-6 p-3">
                <h2 className="text-3xl font-bold tracking-widest">
                    {group.name}
                </h2>
                {group.description && (<p className="text-sm opacity-70">({group.description})</p>)}
            </header>
            <div className="flex flex-col -mt-3 py-6 px-16 border-r border-l border-primary/50 h-full">
                {group.products.map((product) => (
                    <ProductCard key={product.id} product={product}/>
                ))}
            </div>
        </div>
    );
}
