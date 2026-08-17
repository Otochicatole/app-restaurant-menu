import { NextRequest } from "next/server";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { createCustomFont, getFonts } from "@/features/fonts/backend/services/font.service";
import type { FontCategory } from "@/features/fonts/backend/types";
import {
  successResponse,
  internalErrorResponse,
  errorResponse,
} from "@/shared/backend/responses";
import { AppError } from "@/shared/backend/errors/app-error";
import { validateOrigin, csrfErrorResponse } from "@/shared/backend/security/csrf";

export async function GET() {
  try {
    const fonts = await getFonts();
    return successResponse(fonts);
  } catch {
    return internalErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();
    await ensureAdmin();

    const formData = await req.formData();
    const name = formData.get("name");
    const category = formData.get("category");
    const file = formData.get("file");

    if (typeof name !== "string" || typeof category !== "string") {
      return errorResponse("VALIDATION_ERROR", "Nombre y categoría son obligatorios", 422);
    }
    if (!(file instanceof File)) {
      return errorResponse("VALIDATION_ERROR", "Archivo de fuente no proporcionado", 422);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const font = await createCustomFont({
      name,
      category: category as FontCategory,
      file: { name: file.name, size: file.size, buffer },
    });
    return successResponse(font, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    return internalErrorResponse();
  }
}
