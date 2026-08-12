"use client";

import type {ProductDTO} from "../types";
import {useHighlightedProduct} from "@/features/menu/frontend/search-highlight";

interface ProductCardProps {
    product: ProductDTO;
}

export function ProductCard({product}: ProductCardProps) {
    const highlightedId = useHighlightedProduct();
    const isHighlighted = highlightedId === product.id;

    return (
        <li id={`product-${product.id}`} className={`flex items-center z-10 gap-6 border-b border-primary/20 py-2 px-4 scroll-mt-8 transition-colors duration-500 ${isHighlighted ? "bg-primary animate-pulse text-background" : "text-primary"}`}>
            <p className="font-bold h-fit">
                ${product.price.toFixed(2)}
            </p>
            <div>
                <h3 className="text-md">{product.name}</h3>
                {product.description && (
                    <p className="mt-1 text-xs">({product.description})</p>
                )}
            </div>
        </li>
    );
}
