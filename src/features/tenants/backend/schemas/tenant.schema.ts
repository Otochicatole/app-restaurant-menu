import { z } from "zod";

export const tenantSlugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug solo puede contener letras minúsculas, números y guiones.").min(3).max(50);
export const tenantAccountSchema = z.object({ name: z.string().trim().min(1).max(100), email: z.string().email(), slug: tenantSlugSchema });
