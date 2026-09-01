import { requireSuperAdmin } from "@/modules/identity-access/server";
import { menuTemplates } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";

export async function GET() {
  try { await requireSuperAdmin(); return successResponse(await menuTemplates.listPending()); }
  catch (error) { return handleApiError(error); }
}
