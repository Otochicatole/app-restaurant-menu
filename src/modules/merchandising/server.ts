import "server-only";

import { BadRequestError } from "@/platform/application/errors";
import { highlightUseCases } from "./infrastructure/composition";

export { replaceHighlightsAction } from "./presentation/actions";

export type {
  HighlightedProduct,
  HighlightSlots,
  ReplaceHighlightsCommand,
} from "./contracts";
export { featuredPositionSchema, replaceHighlightsSchema } from "./contracts";

export const merchandising = {
  ...highlightUseCases,
  async setHighlight(tenantId: string, position: number, productId: string) {
    if (!Number.isInteger(position) || position < 1 || position > 3) {
      throw new BadRequestError("Position must be 1, 2, or 3");
    }
    const current = await highlightUseCases.getHighlights(tenantId);
    const productIds = current.map((slot) => slot?.product.id ?? null) as [string | null, string | null, string | null];
    productIds[position - 1] = productId;
    await highlightUseCases.replaceHighlights(tenantId, { productIds });
  },
  async removeHighlight(tenantId: string, position: number) {
    if (!Number.isInteger(position) || position < 1 || position > 3) {
      throw new BadRequestError("Position must be 1, 2, or 3");
    }
    const current = await highlightUseCases.getHighlights(tenantId);
    const productIds = current.map((slot) => slot?.product.id ?? null) as [string | null, string | null, string | null];
    productIds[position - 1] = null;
    await highlightUseCases.replaceHighlights(tenantId, { productIds });
  },
};
