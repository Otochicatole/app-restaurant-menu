import { NextRequest } from "next/server";
import { getActiveTenantBySlug } from "@/features/tenants/backend/services/tenant.service";
import { getFontFile } from "@/features/fonts/backend/services/font.service";
import { contentTypeForPath, readFile } from "@/shared/backend/storage";
import { AppError } from "@/shared/backend/errors/app-error";
import { notFoundResponse, errorResponse } from "@/shared/backend/responses";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const tenant = await getActiveTenantBySlug(slug);
    const font = await getFontFile(id, tenant.id);
    const buffer = await readFile(font.filePath);
    return new Response(new Uint8Array(buffer), { headers: { "Content-Type": contentTypeForPath(font.filePath), "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch (error) {
    if (error instanceof AppError) return errorResponse(error.code, error.message, error.statusCode);
    return notFoundResponse("Font");
  }
}
