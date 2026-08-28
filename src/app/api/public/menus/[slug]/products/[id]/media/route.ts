import { NextRequest } from "next/server";
import { getProductMediaDescriptor, openProductMedia } from "@/modules/catalog/server";
import { tenantManagement } from "@/modules/tenant-management/server";
import { errorResponse, handleApiError } from "@/platform/http/api-response";
import { createMediaResponse } from "@/platform/http/media-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id } = await params;
    const tenant = await tenantManagement.resolveActiveTenant(slug);
    const command = { tenantId: tenant.id, productId: id };
    const descriptor = await getProductMediaDescriptor(command);
    if (!descriptor) return errorResponse("NOT_FOUND", "Media not found", 404);

    const response = await createMediaResponse({
      request,
      descriptor,
      cacheControl: "public, max-age=0, must-revalidate",
      open: (range) => openProductMedia({ ...command, ...(range ? { range } : {}) }),
    });
    return response ?? errorResponse("NOT_FOUND", "Media not found", 404);
  } catch (error) {
    return handleApiError(error);
  }
}
