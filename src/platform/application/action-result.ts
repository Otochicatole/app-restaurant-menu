import { ZodError } from "zod";
import { ApplicationError } from "./errors";
import { logger } from "@/platform/logging/logger";

export type ActionError = {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

export function actionSuccess(): ActionResult<void>;
export function actionSuccess<T>(data: T): ActionResult<T>;
export function actionSuccess<T>(data?: T): ActionResult<T | void> {
  return { success: true, data };
}

export function actionFailure(error: ActionError): ActionResult<never> {
  return { success: false, error };
}

export function actionErrorResult(error: unknown, fallbackMessage: string): ActionResult<never> {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "form");
      (fieldErrors[field] ??= []).push(issue.message);
    }
    return actionFailure({
      code: "VALIDATION_ERROR",
      message: "Revisá los datos ingresados",
      fieldErrors,
    });
  }
  if (error instanceof ApplicationError) {
    return actionFailure({ code: error.code, message: error.message });
  }
  logger.error(fallbackMessage, error);
  return actionFailure({ code: "INTERNAL_ERROR", message: fallbackMessage });
}
