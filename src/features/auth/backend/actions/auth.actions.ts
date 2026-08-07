"use server";

import { loginSchema } from "../schemas/login.schema";
import { login, logout, getCurrentSession } from "../services/auth.service";
import { AppError, ValidationError } from "@/shared/backend/errors/app-error";

export async function loginAction(formData: FormData) {
  try {
    const input = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const result = await login(input.email, input.password);
    return { success: true, data: { email: result.email } };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
    if (error instanceof Error && error.name === "ZodError") {
      throw new ValidationError("Invalid credentials format");
    }
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } };
  }
}

export async function logoutAction() {
  try {
    await logout();
    return { success: true };
  } catch {
    return { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } };
  }
}

export async function getSessionAction() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: true, data: null };
    }
    return { success: true, data: { email: session.email } };
  } catch {
    return { success: true, data: null };
  }
}
