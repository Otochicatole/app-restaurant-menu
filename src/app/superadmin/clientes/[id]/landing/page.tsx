import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/modules/identity-access/server";
import { landingManagement } from "@/modules/landing-management/server";
import { MonacoLandingEditor } from "@/modules/landing-management/ui";

export default async function SuperAdminClientLandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;

  let editorData;
  try {
    editorData = await landingManagement.getLandingEditorData(id);
  } catch {
    notFound();
  }

  return <MonacoLandingEditor initialData={editorData} isSuperAdmin={true} />;
}
