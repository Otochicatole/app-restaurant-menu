import { z } from "zod";

export const homePageSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().min(1, "Description is required").max(200, "Description too long"),
});

export const homePageUpdateSchema = homePageSchema.partial();

export type HomePageInput = z.infer<typeof homePageSchema>;
export type HomePageUpdateInput = z.infer<typeof homePageUpdateSchema>;
