import { NextRequest } from "next/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuTemplates, createTemplateSchema } from "@/modules/menu-editor/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function GET() {
  try {
    const actor = await requireTenantAdmin();
    return successResponse(await menuTemplates.list(actor.tenantId));
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const body = await request.json();
    const input = createTemplateSchema.parse(body);
    const template = await menuTemplates.create(actor.tenantId, body.document, input);
    return successResponse(template, 201);
  } catch (error) { return handleApiError(error); }
}
