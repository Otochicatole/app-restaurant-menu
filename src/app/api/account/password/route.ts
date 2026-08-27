import { NextRequest } from "next/server";
import { z } from "zod";
import { changePassword, requireAuthenticatedAccount } from "@/features/auth/backend/services/auth.service";
import { AppError } from "@/shared/backend/errors/app-error";
import { errorResponse, successResponse, validationErrorResponse, internalErrorResponse } from "@/shared/backend/responses";
import { validateOrigin, csrfErrorResponse } from "@/shared/backend/security/csrf";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, { message: "Las contraseñas no coinciden", path: ["confirmPassword"] });

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();
    const account = await requireAuthenticatedAccount();
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    await changePassword(account.adminId, parsed.data.currentPassword, parsed.data.newPassword, account.jti);
    return successResponse(null);
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error.code, error.message, error.statusCode);
    return internalErrorResponse();
  }
}
