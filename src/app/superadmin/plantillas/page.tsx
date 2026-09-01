import { menuTemplates } from "@/modules/menu-editor/server";
import { TemplateModerationPanel } from "@/modules/menu-editor/ui";
import { PanelsTopLeft } from "lucide-react";

export default async function SuperAdminTemplatesPage() {
  const templateData = await menuTemplates.listForSuperadmin({ tab: "all", query: "", page: 1, pageSize: 24 });
  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10"><div className="mb-8 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><PanelsTopLeft size={19} /></span><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Plantillas</p><h1 className="text-3xl font-semibold tracking-tight text-zinc-950">Biblioteca de plantillas</h1><p className="mt-2 text-sm text-zinc-500">Moderá los envíos públicos y administrá los presets del sistema.</p></div></div><TemplateModerationPanel initialData={templateData} /></main>;
}
