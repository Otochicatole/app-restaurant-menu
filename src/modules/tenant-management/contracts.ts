import { z } from "zod";

export const tenantIdSchema = z.string().min(1);
export const tenantSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug solo puede contener letras minúsculas, números y guiones.")
  .min(3)
  .max(50);

export const createTenantCommandSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  slug: tenantSlugSchema,
});

export const updateTenantCommandSchema = z.object({
  id: tenantIdSchema,
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
});

export const setTenantStatusCommandSchema = z.object({
  id: tenantIdSchema,
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export const resetTenantPasswordCommandSchema = z.object({ id: tenantIdSchema });
export const deleteTenantCommandSchema = z.object({ id: tenantIdSchema, confirmationSlug: tenantSlugSchema });

export type TenantStatus = "ACTIVE" | "SUSPENDED";
export type CreateTenantCommand = z.infer<typeof createTenantCommandSchema>;
export type UpdateTenantCommand = z.infer<typeof updateTenantCommandSchema>;
export type SetTenantStatusCommand = z.infer<typeof setTenantStatusCommandSchema>;
export type DeleteTenantCommand = z.infer<typeof deleteTenantCommandSchema>;

export type ActiveTenant = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE";
};

export type TenantListItem = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
};

export type CreatedTenant = {
  tenant: TenantListItem;
  temporaryPassword: string;
};

export type TenantActionData = { temporaryPassword?: string };
