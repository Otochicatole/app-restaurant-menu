import { NextRequest } from "next/server";
import { z } from "zod";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { merchandising, featuredPositionSchema } from "@/modules/merchandising/server";
import { handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set"), position: featuredPositionSchema, productId: z.string().min(1) }),
  z.object({ action: z.literal("remove"), position: featuredPositionSchema }),
]);

export async function GET() {
  try {
    const actor = await requireTenantAdmin();
    return successResponse(await merchandising.getHighlights(actor.tenantId));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const mutation = mutationSchema.parse(await request.json());
    if (mutation.action === "set") {
      await merchandising.setHighlight(actor.tenantId, mutation.position, mutation.productId);
    } else {
      await merchandising.removeHighlight(actor.tenantId, mutation.position);
    }
    return successResponse(null);
  } catch (error) {
    return handleApiError(error);
  }
}
