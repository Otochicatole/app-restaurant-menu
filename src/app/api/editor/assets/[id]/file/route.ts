import { NextRequest } from "next/server";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor } from "@/modules/menu-editor/server";
import { blobStore } from "@/platform/storage";
import { handleApiError } from "@/platform/http/api-response";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireTenantAdmin();
    const asset = await menuEditor.getAsset(actor.tenantId, (await params).id, "private");
    if (!asset) return new Response(null, { status: 404 });
    const content = await blobStore.read(asset.storageKey);
    return new Response(new Uint8Array(content), { headers: { "Content-Type": asset.mimeType, "Cache-Control": "private, max-age=0, must-revalidate" } });
  } catch (error) {
    return handleApiError(error);
  }
}
