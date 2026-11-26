import { ForbiddenError, NotFoundError } from "@/platform/application/errors";
import {
  RESTAURANT_FEATURE_CATALOG,
  hasRestaurantFeature,
  type RestaurantFeatureKey,
  type RestaurantSummary,
} from "../contracts";

export function assertRestaurantAccess(
  actor: { kind: string; organizationId: string | null; mustChangePassword: boolean },
  restaurant: RestaurantSummary | null,
  organizationStatus: "ACTIVE" | "SUSPENDED",
  allowSuperAdmin = false,
): asserts restaurant is RestaurantSummary {
  if (!restaurant) throw new NotFoundError("Restaurante");
  if (actor.mustChangePassword) throw new ForbiddenError("Debés cambiar tu contraseña antes de continuar");
  if (actor.kind === "super-admin" && allowSuperAdmin) return;
  if (actor.kind !== "tenant-admin" || actor.organizationId !== restaurant.organizationId) {
    throw new NotFoundError("Restaurante");
  }
  if (organizationStatus !== "ACTIVE" || restaurant.status !== "ACTIVE") {
    throw new ForbiddenError("Este restaurante no está disponible");
  }
}

export function assertRestaurantFeature(restaurant: RestaurantSummary, feature: RestaurantFeatureKey) {
  if (!hasRestaurantFeature(restaurant, feature)) {
    const def = RESTAURANT_FEATURE_CATALOG.find((item) => item.key === feature);
    throw new ForbiddenError(`Tu plan actual no incluye la funcionalidad "${def?.label ?? feature}"`);
  }
}
