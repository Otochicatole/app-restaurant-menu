import type { GroupWithProducts } from "../utils/layout";
import { ProductCard } from "@/features/products/frontend/components/ProductCard";

interface MenuSectionProps {
  group: GroupWithProducts;
}

export function MenuSectionLeft({ group }: MenuSectionProps) {
  if (group.products.length === 0) return null;

  return (
    <div className="-mb-6 h-full pb-20">
      <header className="flex text-white flex-col w-full bg-primary rounded-t-2xl rounded-b-lg px-6 p-3" style={{ fontFamily: "var(--font-menu-group)" }}>
        <h2 className="text-3xl font-bold tracking-widest">
          {group.name}
        </h2>
          {group.description && (<p className="text-sm opacity-70">({group.description})</p>)}
      </header>
      <ul className="flex flex-col -mt-3 py-6 px-3 border-r border-l border-primary/50 h-full">
        {group.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ul>
    </div>
  );
}
