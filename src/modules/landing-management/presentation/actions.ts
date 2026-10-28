"use server";

import { revalidatePath } from "next/cache";
import {
  actionErrorResult,
  actionSuccess,
  type ActionResult,
} from "@/platform/application/action-result";
import { ForbiddenError } from "@/platform/application/errors";
import { requireSuperAdmin } from "@/modules/identity-access/server";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import {
  createCustomModuleCommandSchema,
  createLandingTemplateSchema,
  publishLandingCommandSchema,
  saveLandingCommandSchema,
  type CreateCustomModuleCommand,
  type CreateLandingTemplateCommand,
  type LandingCustomModuleView,
  type LandingDocumentV1,
  type LandingPageData,
  type LandingTemplateView,
  type PublishLandingCommand,
  type SaveLandingCommand,
  type SuperadminLandingTemplateList,
} from "../contracts";
import { landingManagementService } from "../infrastructure/composition";

export type LandingActionResult = ActionResult<LandingPageData>;

async function assertCanManageLanding(restaurantId: string) {
  await requireRestaurantContext(restaurantId, { allowSuperAdmin: true });
  const isEnabled = await landingManagementService.isLandingEnabled(restaurantId);
  if (!isEnabled) {
    throw new ForbiddenError(
      "La funcionalidad de Landing no está habilitada para este restaurante",
    );
  }
}

export async function saveLandingDraftAction(
  input: SaveLandingCommand,
): Promise<LandingActionResult> {
  try {
    const command = saveLandingCommandSchema.parse(input);
    await assertCanManageLanding(command.restaurantId);
    const data = await landingManagementService.saveDraft(command);
    revalidatePath("/admin/restaurantes/[restaurantId]/landing", "page");
    revalidatePath("/superadmin/clientes/[id]/restaurantes/[restaurantId]/landing", "page");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo guardar el borrador de la landing",
    );
  }
}

export async function publishLandingAction(
  input: PublishLandingCommand,
): Promise<LandingActionResult> {
  try {
    const command = publishLandingCommandSchema.parse(input);
    await assertCanManageLanding(command.restaurantId);
    const data = await landingManagementService.publishLanding(command);
    revalidatePath("/admin/restaurantes/[restaurantId]/landing", "page");
    revalidatePath("/superadmin/clientes/[id]/restaurantes/[restaurantId]/landing", "page");
    revalidatePath("/l/[slug]", "page");
    return actionSuccess(data);
  } catch (error) {
    return actionErrorResult(error, "No se pudo publicar la landing");
  }
}

export async function createCustomLandingModuleAction(
  input: CreateCustomModuleCommand,
): Promise<ActionResult<LandingCustomModuleView>> {
  try {
    const command = createCustomModuleCommandSchema.parse(input);
    await assertCanManageLanding(command.restaurantId);
    const created = await landingManagementService.createCustomModule(command);
    revalidatePath("/admin/restaurantes/[restaurantId]/landing", "page");
    revalidatePath("/superadmin/clientes/[id]/restaurantes/[restaurantId]/landing", "page");
    return actionSuccess(created);
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo guardar el módulo personalizado",
    );
  }
}

export async function deleteCustomLandingModuleAction(
  restaurantId: string,
  moduleId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageLanding(restaurantId);
    await landingManagementService.deleteCustomModule(restaurantId, moduleId);
    revalidatePath("/admin/restaurantes/[restaurantId]/landing", "page");
    revalidatePath("/superadmin/clientes/[id]/restaurantes/[restaurantId]/landing", "page");
    return actionSuccess({ deletedId: moduleId });
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo eliminar el módulo personalizado",
    );
  }
}

export async function createLandingTemplateAction(input: {
  restaurantId: string;
  document: LandingDocumentV1;
  command: CreateLandingTemplateCommand;
}): Promise<ActionResult<LandingTemplateView>> {
  try {
    await assertCanManageLanding(input.restaurantId);
    const parsedCmd = createLandingTemplateSchema.parse(input.command);
    const created = await landingManagementService.createTemplate(
      input.restaurantId,
      input.document,
      parsedCmd,
    );
    revalidatePath("/admin/restaurantes/[restaurantId]/landing", "page");
    revalidatePath("/superadmin/clientes/[id]/restaurantes/[restaurantId]/landing", "page");
    revalidatePath("/superadmin/plantillas");
    return actionSuccess(created);
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo guardar la plantilla de landing",
    );
  }
}

export async function deletePrivateLandingTemplateAction(
  restaurantId: string,
  templateId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageLanding(restaurantId);
    await landingManagementService.deletePrivateTemplate(restaurantId, templateId);
    revalidatePath("/admin/restaurantes/[restaurantId]/landing", "page");
    revalidatePath("/superadmin/clientes/[id]/restaurantes/[restaurantId]/landing", "page");
    return actionSuccess({ deletedId: templateId });
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo eliminar la plantilla privada",
    );
  }
}

export async function exportLandingTemplateAction(
  restaurantId: string,
  templateId: string,
): Promise<ActionResult<{ base64: string; filename: string }>> {
  try {
    await assertCanManageLanding(restaurantId);
    const { bytes, filename } = await landingManagementService.exportTemplate(
      restaurantId,
      templateId,
    );
    return actionSuccess({
      base64: Buffer.from(bytes).toString("base64"),
      filename,
    });
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo exportar la plantilla de landing",
    );
  }
}

export async function importLandingTemplateAction(
  restaurantId: string,
  base64Content: string,
): Promise<ActionResult<LandingTemplateView>> {
  try {
    await assertCanManageLanding(restaurantId);
    const bytes = new Uint8Array(Buffer.from(base64Content, "base64"));
    const imported = await landingManagementService.importTemplate(
      restaurantId,
      bytes,
    );
    revalidatePath("/admin/restaurantes/[restaurantId]/landing", "page");
    revalidatePath("/superadmin/clientes/[id]/restaurantes/[restaurantId]/landing", "page");
    return actionSuccess(imported);
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo importar la plantilla de landing",
    );
  }
}

export async function listSuperadminLandingTemplatesAction(
  query: unknown,
): Promise<ActionResult<SuperadminLandingTemplateList>> {
  try {
    await requireSuperAdmin();
    const list = await landingManagementService.listTemplatesForSuperadmin(
      query,
    );
    return actionSuccess(list);
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo cargar el catálogo de plantillas de landing",
    );
  }
}

export async function moderateLandingTemplateAction(input: {
  templateId: string;
  action: "publish" | "reject" | "archive" | "restore" | "delete";
  reason?: string;
}): Promise<ActionResult<{ ok: true }>> {
  try {
    await requireSuperAdmin();
    if (input.action === "delete") {
      await landingManagementService.deletePublicTemplate(input.templateId);
    } else {
      await landingManagementService.moderateTemplate(
        input.templateId,
        input.action,
        input.reason,
      );
    }
    revalidatePath("/superadmin/plantillas");
    revalidatePath("/admin/restaurantes/[restaurantId]/landing", "page");
    return actionSuccess({ ok: true });
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo moderar la plantilla de landing",
    );
  }
}
