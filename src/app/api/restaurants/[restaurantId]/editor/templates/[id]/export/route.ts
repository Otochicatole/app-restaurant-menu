import { NextRequest } from "next/server";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";
import { menuTemplates, TEMPLATE_BUNDLE_MIME_TYPE } from "@/modules/menu-editor/server";
import { handleApiError } from "@/platform/http/api-response";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ restaurantId: string; id: string }> }) {
  try {
    const { restaurantId } = await requireRestaurantContext((await params).restaurantId);
    const bundle = await menuTemplates.export(restaurantId, (await params).id);
    return new Response(Buffer.from(bundle.bytes), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${bundle.filename}"`,
        "Content-Length": String(bundle.bytes.byteLength),
        "Content-Type": TEMPLATE_BUNDLE_MIME_TYPE,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
