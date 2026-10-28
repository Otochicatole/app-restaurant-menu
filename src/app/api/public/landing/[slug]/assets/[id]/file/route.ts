import { NextRequest } from "next/server";
import { landingManagement } from "@/modules/landing-management/server";
import { menuEditor } from "@/modules/menu-editor/server";
import { blobStore } from "@/platform/storage";
import { handleApiError } from "@/platform/http/api-response";
import { createMediaResponse } from "@/platform/http/media-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const { slug, id } = await params;
    const restaurant = await landingManagement.getRestaurantByLandingSlug(slug);
    if (
      !restaurant ||
      restaurant.status !== "ACTIVE" ||
      restaurant.organizationStatus !== "ACTIVE" ||
      !restaurant.landingEnabled ||
      !(await landingManagement.isLandingPublished(restaurant.id))
    ) {
      return new Response(null, { status: 404 });
    }
    const asset = await menuEditor.getAsset(restaurant.id, id, "private");
    if (!asset) return new Response(null, { status: 404 });
    const metadata = await blobStore.stat(asset.storageKey);
    if (!metadata) return new Response(null, { status: 404 });
    return (
      (await createMediaResponse({
        request,
        descriptor: {
          contentType: asset.mimeType,
          etag: `"${asset.storageKey}:${metadata.size}:${metadata.updatedAt.getTime()}"`,
          lastModified: metadata.updatedAt,
          mediaType: asset.mimeType.startsWith("video/")
            ? "video"
            : asset.mimeType.startsWith("image/")
              ? "image"
              : null,
          size: metadata.size,
        },
        cacheControl: "public, max-age=31536000, immutable",
        open: (range) => Promise.resolve(blobStore.open(asset.storageKey, range)),
      })) ?? new Response(null, { status: 404 })
    );
  } catch (error) {
    return handleApiError(error);
  }
}
