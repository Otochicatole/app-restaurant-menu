import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccessResponse<T>, {
    status,
  });
}

export function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { success: false, error: { code, message } } satisfies ApiErrorResponse,
    { status }
  );
}

export function validationErrorResponse(error: ZodError) {
  const message = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
  return errorResponse("VALIDATION_ERROR", message, 422);
}

export function notFoundResponse(resource: string) {
  return errorResponse("NOT_FOUND", `${resource} not found`, 404);
}

export function conflictResponse(message: string) {
  return errorResponse("CONFLICT", message, 409);
}

export function unauthorizedResponse(message = "Unauthorized") {
  return errorResponse("UNAUTHORIZED", message, 401);
}

export function internalErrorResponse() {
  return errorResponse("INTERNAL_ERROR", "Internal server error", 500);
}
