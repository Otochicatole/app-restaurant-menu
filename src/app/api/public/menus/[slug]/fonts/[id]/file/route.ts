import { NextRequest } from "next/server";
import { tenantManagement } from "@/modules/tenant-management/server";
import { menuCustomization } from "@/modules/menu-customization/server";
import { blobStore, contentTypeForKey } from "@/platform/storage";
import { handleApiError } from "@/platform/http/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id } = await params;
    const tenant = await tenantManagement.resolveActiveTenant(slug);
    const asset = await menuCustomization.getCustomFontAsset(tenant.id, id);
    const metadata = await blobStore.stat(asset.storageKey);
    if (!metadata) return new Response(null, { status: 404 });
    const etag = `W/"${metadata.size}-${metadata.updatedAt.getTime()}"`;
    if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ETag: etag } });
    const content = await blobStore.read(asset.storageKey);
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": contentTypeForKey(asset.storageKey),
        "Content-Length": String(content.length),
        "Cache-Control": "public, max-age=0, must-revalidate",
        ETag: etag,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
