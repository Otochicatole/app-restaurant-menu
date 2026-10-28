import { z } from "zod";
import { restaurantSlugSchema, type RestaurantSummary } from "@/modules/restaurant-management/contracts";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1).max(100), email: z.string().trim().toLowerCase().email(),
  slug: restaurantSlugSchema, restaurantName: z.string().trim().min(1).max(100),
});
export const updateOrganizationSchema = z.object({
  id: z.string().min(1), name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(), maxRestaurants: z.coerce.number().int().min(1).max(50),
});
export const restaurantOptionsSchema = z.object({
  id: z.string().min(1), status: z.enum(["ACTIVE", "SUSPENDED"]),
  landingEnabled: z.boolean(), assetQuotaBytes: z.coerce.number().int().min(1).max(2_147_483_647),
});
export type CreateOrganizationCommand = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationCommand = z.infer<typeof updateOrganizationSchema>;
export type OrganizationListItem = {
  id: string; name: string; slug: string; status: "ACTIVE" | "SUSPENDED"; maxRestaurants: number;
  email: string; lastLoginAt: string | null; createdAt: string; restaurants: RestaurantSummary[];
};
