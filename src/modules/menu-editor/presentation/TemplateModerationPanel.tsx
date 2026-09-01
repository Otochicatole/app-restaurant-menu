"use client";

import { useState } from "react";
import type { MenuTemplateView } from "../contracts";

export function TemplateModerationPanel({ initialTemplates }: { initialTemplates: MenuTemplateView[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<MenuTemplateView | null>(null);
  const [reason, setReason] = useState("");
  const moderate = async (template: MenuTemplateView, action: "publish" | "reject" | "archive") => {
    if (action === "reject") { setReason(""); setRejecting(template); return; }
    await performModeration(template, action);
  };
  const performModeration = async (template: MenuTemplateView, action: "publish" | "reject" | "archive", rejectionReason?: string) => {
    setBusy(template.id);
    const response = await fetch(`/api/superadmin/templates/${encodeURIComponent(template.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason: rejectionReason }) });
    const payload = await response.json();
    if (response.ok && payload.success) setTemplates((items) => items.filter((item) => item.id !== template.id));
    setBusy(null);
  };
  return <><section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Comunidad</p><h2 className="mt-1 text-xl font-semibold">Plantillas pendientes de revisión</h2></div>{templates.length === 0 ? <p className="text-sm text-zinc-500">No hay envíos pendientes.</p> : <div className="grid gap-3 md:grid-cols-2">{templates.map((template) => <article key={template.id} className="rounded-xl border border-zinc-200 p-3"><div className="h-32 overflow-hidden rounded-lg" style={{ background: template.document.background }}><div className="p-3 text-xs">{template.document.nodes.filter((node) => node.type === "text").slice(0, 5).map((node) => <p key={node.id} style={{ color: node.fill, fontSize: Math.max(8, node.fontSize / 4) }}>{node.text}</p>)}</div></div><h3 className="mt-3 text-sm font-semibold">{template.name}</h3><p className="mt-1 text-xs text-zinc-500">{template.description}</p><div className="mt-3 flex gap-2"><button disabled={busy === template.id} onClick={() => moderate(template, "publish")} className="rounded-lg bg-emerald-950 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Publicar</button><button disabled={busy === template.id} onClick={() => moderate(template, "reject")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Rechazar</button><button disabled={busy === template.id} onClick={() => moderate(template, "archive")} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs disabled:opacity-50">Archivar</button></div></article>)}</div>}</section>{rejecting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="reject-template-title"><h2 id="reject-template-title" className="text-base font-semibold">Rechazar plantilla</h2><p className="mt-2 text-sm text-zinc-600">Indica un motivo para que el restaurante pueda corregir el envío.</p><textarea autoFocus className="mt-4 min-h-24 w-full rounded-lg border border-zinc-200 p-3 text-sm" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo del rechazo" /><div className="mt-4 flex justify-end gap-2"><button className="rounded-lg border border-zinc-200 px-3 py-2 text-xs" onClick={() => setRejecting(null)}>Cancelar</button><button disabled={!reason.trim() || busy === rejecting.id} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40" onClick={async () => { const template = rejecting; setRejecting(null); await performModeration(template, "reject", reason); }}>Rechazar</button></div></div></div>}</>;
}
