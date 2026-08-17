import { z } from "zod";

export const fontCategorySchema = z.enum(["serif", "sans-serif", "monospace", "display", "script"]);

export const createCustomFontSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(100, "El nombre es demasiado largo"),
  category: fontCategorySchema,
});

export type CreateCustomFontInput = z.infer<typeof createCustomFontSchema>;
