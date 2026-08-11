import { NextRequest } from "next/server";
import {
  getFeaturedProducts,
  setFeaturedProduct,
  removeFeaturedProduct,
} from "@/features/featured-products/backend/services/featured-product.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import {
  successResponse,
  internalErrorResponse,
  errorResponse,
} from "@/shared/backend/responses";
import { AppError } from "@/shared/backend/errors/app-error";
import { validateOrigin, csrfErrorResponse } from "@/shared/backend/security/csrf";

export async function GET() {
  try {
    const featured = await getFeaturedProducts();
    return successResponse(featured);
  } catch {
    return internalErrorResponse();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();
    await ensureAdmin();
    const body = await req.json();
    const { action, position, productId } = body;

    if (action === "set" && typeof position === "number" && typeof productId === "string") {
      if (position < 1 || position > 3) return errorResponse("INVALID_POSITION", "Position must be 1, 2, or 3", 400);
      await setFeaturedProduct(position, productId);
      return successResponse(null, 200);
    }

    if (action === "remove" && typeof position === "number") {
      if (position < 1 || position > 3) return errorResponse("INVALID_POSITION", "Position must be 1, 2, or 3", 400);
      await removeFeaturedProduct(position);
      return successResponse(null, 200);
    }

    return errorResponse("BAD_REQUEST", "Invalid action", 400);
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error.code, error.message, error.statusCode);
    return internalErrorResponse();
  }
}
