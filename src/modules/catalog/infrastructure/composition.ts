import { createCatalogService } from "../application/catalog-service";
import { BlobProductMediaStorage } from "./blob-product-media-storage";
import { PrismaCatalogRepository } from "./prisma-catalog-repository";

export const catalogService = createCatalogService({
  repository: new PrismaCatalogRepository(),
  mediaStorage: new BlobProductMediaStorage(),
  productMediaUrl: ({ tenantSlug, productId, version }) =>
    `/api/public/menus/${encodeURIComponent(tenantSlug)}/products/${encodeURIComponent(productId)}/media?v=${version}`,
});
