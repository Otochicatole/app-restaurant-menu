import { NextRequest } from "next/server";
import { productSchema } from "@/features/products/backend/schemas/product.schema";
import { getProducts, createProduct } from "@/features/products/backend/services/product.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import {
  successResponse,
  validationErrorResponse,
  internalErrorResponse,
  errorResponse,
} from "@/shared/backend/responses";
import { AppError } from "@/shared/backend/errors/app-error";
import { validateOrigin, csrfErrorResponse } from "@/shared/backend/security/csrf";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const groupId = url.searchParams.get("groupId") ?? undefined;
    const products = await getProducts(groupId);
    return successResponse(products);
  } catch {
    return internalErrorResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();
    await ensureAdmin();

    const body = await req.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const product = await createProduct(parsed.data);
    return successResponse(product, 201);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    return internalErrorResponse();
  }
}
