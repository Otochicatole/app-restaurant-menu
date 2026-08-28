"use server";

import { revalidatePath } from "next/cache";
import { actionErrorResult, actionSuccess, type ActionResult } from "@/platform/application/action-result";
import { drainAssetCleanupQueue } from "@/platform/storage/asset-cleanup-queue";
import { logger } from "@/platform/logging/logger";
import { requireSuperAdmin } from "@/modules/identity-access/server";
import {
  createTenantCommandSchema,
  deleteTenantCommandSchema,
  resetTenantPasswordCommandSchema,
  setTenantStatusCommandSchema,
  updateTenantCommandSchema,
} from "../contracts";
import type { TenantActionData } from "../contracts";
import { tenantManagementService } from "../infrastructure/composition";

export type TenantActionResult = ActionResult<TenantActionData>;

export async function createTenantAction(formData: FormData): Promise<TenantActionResult> {
  return run(async () => {
    await requireSuperAdmin();
    const command = createTenantCommandSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      slug: formData.get("slug"),
    });
    const result = await tenantManagementService.createTenant(command);
    revalidateTenantViews();
    return actionSuccess({ temporaryPassword: result.temporaryPassword });
  }, "No se pudo crear la cuenta");
}

export async function updateTenantAction(formData: FormData): Promise<TenantActionResult> {
  return run(async () => {
    await requireSuperAdmin();
    const command = updateTenantCommandSchema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
      email: formData.get("email"),
    });
    await tenantManagementService.updateTenant(command);
    revalidateTenantViews();
    return actionSuccess({});
  }, "No se pudo actualizar la cuenta");
}

export async function setTenantStatusAction(formData: FormData): Promise<TenantActionResult> {
  return run(async () => {
    await requireSuperAdmin();
    const command = setTenantStatusCommandSchema.parse({
      id: formData.get("id"),
      status: formData.get("status"),
    });
    await tenantManagementService.setTenantStatus(command);
    revalidateTenantViews();
    return actionSuccess({});
  }, "No se pudo cambiar el estado");
}

export async function resetTenantPasswordAction(formData: FormData): Promise<TenantActionResult> {
  return run(async () => {
    await requireSuperAdmin();
    const command = resetTenantPasswordCommandSchema.parse({ id: formData.get("id") });
    const temporaryPassword = await tenantManagementService.resetTenantPassword(command);
    revalidateTenantViews();
    return actionSuccess({ temporaryPassword });
  }, "No se pudo restablecer la contraseña");
}

export async function deleteTenantAction(formData: FormData): Promise<TenantActionResult> {
  return run(async () => {
    await requireSuperAdmin();
    const command = deleteTenantCommandSchema.parse({
      id: formData.get("id"),
      confirmationSlug: formData.get("slug"),
    });
    await tenantManagementService.deleteTenant(command);
    await drainAssetCleanupQueue().catch((error) => logger.error("Deferred tenant asset cleanup", error));
    revalidateTenantViews();
    return actionSuccess({});
  }, "No se pudo borrar el cliente");
}

function revalidateTenantViews() {
  revalidatePath("/superadmin");
  revalidatePath("/m/[slug]", "page");
}

async function run(
  operation: () => Promise<TenantActionResult>,
  fallback: string,
): Promise<TenantActionResult> {
  try {
    return await operation();
  } catch (error) {
    return actionErrorResult(error, fallback);
  }
}
