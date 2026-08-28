import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApplicationError } from "@/platform/application/errors";
import { logger } from "@/platform/logging/logger";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: { code: string; message: string };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

const STATUS_BY_CODE: Record<ApplicationError["code"], number> = {
  BAD_REQUEST: 400,
  CONFLICT: 409,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 422,
};

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccessResponse<T>, { status });
}

export function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message } } satisfies ApiErrorResponse,
    { status },
  );
}

export function validationErrorResponse(error: ZodError) {
  const message = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
  return errorResponse("VALIDATION_ERROR", message, 422);
}

export function applicationErrorResponse(error: ApplicationError) {
  const response = errorResponse(error.code, error.message, STATUS_BY_CODE[error.code]);
  if (error.code === "RATE_LIMITED") {
    const retryAfter = error.details?.retryAfterSeconds;
    if (typeof retryAfter === "number") response.headers.set("Retry-After", String(retryAfter));
  }
  return response;
}

export function unknownErrorResponse(error: unknown) {
  logger.error("Unhandled application error", error);
  return errorResponse("INTERNAL_ERROR", "Internal server error", 500);
}

export function handleApiError(error: unknown) {
  if (error instanceof ApplicationError) return applicationErrorResponse(error);
  if (error instanceof ZodError) return validationErrorResponse(error);
  if (error instanceof SyntaxError) return errorResponse("BAD_REQUEST", "Invalid JSON body", 400);
  return unknownErrorResponse(error);
}
