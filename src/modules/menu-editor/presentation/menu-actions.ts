"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionErrorResult, type ActionResult } from "@/platform/application/action-result";
import { BadRequestError } from "@/platform/application/errors";
import { createMenuProjectSchema } from "../contracts";
import { createTemplateDocument } from "../domain/template";
import { clearActiveMenuCookie, readActiveMenuCookie, writeActiveMenuCookie } from "../infrastructure/active-menu";
import { menuEditorService } from "../infrastructure/composition";

export type MenuActionResult = ActionResult<{ projectId?: string; deletedCount?: number }>;

async function identityAccess() {
  return import("@/modules/identity-access/server");
}

export async function selectMenuAction(formData: FormData): Promise<MenuActionResult> {
  return run(async () => {
    const { requireTenantAdmin } = await identityAccess();
    const actor = await requireTenantAdmin();
    const projectId = String(formData.get("projectId") ?? "");
    const project = await menuEditorService.getProject(actor.tenantId, projectId);
    const multiMenuEnabled = await menuEditorService.getTenantMultiMenuEnabled(actor.tenantId);
    if (!multiMenuEnabled && !project.isPrimary) {
      throw new Error("Esta cuenta solo puede usar el menú principal.");
    }
    await writeActiveMenuCookie(project.id);
    revalidatePath("/admin", "layout");
    redirect("/admin");
  }, "No se pudo seleccionar el menú");
}

export async function createMenuAction(formData: FormData): Promise<MenuActionResult> {
  return run(async () => {
    const { requireTenantAdmin } = await identityAccess();
    const actor = await requireTenantAdmin();
    const command = createMenuProjectSchema.parse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      publicDescription: formData.get("publicDescription") || "Menú digital",
    });
    const project = await menuEditorService.createProject(
      actor.tenantId,
      command,
      createTemplateDocument(command.name),
    );
    await writeActiveMenuCookie(project.id);
    revalidatePath("/admin", "layout");
    redirect("/admin");
  }, "No se pudo crear el menú");
}

export async function deleteMenusAction(formData: FormData): Promise<MenuActionResult> {
  return run(async () => {
    const { requireTenantAdmin, verifyCurrentPassword } = await identityAccess();
    const actor = await requireTenantAdmin();
    const currentPassword = String(formData.get("currentPassword") ?? "");
    if (!currentPassword.trim()) {
      throw new BadRequestError("Para eliminar menús tenés que confirmar tu contraseña.");
    }
    await verifyCurrentPassword({ currentPassword });

    const scope = String(formData.get("scope") ?? "selected");
    const activeCookie = await readActiveMenuCookie();

    const result =
      scope === "all"
        ? await menuEditorService.deleteAllProjects(actor.tenantId)
        : await menuEditorService.deleteProjects(
            actor.tenantId,
            formData.getAll("projectId").map((value) => String(value)).filter(Boolean),
          );

    if (activeCookie && (scope === "all" || result.deletedIds.includes(activeCookie))) {
      await clearActiveMenuCookie();
    }

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/menus");
    return { success: true as const, data: { deletedCount: result.deletedIds.length } };
  }, "No se pudo eliminar el menú");
}

async function run(operation: () => Promise<MenuActionResult>, fallback: string): Promise<MenuActionResult> {
  try {
    return await operation();
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return actionErrorResult(error, fallback);
  }
}

function isNextRedirect(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT");
}
