import { z } from "zod";

export const restaurantSlugSchema = z.string().trim().toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá letras minúsculas, números y guiones.").min(3).max(50)
  .refine((value) => !["admin", "api", "login", "superadmin", "_next", "m", "l"].includes(value), "Ese slug está reservado.");

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: restaurantSlugSchema,
  publicDescription: z.string().trim().max(500).default("Menú digital"),
});

export type CreateRestaurantCommand = z.infer<typeof createRestaurantSchema>;
export type RestaurantSummary = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  landingSlug: string;
  publicDescription: string;
  status: "ACTIVE" | "SUSPENDED";
  landingEnabled: boolean;
  assetQuotaBytes: number;
};
export type RestaurantContext = {
  organizationId: string;
  restaurantId: string;
  organizationName: string;
  restaurant: RestaurantSummary;
};
export type RestaurantWorkspace = {
  organizationId: string;
  organizationName: string;
  restaurants: RestaurantSummary[];
  maxRestaurants: number;
  canCreateRestaurant: boolean;
  active: RestaurantSummary | null;
};
