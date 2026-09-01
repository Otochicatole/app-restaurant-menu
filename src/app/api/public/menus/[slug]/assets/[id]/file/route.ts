import { NextRequest } from "next/server";
import { tenantManagement } from "@/modules/tenant-management/server";
import { menuEditor } from "@/modules/menu-editor/server";
import { blobStore } from "@/platform/storage";
import { handleApiError } from "@/platform/http/api-response";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  try {
    const { slug, id } = await params;
    const tenant = await tenantManagement.resolveActiveTenant(slug);
    const asset = await menuEditor.getAsset(tenant.id, id, "published");
    if (!asset) return new Response(null, { status: 404 });
    const content = await blobStore.read(asset.storageKey);
    return new Response(new Uint8Array(content), { headers: { "Content-Type": asset.mimeType, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch (error) {
    return handleApiError(error);
  }
}
