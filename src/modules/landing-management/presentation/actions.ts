"use server";

import { revalidatePath } from "next/cache";
import { actionErrorResult, actionSuccess, type ActionResult } from "@/platform/application/action-result";
import { ForbiddenError } from "@/platform/application/errors";
import { requireAuthenticatedAccount } from "@/modules/identity-access/server";
import {
  publishLandingCommandSchema,
  saveLandingCommandSchema,
  type LandingPageData,
  type PublishLandingCommand,
  type SaveLandingCommand,
} from "../contracts";
import { landingManagementService } from "../infrastructure/composition";

export type LandingActionResult = ActionResult<LandingPageData>;

async function assertCanManageLanding(tenantId: string) {
  const actor = await requireAuthenticatedAccount();
  if (actor.kind === "tenant-admin") {
    if (actor.tenantId !== tenantId) {
      throw new ForbiddenError("No tenés acceso a este negocio");
    }
    const isEnabled = await landingManagementService.isLandingEnabled(tenantId);
    if (!isEnabled) {
      throw new ForbiddenError("La funcionalidad de Landing no está habilitada por el Super Admin");
    }
  }
}

export async function saveLandingDraftAction(input: SaveLandingCommand): Promise<LandingActionResult> {
  try {
    const command = saveLandingCommandSchema.parse(input);
    await assertCanManageLanding(command.tenantId);
    const data = await landingManagementService.saveDraft(command);
    revalidatePath("/admin/landing");
    revalidatePath(`/superadmin/clientes/${command.tenantId}/landing`);
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo guardar el borrador de la landing");
  }
}

export async function publishLandingAction(input: PublishLandingCommand): Promise<LandingActionResult> {
  try {
    const command = publishLandingCommandSchema.parse(input);
    await assertCanManageLanding(command.tenantId);
    const data = await landingManagementService.publishLanding(command);
    revalidatePath("/admin/landing");
    revalidatePath(`/superadmin/clientes/${command.tenantId}/landing`);
    revalidatePath("/l/[slug]", "page");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo publicar la landing");
  }
}
