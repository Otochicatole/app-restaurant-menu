import type {ProductDTO} from "../types";

interface ProductCardProps {
    product: ProductDTO;
}

export function ProductCard({product}: ProductCardProps) {
    return (
        <li className="flex items-center z-10 text-primary gap-6 border-b border-primary/20 py-2 px-4">
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
