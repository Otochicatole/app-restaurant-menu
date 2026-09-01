import { NextRequest } from "next/server";
import { changePasswordCommandSchema } from "@/modules/identity-access/contracts";
import { changePassword } from "@/modules/identity-access/server";
import { errorResponse, handleApiError, successResponse } from "@/platform/http/api-response";
import { validateOrigin } from "@/platform/security/csrf";

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) return errorResponse("CSRF_ERROR", "Invalid origin", 403);
    const command = changePasswordCommandSchema.parse(await req.json());
    await changePassword(command);
    return successResponse(null);
  } catch (error) {
    return handleApiError(error);
  }
}
