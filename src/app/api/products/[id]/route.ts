import { NextRequest } from "next/server";
import { productUpdateSchema } from "@/features/products/backend/schemas/product.schema";
import {
  getProductById,
  updateProduct,
  deleteProduct,
} from "@/features/products/backend/services/product.service";
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
    const account = await ensureAdmin();
    const { id } = await params;
    const product = await getProductById(id, account.tenantId!, account.tenantSlug!);
    return successResponse(product);
  } catch {
    return notFoundResponse("Product");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();
    const account = await ensureAdmin();
    const { id } = await params;

    const body = await req.json();
    const parsed = productUpdateSchema.safeParse(body);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const product = await updateProduct(id, parsed.data, account.tenantId!, account.tenantSlug!);
    return successResponse(product);
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
    const account = await ensureAdmin();
    const { id } = await params;

    await deleteProduct(id, account.tenantId!);
    return successResponse(null, 200);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    return internalErrorResponse();
  }
}
