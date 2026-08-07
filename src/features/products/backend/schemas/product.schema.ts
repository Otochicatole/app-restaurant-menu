import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").default(""),
  price: z.number().min(0, "Price must be positive"),
  groupId: z.string().min(1, "Group is required"),
});

export const productUpdateSchema = productSchema.partial();

export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
