import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/modules/identity-access/server";
import { landingManagement } from "@/modules/landing-management/server";
import { MonacoLandingEditor } from "@/modules/landing-management/ui";
import { requireRestaurantContext } from "@/modules/restaurant-management/server";

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
