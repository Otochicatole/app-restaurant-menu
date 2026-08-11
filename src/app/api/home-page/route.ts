import { NextRequest } from "next/server";
import { homePageUpdateSchema } from "@/features/home-page/backend/schemas/home-page.schema";
import { getOrCreateHomePage, updateHomePage } from "@/features/home-page/backend/services/home-page.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
  errorResponse,
} from "@/shared/backend/responses";
import { AppError } from "@/shared/backend/errors/app-error";
import { validateOrigin, csrfErrorResponse } from "@/shared/backend/security/csrf";

export async function GET() {
  try {
    const homePage = await getOrCreateHomePage();
    return successResponse(homePage);
  } catch {
    return internalErrorResponse();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();
    await ensureAdmin();
    const body = await req.json();
    const parsed = homePageUpdateSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const homePage = await updateHomePage(parsed.data);
    return successResponse(homePage);
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error.code, error.message, error.statusCode);
    return internalErrorResponse();
  }
}
