import { requireSuperAdmin } from "@/modules/identity-access/server";
import { menuTemplates, superadminTemplateQuerySchema } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const url = new URL(request.url);
    return successResponse(await menuTemplates.listForSuperadmin(superadminTemplateQuerySchema.parse(Object.fromEntries(url.searchParams))));
  }
  catch (error) { return handleApiError(error); }
}
