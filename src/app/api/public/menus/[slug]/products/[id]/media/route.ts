import { NextRequest } from "next/server";
import { getActiveTenantBySlug } from "@/features/tenants/backend/services/tenant.service";
import { getProductMediaPath } from "@/features/products/backend/services/product.service";
import { contentTypeForPath, readFile } from "@/shared/backend/storage";
import { AppError } from "@/shared/backend/errors/app-error";
import { notFoundResponse, errorResponse } from "@/shared/backend/responses";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const tenant = await getActiveTenantBySlug(slug);
    const media = await getProductMediaPath(id, tenant.id);
    if (!media) return notFoundResponse("Media");
    const buffer = await readFile(media.mediaPath);
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": contentTypeForPath(media.mediaPath), "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error.code, error.message, error.statusCode);
    return notFoundResponse("Media");
  }
}
