"use client";

import { useState } from "react";
import { Image as ImageIcon, Play } from "lucide-react";
import type { ProductDTO } from "../types";
import { useHighlightedProduct } from "@/features/menu/frontend/search-highlight";
import { ProductMediaModal } from "./ProductMediaModal";

interface ProductCardProps {
    product: ProductDTO;
}

export function ProductCard({ product }: ProductCardProps) {
    const highlightedId = useHighlightedProduct();
    const isHighlighted = highlightedId === product.id;
    const [open, setOpen] = useState(false);

    const media = product.mediaUrl && product.mediaType
        ? { name: product.name, mediaUrl: product.mediaUrl, mediaType: product.mediaType }
        : null;

    return (
        <>
            <li
                id={`product-${product.id}`}
                onClick={() => media && setOpen(true)}
                role={media ? "button" : undefined}
                tabIndex={media ? 0 : undefined}
                onKeyDown={(event) => {
                    if (media && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        setOpen(true);
                    }
                }}
                className={`flex items-center z-10 gap-6 border-b border-primary/20 py-2 px-4 scroll-mt-8 transition-colors duration-500 ${media ? "cursor-pointer" : ""} ${isHighlighted ? "bg-primary animate-pulse text-background" : "text-primary"}`}
            >
                <p className="font-bold h-fit">
                    ${product.price.toFixed(2)}
                </p>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div>
                        <h3 className="text-md">{product.name}</h3>
                        {product.description && (
                            <p className="mt-1 text-xs">({product.description})</p>
                        )}
                    </div>
                    {media && (
                        <span className="ml-auto shrink-0 opacity-70" aria-hidden="true">
                            {media.mediaType === "video" ? <Play size={15} /> : <ImageIcon size={15} />}
                        </span>
                    )}
                </div>
            </li>
            {media && <ProductMediaModal product={open ? media : null} onClose={() => setOpen(false)} />}
        </>
    );
}
