import { NextRequest } from "next/server";
import { loginCommandSchema } from "@/modules/identity-access/contracts";
import {
  getAuthenticatedAccount,
  login,
  logout,
  toLoginView,
  toSessionView,
} from "@/modules/identity-access/server";
import { errorResponse, handleApiError, successResponse } from "@/platform/http/api-response";
import { validateOrigin } from "@/platform/security/csrf";
import { getServerEnv } from "@/platform/config/server-env";

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) return errorResponse("CSRF_ERROR", "Invalid origin", 403);

    const command = loginCommandSchema.parse(await req.json());
    const throttleKey = `${clientAddress(req)}\0${command.email}`;
    return successResponse(toLoginView(await login(command, { throttleKey })));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const account = await getAuthenticatedAccount();
    if (!account) return successResponse(null);
    return successResponse(toSessionView(account));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!validateOrigin(req)) return errorResponse("CSRF_ERROR", "Invalid origin", 403);

    await logout();
    return successResponse(null, 200);
  } catch (error) {
    return handleApiError(error);
  }
}

function clientAddress(req: NextRequest): string {
  if (!getServerEnv().TRUST_PROXY) return "direct";
  return (
    req.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}
