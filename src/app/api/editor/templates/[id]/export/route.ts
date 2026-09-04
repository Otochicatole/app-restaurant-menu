import { NextRequest } from "next/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuTemplates, TEMPLATE_BUNDLE_MIME_TYPE } from "@/modules/menu-editor/server";
import { handleApiError } from "@/platform/http/api-response";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireTenantAdmin();
    const bundle = await menuTemplates.export(actor.tenantId, (await params).id);
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
