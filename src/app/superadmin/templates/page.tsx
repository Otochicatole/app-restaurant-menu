import type { Metadata } from "next";
import { landingManagement } from "@/modules/landing-management/server";
import { LandingTemplateModerationPanel } from "@/modules/landing-management/ui";
import { menuTemplates } from "@/modules/menu-editor/server";
import { TemplateModerationPanel } from "@/modules/menu-editor/ui";
import { SuperadminTemplatesTabs } from "./SuperadminTemplatesTabs";

export const metadata: Metadata = { title: "Plantillas" };

export default async function SuperAdminTemplatesPage() {
  const [templateData, landingTemplateData, pendingMenu, pendingLanding] = await Promise.all([
    menuTemplates.listForSuperadmin({ tab: "all", query: "", page: 1, pageSize: 24 }),
    landingManagement.listTemplatesForSuperadmin({ tab: "all", query: "", page: 1, pageSize: 24 }),
    menuTemplates.listForSuperadmin({ tab: "pending", query: "", page: 1, pageSize: 1 }),
    landingManagement.listTemplatesForSuperadmin({ tab: "pending", query: "", page: 1, pageSize: 1 }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
      <SuperadminTemplatesTabs
        menuCount={templateData.total}
        menuPending={pendingMenu.total}
        landingCount={landingTemplateData.total}
        landingPending={pendingLanding.total}
        menuPanel={<TemplateModerationPanel initialData={templateData} />}
        landingPanel={<LandingTemplateModerationPanel initialData={landingTemplateData} />}
      />
    </main>
  );
}
