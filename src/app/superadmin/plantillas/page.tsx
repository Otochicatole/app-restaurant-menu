import { menuTemplates } from "@/modules/menu-editor/server";
import { TemplateModerationPanel } from "@/modules/menu-editor/ui";

export default async function SuperAdminTemplatesPage() {
  const templateData = await menuTemplates.listForSuperadmin({ tab: "all", query: "", page: 1, pageSize: 24 });
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">Plantillas</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-950">Biblioteca</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
          Moderá envíos públicos y administrá los presets del sistema.
        </p>
      </header>
      <TemplateModerationPanel initialData={templateData} />
    </main>
  );
}
