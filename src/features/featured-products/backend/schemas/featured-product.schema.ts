import { z } from "zod";

export const featuredProductSchema = z.object({
  productId: z.string().min(1, "Product is required"),
});

export type FeaturedProductInput = z.infer<typeof featuredProductSchema>;
