import { NextRequest } from "next/server";
import { z } from "zod";
import { BadRequestError } from "@/platform/application/errors";
import { requireTenantAdmin, updateAccountEmail } from "@/modules/identity-access/server";
import { menuSlugSchema, profileSchema } from "@/modules/menu-editor/contracts";
import { menuEditor, requireActiveMenuProjectForApi } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

const updateSettingsSchema = z.object({
  name: profileSchema.shape.name,
  publicDescription: profileSchema.shape.publicDescription,
  slug: menuSlugSchema,
  email: z.string().trim().email("Correo inválido").transform((value) => value.toLowerCase()),
  currentPassword: z.string().optional(),
});

export async function GET() {
  try {
    const actor = await requireTenantAdmin();
    const project = await requireActiveMenuProjectForApi(actor.tenantId);
    const profile = await menuEditor.getProfile(actor.tenantId, project.id);
    return successResponse({ ...profile, email: actor.email });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const project = await requireActiveMenuProjectForApi(actor.tenantId);
    const currentProfile = await menuEditor.getProfile(actor.tenantId, project.id);
    const input = updateSettingsSchema.parse(await request.json());

    const slugChanged = input.slug !== currentProfile.slug;
    const emailChanged = input.email !== actor.email;
    if (slugChanged || emailChanged) {
      if (!input.currentPassword?.trim()) {
        throw new BadRequestError("Para cambiar el slug o el correo tenés que confirmar tu contraseña.");
      }
      // Resolve at call time so a stale/circular binding cannot surface as "not a function".
      const identity = await import("@/modules/identity-access/server");
      await identity.verifyCurrentPassword({ currentPassword: input.currentPassword });
    }

    const profile = await menuEditor.updateProfile(actor.tenantId, project.id, {
      name: input.name,
      publicDescription: input.publicDescription,
      slug: input.slug,
    });
    const email = await updateAccountEmail({ email: input.email });
    return successResponse({ ...profile, email });
  } catch (error) {
    return handleApiError(error);
  }
}
