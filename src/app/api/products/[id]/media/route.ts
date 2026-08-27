import { NextRequest } from "next/server";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import {
  getProductMediaPath,
  removeProductMedia,
  saveProductMedia,
} from "@/features/products/backend/services/product.service";
import {
  successResponse,
  notFoundResponse,
  internalErrorResponse,
  errorResponse,
} from "@/shared/backend/responses";
import { AppError } from "@/shared/backend/errors/app-error";
import { validateOrigin, csrfErrorResponse } from "@/shared/backend/security/csrf";
import { contentTypeForPath, readFile } from "@/shared/backend/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const account = await ensureAdmin();
    const { id } = await params;
    const media = await getProductMediaPath(id, account.tenantId!);
    if (!media) return notFoundResponse("Media");

    const buffer = await readFile(media.mediaPath);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentTypeForPath(media.mediaPath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    return notFoundResponse("Media");
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();
    const account = await ensureAdmin();
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return errorResponse("VALIDATION_ERROR", "Archivo no proporcionado", 422);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const product = await saveProductMedia(id, account.tenantId!, account.tenantSlug!, {
      type: file.type,
      size: file.size,
      buffer,
    });
    return successResponse(product);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    return internalErrorResponse();
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    if (!validateOrigin(req)) return csrfErrorResponse();
    const account = await ensureAdmin();
    const { id } = await params;

    const product = await removeProductMedia(id, account.tenantId!, account.tenantSlug!);
    return successResponse(product);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    return internalErrorResponse();
  }
}
