import { landingManagement } from "@/modules/landing-management/server";
import { LandingTemplateModerationPanel } from "@/modules/landing-management/ui";
import { menuTemplates } from "@/modules/menu-editor/server";
import { TemplateModerationPanel } from "@/modules/menu-editor/ui";

export default async function SuperAdminTemplatesPage() {
  const [templateData, landingTemplateData] = await Promise.all([
    menuTemplates.listForSuperadmin({ tab: "all", query: "", page: 1, pageSize: 24 }),
    landingManagement.listTemplatesForSuperadmin({ tab: "all", query: "", page: 1, pageSize: 24 }),
  ]);
  return (
    <main className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-8 sm:py-10">
      <section>
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Plantillas de Menú</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Biblioteca de Menús</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
            Moderá envíos públicos y administrá los presets del sistema de cartas digitales.
          </p>
        </header>
        <TemplateModerationPanel initialData={templateData} />
      </section>

      <section className="border-t border-zinc-200 pt-10">
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Plantillas de Landing Page</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">Biblioteca de Landings</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
            Moderá plantillas de landing enviadas por la comunidad y revisá los presets del sistema.
          </p>
        </header>
        <LandingTemplateModerationPanel initialData={landingTemplateData} />
      </section>
    </main>
  );
}

