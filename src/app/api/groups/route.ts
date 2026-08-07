import { NextRequest } from "next/server";
import { groupSchema } from "@/features/groups/backend/schemas/group.schema";
import { getGroups, createGroup } from "@/features/groups/backend/services/group.service";
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
    const groups = await getGroups();
    return successResponse(groups);
  } catch {
    return internalErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();
    await ensureAdmin();

    const body = await req.json();
    const parsed = groupSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const group = await createGroup(parsed.data);
    return successResponse(group, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    return internalErrorResponse();
  }
}
