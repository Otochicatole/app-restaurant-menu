import { ForbiddenError, NotFoundError } from "@/platform/application/errors";
import type { RestaurantSummary } from "../contracts";

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
