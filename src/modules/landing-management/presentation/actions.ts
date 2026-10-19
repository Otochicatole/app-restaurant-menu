"use server";

import { revalidatePath } from "next/cache";
import {
  actionErrorResult,
  actionSuccess,
  type ActionResult,
} from "@/platform/application/action-result";
import { ForbiddenError } from "@/platform/application/errors";
import {
  requireAuthenticatedAccount,
  requireSuperAdmin,
} from "@/modules/identity-access/server";
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

async function assertCanManageLanding(tenantId: string) {
  const actor = await requireAuthenticatedAccount();
  if (actor.kind === "tenant-admin") {
    if (actor.tenantId !== tenantId) {
      throw new ForbiddenError("No tenés acceso a este negocio");
    }
    const isEnabled = await landingManagementService.isLandingEnabled(tenantId);
    if (!isEnabled) {
      throw new ForbiddenError(
        "La funcionalidad de Landing no está habilitada por el Super Admin",
      );
    }
  }
}

export async function saveLandingDraftAction(
  input: SaveLandingCommand,
): Promise<LandingActionResult> {
  try {
    const command = saveLandingCommandSchema.parse(input);
    await assertCanManageLanding(command.tenantId);
    const data = await landingManagementService.saveDraft(command);
    revalidatePath("/admin/landing");
    revalidatePath(`/superadmin/clientes/${command.tenantId}/landing`);
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

export async function createCustomLandingModuleAction(
  input: CreateCustomModuleCommand,
): Promise<ActionResult<LandingCustomModuleView>> {
  try {
    const command = createCustomModuleCommandSchema.parse(input);
    await assertCanManageLanding(command.tenantId);
    const created = await landingManagementService.createCustomModule(command);
    revalidatePath("/admin/landing");
    revalidatePath(`/superadmin/clientes/${command.tenantId}/landing`);
    return actionSuccess(created);
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo guardar el módulo personalizado",
    );
  }
}

export async function deleteCustomLandingModuleAction(
  tenantId: string,
  moduleId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageLanding(tenantId);
    await landingManagementService.deleteCustomModule(tenantId, moduleId);
    revalidatePath("/admin/landing");
    revalidatePath(`/superadmin/clientes/${tenantId}/landing`);
    return actionSuccess({ deletedId: moduleId });
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo eliminar el módulo personalizado",
    );
  }
}

export async function createLandingTemplateAction(input: {
  tenantId: string;
  document: LandingDocumentV1;
  command: CreateLandingTemplateCommand;
}): Promise<ActionResult<LandingTemplateView>> {
  try {
    await assertCanManageLanding(input.tenantId);
    const parsedCmd = createLandingTemplateSchema.parse(input.command);
    const created = await landingManagementService.createTemplate(
      input.tenantId,
      input.document,
      parsedCmd,
    );
    revalidatePath("/admin/landing");
    revalidatePath(`/superadmin/clientes/${input.tenantId}/landing`);
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
  tenantId: string,
  templateId: string,
): Promise<ActionResult<{ deletedId: string }>> {
  try {
    await assertCanManageLanding(tenantId);
    await landingManagementService.deletePrivateTemplate(tenantId, templateId);
    revalidatePath("/admin/landing");
    revalidatePath(`/superadmin/clientes/${tenantId}/landing`);
    return actionSuccess({ deletedId: templateId });
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo eliminar la plantilla privada",
    );
  }
}

export async function exportLandingTemplateAction(
  tenantId: string,
  templateId: string,
): Promise<ActionResult<{ base64: string; filename: string }>> {
  try {
    await assertCanManageLanding(tenantId);
    const { bytes, filename } = await landingManagementService.exportTemplate(
      tenantId,
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
  tenantId: string,
  base64Content: string,
): Promise<ActionResult<LandingTemplateView>> {
  try {
    await assertCanManageLanding(tenantId);
    const bytes = new Uint8Array(Buffer.from(base64Content, "base64"));
    const imported = await landingManagementService.importTemplate(
      tenantId,
      bytes,
    );
    revalidatePath("/admin/landing");
    revalidatePath(`/superadmin/clientes/${tenantId}/landing`);
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
    revalidatePath("/admin/landing");
    return actionSuccess({ ok: true });
  } catch (error) {
    return actionErrorResult(
      error,
      "No se pudo moderar la plantilla de landing",
    );
  }
}
