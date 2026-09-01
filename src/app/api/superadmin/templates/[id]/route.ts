import { NextRequest } from "next/server";
import { BadRequestError } from "@/platform/application/errors";
import { requireSuperAdmin } from "@/modules/identity-access/server";
import { menuTemplates } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    await requireSuperAdmin();
    const body = await request.json() as { action?: "publish" | "reject" | "archive" | "restore"; reason?: string };
    if (!body.action) throw new BadRequestError("Acción inválida");
    return successResponse(await menuTemplates.moderate((await params).id, body.action, body.reason));
  } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    await requireSuperAdmin();
    await menuTemplates.deletePublic((await params).id);
    return successResponse({ deleted: true });
  } catch (error) { return handleApiError(error); }
}
