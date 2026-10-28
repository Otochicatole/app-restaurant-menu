"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/modules/identity-access/server";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { prisma } from "@/platform/database/prisma";
import { actionSuccess, actionErrorResult, type ActionResult } from "@/platform/application/action-result";
import { createOrganizationSchema, updateOrganizationSchema, restaurantOptionsSchema } from "../contracts";
import { organizationManagementService as service } from "../infrastructure/composition";

export type OrganizationActionResult = ActionResult<{ temporaryPassword?: string }>;
async function run(operation: () => Promise<{ temporaryPassword?: string }>): Promise<OrganizationActionResult> {
  try {
    await requireSuperAdmin();
    const result = await operation();
    revalidatePath("/superadmin"); revalidatePath("/superadmin/clientes"); revalidatePath("/admin", "layout");
    revalidatePath("/m/[slug]", "page"); revalidatePath("/l/[slug]", "page");
    return actionSuccess(result);
  } catch (error) { return actionErrorResult(error, "No se pudo completar la operación"); }
}
export async function createOrganizationAction(form: FormData) {
  return run(async () => {
    const result = await service.createOrganization(createOrganizationSchema.parse({ name: form.get("name"), email: form.get("email"), slug: form.get("slug"), restaurantName: form.get("restaurantName") || form.get("name") }));
    return { temporaryPassword: result.temporaryPassword };
  });
}
export async function updateOrganizationAction(form: FormData) {
  return run(async () => { await service.updateOrganization(updateOrganizationSchema.parse(Object.fromEntries(form))); return {}; });
}
export async function setOrganizationStatusAction(form: FormData) {
  return run(async () => { await service.setOrganizationStatus(z.string().min(1).parse(form.get("id")), z.enum(["ACTIVE", "SUSPENDED"]).parse(form.get("status"))); return {}; });
}
export async function resetOrganizationPasswordAction(form: FormData) {
  return run(async () => ({ temporaryPassword: await service.resetOrganizationPassword(z.string().min(1).parse(form.get("id"))) }));
}
export async function deleteOrganizationAction(form: FormData) {
  return run(async () => { await service.deleteOrganization(z.string().min(1).parse(form.get("id")), z.string().min(1).parse(form.get("confirmationSlug"))); return {}; });
}
export async function updateRestaurantOptionsAction(form: FormData) {
  return run(async () => {
    const input = restaurantOptionsSchema.parse({ ...Object.fromEntries(form), landingEnabled: form.get("landingEnabled") === "true" });
    await requireRestaurantContext(input.id, { allowSuperAdmin: true });
    await prisma.restaurant.update({ where: { id: input.id }, data: { status: input.status, landingEnabled: input.landingEnabled, assetQuotaBytes: input.assetQuotaBytes } });
    return {};
  });
}
