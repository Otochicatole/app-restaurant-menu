/** Use authenticated asset URLs only in the editor's rendered preview. */
export function landingPreviewSource(
  source: string,
  restaurantId: string,
  landingSlug: string,
): string {
  const privatePrefix = `/api/restaurants/${encodeURIComponent(restaurantId)}/editor/assets/`;
  return source
    .replaceAll(
      `/api/public/landing/${encodeURIComponent(landingSlug)}/assets/`,
      privatePrefix,
    )
    .replaceAll("/api/editor/assets/", privatePrefix);
}
