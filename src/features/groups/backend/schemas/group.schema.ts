import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").default(""),
});

export const groupUpdateSchema = groupSchema.partial();

export type GroupInput = z.infer<typeof groupSchema>;
export type GroupUpdateInput = z.infer<typeof groupUpdateSchema>;
