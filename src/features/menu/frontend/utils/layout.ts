import type { ProductDTO } from "@/features/products/frontend/types";
import type { GroupDTO } from "@/features/groups/frontend/types";

export interface GroupWithProducts {
  name: string;
  description: string;
  products: ProductDTO[];
}

export interface RowDistribution {
  col1: GroupWithProducts[];
  col2: GroupWithProducts[];
  col3: GroupWithProducts[];
}

export function buildSections(groups: GroupDTO[], products: ProductDTO[]): GroupWithProducts[] {
  const productsByGroup = new Map(groups.map((g) => [g.id, {
    name: g.name,
    description: g.description,
    products: [] as ProductDTO[],
  }]));
  for (const product of products) {
    const group = productsByGroup.get(product.groupId);
    if (group) group.products.push(product);
  }
  return Array.from(productsByGroup.values());
}

export function chunkBy4(sections: GroupWithProducts[]): GroupWithProducts[][] {
  const chunks: GroupWithProducts[][] = [];
  for (let i = 0; i < sections.length; i += 4) {
    chunks.push(sections.slice(i, i + 4));
  }
  return chunks;
}

export function distribute(chunk: GroupWithProducts[]): RowDistribution {
  return {
    col1: chunk.filter((_, i) => i === 0 || i === 1),
    col2: chunk.filter((_, i) => i === 2),
    col3: chunk.filter((_, i) => i === 3),
  };
}
