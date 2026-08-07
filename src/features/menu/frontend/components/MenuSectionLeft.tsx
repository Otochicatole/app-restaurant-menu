import type { GroupWithProducts } from "../utils/layout";
import { ProductCard } from "@/features/products/frontend/components/ProductCard";

interface MenuSectionProps {
  group: GroupWithProducts;
}

export function MenuSectionLeft({ group }: MenuSectionProps) {
  if (group.products.length === 0) return null;

  return (
    <div className="-mb-2">
      <header className="flex text-white flex-col w-full bg-primary rounded-xl p-3">
        <h2 className="text-3xl font-bold tracking-widest">
          {group.name}
        </h2>
        <p className="text-sm">({group.description})</p>
      </header>
      <div className="flex flex-col -mt-3 py-6 px-3 border-r border-l border-primary/50">
        {group.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
