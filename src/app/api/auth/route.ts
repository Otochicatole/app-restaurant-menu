import { NextRequest } from "next/server";
import { loginSchema } from "@/features/auth/backend/schemas/login.schema";
import { login, logout, getCurrentSession } from "@/features/auth/backend/services/auth.service";
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
  errorResponse,
} from "@/shared/backend/responses";
import { AppError } from "@/shared/backend/errors/app-error";
import { checkRateLimit } from "@/shared/backend/security/rate-limit";
import { validateOrigin, csrfErrorResponse } from "@/shared/backend/security/csrf";

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();

    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const rate = checkRateLimit(ip);
    if (!rate.allowed) {
      return errorResponse("RATE_LIMITED", `Too many attempts. Retry after ${rate.retryAfter}s`, 429);
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const result = await login(parsed.data.email, parsed.data.password);
    return successResponse({ email: result.email });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    return internalErrorResponse();
  }
}

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return successResponse(null);
    return successResponse({ email: session.email });
  } catch {
    return internalErrorResponse();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();

    await logout();
    return successResponse(null, 200);
  } catch {
    return internalErrorResponse();
  }
}
