"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { SuperadminTemplateList, SuperadminTemplateTab, SuperadminTemplateView } from "../contracts";
import { TemplateMiniature } from "./EditorToolsPanel";

const TABS: Array<{ id: SuperadminTemplateTab; label: string }> = [
  { id: "all", label: "Todas" }, { id: "system", label: "Sistema" }, { id: "published", label: "Publicadas" },
  { id: "pending", label: "Pendientes" }, { id: "rejected", label: "Rechazadas" }, { id: "archived", label: "Archivadas" },
];
type Action = "publish" | "reject" | "archive" | "restore" | "delete";

export function TemplateModerationPanel({ initialData }: { initialData: SuperadminTemplateList }) {
  const [tab, setTab] = useState<SuperadminTemplateTab>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SuperadminTemplateView | null>(null);
  const [action, setAction] = useState<{ template: SuperadminTemplateView; kind: Action } | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => { setDebouncedQuery(query.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [query]);
  const load = useCallback(async (requestedPage: number) => {
    setLoading(true); setError(null);
    const params = new URLSearchParams({ tab, query: debouncedQuery, page: String(requestedPage), pageSize: "24" });
    try {
      const response = await fetch(`/api/superadmin/templates?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "No se pudo cargar el catálogo.");
      setData(payload.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo."); }
    finally { setLoading(false); }
  }, [debouncedQuery, tab]);
  useEffect(() => { const timer = window.setTimeout(() => { void load(1); }, 0); return () => window.clearTimeout(timer); }, [load]);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const statusText = useMemo(() => ({ PENDING: "Pendiente", PUBLISHED: "Publicada", REJECTED: "Rechazada", ARCHIVED: "Archivada", DRAFT: "Borrador" } as const), []);
  const performAction = async () => {
    if (!action || (action.kind === "reject" && !reason.trim())) return;
    const current = action; setAction(null); setLoading(true); setError(null);
    try {
      const method = current.kind === "delete" ? "DELETE" : "PATCH";
      const response = await fetch(`/api/superadmin/templates/${encodeURIComponent(current.template.id)}`, { method, headers: { "Content-Type": "application/json" }, ...(method === "PATCH" ? { body: JSON.stringify({ action: current.kind, reason: reason.trim() || undefined }) } : {}) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "No se pudo actualizar la plantilla.");
      setReason(""); await load(page);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo actualizar la plantilla."); setLoading(false); }
  };

  return <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm" aria-labelledby="template-admin-title">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Biblioteca</p><h2 id="template-admin-title" className="mt-1 text-xl font-semibold">Administración de plantillas</h2><p className="mt-1 text-sm text-zinc-500">Gestioná presets y envíos públicos de la comunidad.</p></div><label className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 lg:max-w-xs"><Search size={16} className="shrink-0 text-zinc-400" /><input aria-label="Buscar plantillas" className="min-w-0 flex-1 text-sm outline-none" placeholder="Buscar por nombre o restaurante" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
    <div className="mt-5 flex gap-1 overflow-x-auto border-b border-zinc-200" role="tablist" aria-label="Filtrar plantillas">{TABS.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={`shrink-0 border-b-2 px-3 py-2 text-xs font-medium transition ${tab === item.id ? "border-emerald-700 text-emerald-800" : "border-transparent text-zinc-500 hover:text-zinc-800"}`} onClick={() => { setTab(item.id); setPage(1); }}>{item.label}</button>)}</div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    <div className="mt-5 flex items-center justify-between text-xs text-zinc-500"><span>{loading ? "Cargando…" : `${data.total} plantilla${data.total === 1 ? "" : "s"}`}</span><span>Página {Math.min(page, pages)} de {pages}</span></div>
    {data.items.length === 0 && !loading ? <div className="mt-5 rounded-xl border border-dashed border-zinc-200 px-4 py-12 text-center text-sm text-zinc-500">No hay plantillas para este filtro.</div> : <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.items.map((template) => <TemplateCard key={template.id} template={template} statusText={statusText[template.status]} onPreview={() => setPreview(template)} onAction={(kind) => { setReason(""); setAction({ template, kind }); }} />)}</div>}
    <div className="mt-6 flex items-center justify-center gap-3"><button aria-label="Página anterior" disabled={page <= 1 || loading} className="rounded-lg border border-zinc-200 p-2 disabled:opacity-40" onClick={() => { const next = page - 1; setPage(next); void load(next); }}><ChevronLeft size={16} /></button><button aria-label="Página siguiente" disabled={page >= pages || loading} className="rounded-lg border border-zinc-200 p-2 disabled:opacity-40" onClick={() => { const next = page + 1; setPage(next); void load(next); }}><ChevronRight size={16} /></button></div>
    {preview && <PreviewModal template={preview} onClose={() => setPreview(null)} />}{action && <ActionModal action={action} reason={reason} onReasonChange={setReason} onClose={() => setAction(null)} onConfirm={() => void performAction()} />}
  </section>;
}

function TemplateCard({ template, statusText, onPreview, onAction }: { template: SuperadminTemplateView; statusText: string; onPreview: () => void; onAction: (action: Action) => void }) {
  const system = template.isSystem;
  return <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white"><button className="block w-full text-left" onClick={onPreview} aria-label={`Previsualizar ${template.name}`}><TemplateMiniature document={template.document} large /></button><div className="p-4"><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">{template.name}</h3><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${system ? "bg-amber-50 text-amber-800" : template.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-800" : template.status === "PENDING" ? "bg-blue-50 text-blue-800" : template.status === "REJECTED" ? "bg-red-50 text-red-800" : "bg-zinc-100 text-zinc-600"}`}>{system ? "Sistema" : statusText}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{template.description || "Sin descripción"}</p>{template.owner && <p className="mt-3 text-xs text-zinc-600">Restaurante: <strong>{template.owner.name}</strong> <span className="text-zinc-400">/{template.owner.slug}</span></p>}{template.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 px-2.5 py-2 text-xs leading-4 text-red-800">Motivo: {template.rejectionReason}</p>}<div className="mt-4 flex flex-wrap gap-2">{!system && template.status === "PENDING" && <><button className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white" onClick={() => onAction("publish")}>Publicar</button><button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" onClick={() => onAction("reject")}>Rechazar</button></>}{!system && template.status === "PUBLISHED" && <button className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700" onClick={() => onAction("archive")}>Archivar</button>}{!system && template.status === "ARCHIVED" && <button className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white" onClick={() => onAction("restore")}>Restaurar</button>}{!system && <button className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" onClick={() => onAction("delete")}>Eliminar</button>}<button className="rounded-lg border border-zinc-200 px-3 py-2 text-xs" onClick={onPreview}>Ver diseño</button></div></div></article>;
}

function PreviewModal({ template, onClose }: { template: SuperadminTemplateView; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="template-preview-title"><div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4"><div><h2 id="template-preview-title" className="text-base font-semibold">{template.name}</h2><p className="mt-1 text-xs text-zinc-500">Previsualización del documento Canvas</p></div><button className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" onClick={onClose} aria-label="Cerrar previsualización"><X size={18} /></button></div><div className="min-h-0 flex-1 overflow-auto bg-zinc-100 p-8"><div className="mx-auto max-w-3xl"><TemplateMiniature document={template.document} large preview /></div></div></div></div>;
}

function ActionModal({ action, reason, onReasonChange, onClose, onConfirm }: { action: { template: SuperadminTemplateView; kind: Action }; reason: string; onReasonChange: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  const rejection = action.kind === "reject";
  const labels = { publish: "Publicar plantilla", reject: "Rechazar plantilla", archive: "Archivar plantilla", restore: "Restaurar plantilla", delete: "Eliminar plantilla" } as const;
  const destructive = action.kind === "delete" || rejection;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="template-action-title"><h2 id="template-action-title" className="text-base font-semibold">{labels[action.kind]}</h2><p className="mt-2 text-sm leading-6 text-zinc-600">{rejection ? `Indica por qué “${action.template.name}” no puede publicarse.` : action.kind === "delete" ? `Se eliminará definitivamente “${action.template.name}” y sus archivos asociados.` : `¿Querés ${action.kind === "publish" ? "publicar" : action.kind === "archive" ? "archivar" : "restaurar"} “${action.template.name}”?`}</p>{rejection && <textarea autoFocus maxLength={500} className="mt-4 min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm outline-none focus:border-emerald-500" value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Motivo del rechazo" />}<div className="mt-5 flex justify-end gap-2"><button className="rounded-lg border border-zinc-200 px-3 py-2 text-xs" onClick={onClose}>Cancelar</button><button disabled={rejection && !reason.trim()} className={`rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 ${destructive ? "bg-red-700" : "bg-emerald-950"}`} onClick={onConfirm}>{rejection ? "Rechazar" : action.kind === "delete" ? "Eliminar definitivamente" : "Confirmar"}</button></div></div></div>;
}
