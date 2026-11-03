import "server-only";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { landingManagement } from "@/modules/landing-management/server";
import { prisma } from "@/platform/database/prisma";
import { ForbiddenError, NotFoundError, BadRequestError } from "@/platform/application/errors";
import { PrismaFloorRepository } from "./infrastructure/prisma-floor-repository";
import type { FloorConfigView } from "./contracts";

const repository = new PrismaFloorRepository();
export async function requireFloorReadAccess(requestedId?: string): Promise<{ restaurantId: string; restaurantName: string; readOnly: boolean; canManageWalkIns: boolean }> {
  const actor = await requireAuthenticatedAccount();
  if (actor.kind === "waiter") {
    if (requestedId && requestedId !== actor.restaurantId) throw new NotFoundError("Restaurante");
    const restaurant = await prisma.restaurant.findUnique({ where: { id: actor.restaurantId }, include: { organization: true } });
    if (!restaurant || restaurant.status !== "ACTIVE" || restaurant.organization.status !== "ACTIVE" || !restaurant.floorManagementEnabled) throw new ForbiddenError("La sala no está disponible.");
    return { restaurantId: restaurant.id, restaurantName: restaurant.name, readOnly: true, canManageWalkIns: true };
  }
  if (!requestedId) throw new BadRequestError("Elegí un restaurante para consultar el salón.");
  const context = await requireRestaurantContext(requestedId, { allowSuperAdmin: true });
  return { restaurantId: context.restaurantId, restaurantName: context.restaurant.name, readOnly: false, canManageWalkIns: true };
}

export const floorManagement = {
  async getConfig(restaurantId: string): Promise<FloorConfigView> {
    const [config, compatibility] = await Promise.all([repository.getConfig(restaurantId), landingManagement.getReservationRuntimeCompatibility(restaurantId)]);
    return { ...config, compatibility };
  },
  getBoard: repository.getBoard.bind(repository),
  saveRoom: repository.saveRoom.bind(repository),
  archiveRoom: repository.archiveRoom.bind(repository),
  updateTimeZone: repository.updateTimeZone.bind(repository),
  setStaffAccount: repository.setStaffAccount.bind(repository),
  disableStaffAccount: repository.disableStaffAccount.bind(repository),
  async activate(restaurantId: string) {
    const compatibility = await landingManagement.getReservationRuntimeCompatibility(restaurantId);
    if (compatibility.status !== "compatible") throw new BadRequestError(compatibility.reason ?? "Actualizá la integración de reservas de la landing antes de activar los salones.");
    return repository.activate(restaurantId);
  },
};
