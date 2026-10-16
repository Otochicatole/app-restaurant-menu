import { redirect } from "next/navigation";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { landingManagement } from "@/modules/landing-management/server";
import { MonacoLandingEditor } from "@/modules/landing-management/ui";

export default async function AdminLandingPage() {
  const account = await requireTenantAdmin();
  const isEnabled = await landingManagement.isLandingEnabled(account.tenantId);

  if (!isEnabled) {
    redirect("/admin");
  }

  const editorData = await landingManagement.getLandingEditorData(account.tenantId);

  return <MonacoLandingEditor initialData={editorData} isSuperAdmin={false} />;
}
