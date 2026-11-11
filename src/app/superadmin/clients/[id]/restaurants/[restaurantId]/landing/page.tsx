import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveSectionMetadata } from "@/app/window-title";
import { requireSuperAdmin } from "@/modules/identity-access/server";
import { landingManagement } from "@/modules/landing-management/server";
import { MonacoLandingEditor } from "@/modules/landing-management/ui";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; restaurantId: string }>;
}): Promise<Metadata> {
  const { id, restaurantId } = await params;
  return resolveSectionMetadata(
    "Landing",
    async () => {
      const context = await requireRestaurantContext(restaurantId, { allowSuperAdmin: true });
      return context.organizationId === id ? context.restaurant.name : null;
    },
    { absolute: false },
  );
}

export default async function SuperAdminRestaurantLandingPage({
  params,
}: {
  params: Promise<{ id: string; restaurantId: string }>;
}) {
  await requireSuperAdmin();
  const { id, restaurantId } = await params;
  const context = await requireRestaurantContext(restaurantId, { allowSuperAdmin: true });
  if (context.organizationId !== id) notFound();

  const editorData = await landingManagement.getLandingEditorData(restaurantId);
  return (
    <MonacoLandingEditor
      key={restaurantId}
      initialData={editorData}
      isSuperAdmin={true}
    />
  );
}
