"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionErrorResult, actionSuccess, type ActionResult } from "@/platform/application/action-result";
import { requireTenantAdmin, verifyCurrentPassword } from "@/modules/identity-access/server";
import { createRestaurantSchema } from "../contracts";
import { createRestaurant, deleteRestaurants, loadRestaurantWorkspace } from "../infrastructure/prisma-restaurant-repository";
import { clearActiveRestaurantCookie, writeActiveRestaurantCookie } from "../infrastructure/active-restaurant-cookie";
import { requireRestaurantContext } from "./restaurant-context";

export type RestaurantActionResult = ActionResult<{ deletedCount?: number }>;

export async function selectRestaurantAction(form: FormData): Promise<RestaurantActionResult> {
  try {
    const context = await requireRestaurantContext(String(form.get("restaurantId") ?? ""));
    await writeActiveRestaurantCookie(context.restaurantId);
    redirect(`/admin/restaurantes/${context.restaurantId}`);
  } catch (error) { return handle(error, "No se pudo abrir el restaurante"); }
}

export async function createRestaurantAction(form: FormData): Promise<RestaurantActionResult> {
  try {
    const actor = await requireTenantAdmin();
    const restaurant = await createRestaurant(actor.organizationId, createRestaurantSchema.parse({
      name: form.get("name"), slug: form.get("slug"), publicDescription: form.get("publicDescription") || "Menú digital",
    }));
    await writeActiveRestaurantCookie(restaurant.id);
    revalidatePath("/admin/restaurantes");
    redirect(`/admin/restaurantes/${restaurant.id}`);
  } catch (error) { return handle(error, "No se pudo crear el restaurante"); }
}

export async function deleteRestaurantsAction(form: FormData): Promise<RestaurantActionResult> {
  try {
    const actor = await requireTenantAdmin();
    await verifyCurrentPassword({ currentPassword: String(form.get("currentPassword") ?? "") });
    const workspace = await loadRestaurantWorkspace(actor.organizationId);
    const ids = form.get("scope") === "all" ? workspace.restaurants.map((restaurant) => restaurant.id)
      : z.array(z.string().min(1)).min(1).parse(form.getAll("restaurantId"));
    const deleted = await deleteRestaurants(actor.organizationId, ids);
    await clearActiveRestaurantCookie();
    revalidatePath("/admin", "layout");
    revalidatePath("/superadmin/clientes");
    revalidatePath("/m/[slug]", "page");
    revalidatePath("/l/[slug]", "page");
    return actionSuccess({ deletedCount: deleted.length });
  } catch (error) { return handle(error, "No se pudieron eliminar los restaurantes"); }
}

function handle(error: unknown, fallback: string): RestaurantActionResult {
  if (typeof error === "object" && error !== null && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
  return actionErrorResult(error, fallback);
}
