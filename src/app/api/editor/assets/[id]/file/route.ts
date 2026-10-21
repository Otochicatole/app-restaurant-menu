import { NextRequest } from "next/server";
import { resolveEditorAssetTenantId } from "../../resolve-tenant";
import { menuEditor } from "@/modules/menu-editor/server";
import { blobStore } from "@/platform/storage";
import { handleApiError } from "@/platform/http/api-response";
import { createMediaResponse } from "@/platform/http/media-response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = await resolveEditorAssetTenantId(request);
    const asset = await menuEditor.getAsset(tenantId, (await params).id, "private");
    if (!asset) return new Response(null, { status: 404 });
    const metadata = await blobStore.stat(asset.storageKey);
    if (!metadata) return new Response(null, { status: 404 });
    return (await createMediaResponse({
      request,
      descriptor: { contentType: asset.mimeType, etag: `"${asset.storageKey}:${metadata.size}:${metadata.updatedAt.getTime()}"`, lastModified: metadata.updatedAt, mediaType: asset.mimeType.startsWith("video/") ? "video" : asset.mimeType.startsWith("image/") ? "image" : null, size: metadata.size },
      cacheControl: "private, max-age=0, must-revalidate",
      open: (range) => Promise.resolve(blobStore.open(asset.storageKey, range)),
    })) ?? new Response(null, { status: 404 });
  } catch (error) {
    return handleApiError(error);
  }
}
