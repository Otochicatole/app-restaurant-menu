import { z } from "zod";

export const featuredPositionSchema = z.number().int().min(1).max(3);
export const replaceHighlightsSchema = z
  .object({
    productIds: z.array(z.string().min(1).nullable()).length(3),
  })
  .superRefine(({ productIds }, context) => {
    const selected = productIds.filter((id): id is string => id !== null);
    if (new Set(selected).size !== selected.length) {
      context.addIssue({ code: "custom", path: ["productIds"], message: "Un producto solo puede ocupar una posición destacada." });
    }
  });

export type HighlightedProduct = {
  id: string;
  position: 1 | 2 | 3;
  product: { id: string; name: string; price: number; groupName: string };
  createdAt: string;
  updatedAt: string;
};

export type HighlightSlots = [HighlightedProduct | null, HighlightedProduct | null, HighlightedProduct | null];
export type ReplaceHighlightsCommand = { productIds: [string | null, string | null, string | null] };
