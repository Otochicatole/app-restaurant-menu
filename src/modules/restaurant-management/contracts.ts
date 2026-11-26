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
export type RestaurantFeatureKey =
  | "menu"
  | "landing"
  | "reservations"
  | "floorManagement"
  | "inventory";

export type RestaurantFeatureFlags = Record<RestaurantFeatureKey, boolean>;

export type RestaurantFeatureDefinition = {
  key: RestaurantFeatureKey;
  field: "menuEnabled" | "landingEnabled" | "reservationsEnabled" | "floorManagementEnabled" | "inventoryEnabled";
  label: string;
  shortLabel: string;
  description: string;
  defaultHrefSuffix: string;
};

export const RESTAURANT_FEATURE_CATALOG: readonly RestaurantFeatureDefinition[] = [
  {
    key: "menu",
    field: "menuEnabled",
    label: "Menú Digital y Editor",
    shortLabel: "Menú",
    description: "Editor visual de carta, plantillas y menú público (/m/[slug]).",
    defaultHrefSuffix: "",
  },
  {
    key: "landing",
    field: "landingEnabled",
    label: "Landing Page",
    shortLabel: "Landing",
    description: "Sitio web público del restaurante (/l/[slug]) y editor de bloques.",
    defaultHrefSuffix: "/landing",
  },
  {
    key: "reservations",
    field: "reservationsEnabled",
    label: "Reservas Online y Agenda",
    shortLabel: "Reservas",
    description: "Agenda de reservas, estados de mesas reservadas y formulario web.",
    defaultHrefSuffix: "/reservations",
  },
  {
    key: "floorManagement",
    field: "floorManagementEnabled",
    label: "Suite Operativa de Salón",
    shortLabel: "Salón / POS",
    description: "Salones, comandas de mozos (/floor), Cocina/Barra KDS, Caja, Catálogo y Personal.",
    defaultHrefSuffix: "/rooms",
  },
  {
    key: "inventory",
    field: "inventoryEnabled",
    label: "Inventario, Proveedores y Recetas",
    shortLabel: "Inventario",
    description: "Control de stock, entradas de proveedores, recetas y descuento automático en servicio.",
    defaultHrefSuffix: "/inventory",
  },
] as const;

export type RestaurantFeatureSource = {
  menuEnabled?: boolean;
  landingEnabled?: boolean;
  reservationsEnabled?: boolean;
  floorManagementEnabled?: boolean;
  inventoryEnabled?: boolean;
};

export function featureFlagsFromRestaurant(source?: RestaurantFeatureSource | null): RestaurantFeatureFlags {
  return {
    menu: source?.menuEnabled ?? true,
    landing: source?.landingEnabled ?? false,
    reservations: source?.reservationsEnabled ?? false,
    floorManagement: source?.floorManagementEnabled ?? false,
    inventory: source?.inventoryEnabled ?? false,
  };
}

export function hasRestaurantFeature(
  source: RestaurantFeatureSource | RestaurantFeatureFlags | null | undefined,
  feature: RestaurantFeatureKey,
): boolean {
  if (!source) return false;
  if (feature in source) {
    return Boolean((source as RestaurantFeatureFlags)[feature]);
  }
  return featureFlagsFromRestaurant(source as RestaurantFeatureSource)[feature];
}

export function getFirstEnabledRestaurantHref(restaurantId: string, flags: RestaurantFeatureFlags): string {
  const basePath = `/admin/restaurants/${restaurantId}`;
  const first = RESTAURANT_FEATURE_CATALOG.find((item) => flags[item.key]);
  if (first) return `${basePath}${first.defaultHrefSuffix}`;
  return `${basePath}/settings`;
}

export type RestaurantSummary = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  landingSlug: string;
  publicDescription: string;
  status: "ACTIVE" | "SUSPENDED";
  menuEnabled?: boolean;
  landingEnabled: boolean;
  reservationsEnabled?: boolean;
  floorManagementEnabled?: boolean;
  inventoryEnabled?: boolean;
  assetQuotaBytes: number;
};
export type RestaurantContext = {
  organizationId: string;
  restaurantId: string;
  organizationName: string;
  restaurant: RestaurantSummary & { timeZone: string };
};
export type RestaurantWorkspace = {
  organizationId: string;
  organizationName: string;
  restaurants: RestaurantSummary[];
  maxRestaurants: number;
  canCreateRestaurant: boolean;
  active: RestaurantSummary | null;
};
