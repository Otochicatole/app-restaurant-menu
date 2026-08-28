import { NextRequest } from "next/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuCustomization } from "@/modules/menu-customization/server";
import { blobStore, contentTypeForKey } from "@/platform/storage";
import { handleApiError } from "@/platform/http/api-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireTenantAdmin();
    const asset = await menuCustomization.getCustomFontAsset(actor.tenantId, (await params).id);
    const content = await blobStore.read(asset.storageKey);
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": contentTypeForKey(asset.storageKey),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
