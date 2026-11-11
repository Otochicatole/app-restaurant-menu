import type { Metadata } from "next";
import { resolveSectionMetadata } from "@/app/window-title";
import { floorManagement, requireFloorReadAccess } from "@/modules/floor-management/server";
import { FloorBoardScreen } from "@/modules/floor-management/ui";
import { getAuthenticatedAccount } from "@/modules/identity-access/server";
import { redirect } from "next/navigation";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ restaurantId?: string }> }): Promise<Metadata> {
  const { restaurantId } = await searchParams;
  return resolveSectionMetadata("Sala", async () => (await requireFloorReadAccess(restaurantId)).restaurantName);
}

export default async function DiningRoomPage({ searchParams }: { searchParams: Promise<{ restaurantId?: string }> }) {
  const requestedId = (await searchParams).restaurantId;
  const actor = await getAuthenticatedAccount();
  if (!actor) redirect("/admin/login");
  if (actor.kind !== "waiter" && !requestedId) redirect(actor.kind === "super-admin" ? "/superadmin" : "/admin/restaurants");
  const access = await requireFloorReadAccess(requestedId);
  const initialBoard = await floorManagement.getBoard(access.restaurantId, undefined, true);
  return <FloorBoardScreen key={access.restaurantId} restaurantId={access.restaurantId} restaurantName={access.restaurantName} readOnly={access.readOnly} canManageWalkIns={access.canManageWalkIns} initialBoard={initialBoard} />;
}
