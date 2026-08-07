import { NextRequest } from "next/server";
import { groupUpdateSchema } from "@/features/groups/backend/schemas/group.schema";
import {
  getGroupById,
  updateGroup,
  deleteGroup,
} from "@/features/groups/backend/services/group.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import {
  successResponse,
  notFoundResponse,
  validationErrorResponse,
  internalErrorResponse,
  errorResponse,
} from "@/shared/backend/responses";
import { AppError } from "@/shared/backend/errors/app-error";
import { validateOrigin, csrfErrorResponse } from "@/shared/backend/security/csrf";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await getGroupById(id);
    return successResponse(group);
  } catch {
    return notFoundResponse("Group");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();
    await ensureAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = groupUpdateSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const group = await updateGroup(id, parsed.data);
    return successResponse(group);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    return internalErrorResponse();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();
    await ensureAdmin();
    const { id } = await params;

    await deleteGroup(id);
    return successResponse(null, 200);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    return internalErrorResponse();
  }
}
