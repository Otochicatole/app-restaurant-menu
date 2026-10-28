"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Globe, Layers, Search, X } from "lucide-react";
import type {
  SuperadminLandingTemplateList,
  SuperadminLandingTemplateTab,
  SuperadminLandingTemplateView,
} from "../contracts";
import { compileLandingDocument } from "../domain/landing-compiler";
import {
  listSuperadminLandingTemplatesAction,
  moderateLandingTemplateAction,
} from "./actions";

const TABS: Array<{ id: SuperadminLandingTemplateTab; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "system", label: "Sistema" },
  { id: "published", label: "Publicadas" },
  { id: "pending", label: "Pendientes" },
  { id: "rejected", label: "Rechazadas" },
  { id: "archived", label: "Archivadas" },
];

type ActionKind = "publish" | "reject" | "archive" | "restore" | "delete";

export function LandingTemplateModerationPanel({
  initialData,
}: {
  initialData: SuperadminLandingTemplateList;
}) {
  const [tab, setTab] = useState<SuperadminLandingTemplateTab>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SuperadminLandingTemplateView | null>(
    null,
  );
  const [action, setAction] = useState<{
    template: SuperadminLandingTemplateView;
    kind: ActionKind;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(
    async (requestedPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await listSuperadminLandingTemplatesAction({
          tab,
          query: debouncedQuery,
          page: requestedPage,
          pageSize: 24,
        });
        if (!result.success) {
          throw new Error(
            result.error.message || "No se pudo cargar el catálogo de landings.",
          );
        }
        setData(result.data);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo cargar el catálogo de landings.",
        );
      } finally {
        setLoading(false);
      }
    },
    [debouncedQuery, tab],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(1);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const statusText = useMemo(
    () =>
      ({
        PENDING: "Pendiente",
        PUBLISHED: "Publicada",
        REJECTED: "Rechazada",
        ARCHIVED: "Archivada",
        DRAFT: "Borrador",
      }) as const,
    [],
  );

  const performAction = async () => {
    if (!action || (action.kind === "reject" && !reason.trim())) return;
    const current = action;
    setAction(null);
    setLoading(true);
    setError(null);

    try {
      const result = await moderateLandingTemplateAction({
        templateId: current.template.id,
        action: current.kind,
        reason: reason.trim() || undefined,
      });
      if (!result.success) {
        throw new Error(
          result.error.message || "No se pudo actualizar la plantilla.",
        );
      }
      setReason("");
      await load(page);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar la plantilla.",
      );
      setLoading(false);
    }
  };

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white shadow-sm"
      aria-labelledby="landing-template-admin-title"
    >
      <div className="flex flex-col gap-4 border-b border-zinc-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <h2 id="landing-template-admin-title" className="sr-only">
          Administración de plantillas de Landing
        </h2>
        <label className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 lg:max-w-sm focus-within:border-zinc-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-zinc-100">
          <Search size={16} className="shrink-0 text-zinc-400" />
          <input
            aria-label="Buscar plantillas de landing"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
            placeholder="Buscar por nombre o restaurante"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div
        className="flex gap-1 overflow-x-auto border-b border-zinc-100 px-3"
        role="tablist"
        aria-label="Filtrar plantillas de landing"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            className={`shrink-0 border-b-2 px-3 py-3 text-xs font-semibold transition ${
              tab === item.id
                ? "border-[#182618] text-[#182618]"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
            onClick={() => {
              setTab(item.id);
              setPage(1);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            {loading
              ? "Cargando…"
              : `${data.total} plantilla${data.total === 1 ? "" : "s"} de landing`}
          </span>
          <span>
            Página {Math.min(page, pages)} de {pages}
          </span>
        </div>

        {data.items.length === 0 && !loading ? (
          <div className="mt-5 rounded-xl border border-dashed border-zinc-200 px-4 py-12 text-center text-sm text-zinc-500">
            No hay plantillas de landing para este filtro.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((template) => (
              <LandingTemplateCard
                key={template.id}
                template={template}
                statusText={statusText[template.status]}
                onPreview={() => setPreview(template)}
                onAction={(kind) => {
                  setReason("");
                  setAction({ template, kind });
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            aria-label="Página anterior"
            disabled={page <= 1 || loading}
            className="rounded-lg border border-zinc-200 p-2 disabled:opacity-40"
            onClick={() => {
              const next = page - 1;
              setPage(next);
              void load(next);
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Página siguiente"
            disabled={page >= pages || loading}
            className="rounded-lg border border-zinc-200 p-2 disabled:opacity-40"
            onClick={() => {
              const next = page + 1;
              setPage(next);
              void load(next);
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {preview && (
        <LandingPreviewModal
          template={preview}
          onClose={() => setPreview(null)}
        />
      )}

      {action && (
        <LandingActionModal
          action={action}
          reason={reason}
          onReasonChange={setReason}
          onClose={() => setAction(null)}
          onConfirm={() => void performAction()}
        />
      )}
    </section>
  );
}

function LandingTemplateCard({
  template,
  statusText,
  onPreview,
  onAction,
}: {
  template: SuperadminLandingTemplateView;
  statusText: string;
  onPreview: () => void;
  onAction: (action: ActionKind) => void;
}) {
  const system = template.isSystem;
  const theme = template.document.theme;
  const blockCount = template.document.blocks.filter((b) => b.visible).length;

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-xs">
      <button
        type="button"
        className="block w-full text-left"
        onClick={onPreview}
        aria-label={`Previsualizar ${template.name}`}
      >
        <div
          className="relative flex h-36 flex-col justify-between overflow-hidden border-b border-zinc-100 p-4"
          style={{
            backgroundColor: theme.bgColor,
            color: theme.textColor,
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: theme.cardBgColor,
                color: theme.primaryColor,
                border: `1px solid ${theme.borderColor}`,
              }}
            >
              <Globe size={11} />
              Landing Web
            </span>
            <div className="flex items-center gap-1">
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: theme.primaryColor }}
                title="Color primario"
              />
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/10"
                style={{ backgroundColor: theme.accentColor }}
                title="Color acento"
              />
            </div>
          </div>

          <div>
            <p
              className="truncate text-base font-bold"
              style={{ color: theme.primaryColor }}
            >
              {template.name}
            </p>
            <p
              className="mt-0.5 flex items-center gap-1.5 text-[11px]"
              style={{ color: theme.mutedTextColor }}
            >
              <Layers size={11} />
              {blockCount} {blockCount === 1 ? "módulo activo" : "módulos activos"}
            </p>
          </div>
        </div>
      </button>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">
            {template.name}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${
              system
                ? "bg-amber-50 text-amber-800"
                : template.status === "PUBLISHED"
                ? "bg-[#253621]/10 text-[#253621]"
                : template.status === "PENDING"
                ? "bg-blue-50 text-blue-800"
                : template.status === "REJECTED"
                ? "bg-red-50 text-red-800"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {system ? "Sistema" : statusText}
          </span>
        </div>

        <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
          {template.description || "Sin descripción"}
        </p>

        {template.owner && (
          <p className="mt-3 text-xs text-zinc-600">
            Restaurante: <strong>{template.owner.name}</strong>{" "}
            <span className="text-zinc-400">/{template.owner.slug}</span>
          </p>
        )}

        {template.rejectionReason && (
          <p className="mt-3 rounded-lg bg-red-50 px-2.5 py-2 text-xs leading-4 text-red-800">
            Motivo: {template.rejectionReason}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!system && template.status === "PENDING" && (
            <>
              <button
                type="button"
                className="rounded-lg bg-[#182618] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#101c10] active:scale-[0.99]"
                onClick={() => onAction("publish")}
              >
                Publicar
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                onClick={() => onAction("reject")}
              >
                Rechazar
              </button>
            </>
          )}
          {!system && template.status === "PUBLISHED" && (
            <button
              type="button"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              onClick={() => onAction("archive")}
            >
              Archivar
            </button>
          )}
          {!system && template.status === "ARCHIVED" && (
            <button
              type="button"
              className="rounded-lg bg-[#182618] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#101c10] active:scale-[0.99]"
              onClick={() => onAction("restore")}
            >
              Restaurar
            </button>
          )}
          {!system && (
            <button
              type="button"
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
              onClick={() => onAction("delete")}
            >
              Eliminar
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
            onClick={onPreview}
          >
            Ver diseño
          </button>
        </div>
      </div>
    </article>
  );
}

function LandingPreviewModal({
  template,
  onClose,
}: {
  template: SuperadminLandingTemplateView;
  onClose: () => void;
}) {
  const compiledHtml = useMemo(
    () =>
      compileLandingDocument({
        htmlContent: template.htmlContent,
        cssContent: template.cssContent,
        jsContent: template.jsContent,
        title: template.name,
      }),
    [template],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-template-preview-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2
              id="landing-template-preview-title"
              className="text-base font-semibold text-zinc-900"
            >
              {template.name}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Previsualización interactiva de plantilla de Landing
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
            onClick={onClose}
            aria-label="Cerrar previsualización"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-zinc-100 p-4">
          <iframe
            title={`Vista previa ${template.name}`}
            srcDoc={compiledHtml}
            className="h-full w-full rounded-xl border border-zinc-200 bg-white shadow-sm"
            sandbox="allow-scripts allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
}

function LandingActionModal({
  action,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  action: { template: SuperadminLandingTemplateView; kind: ActionKind };
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const rejection = action.kind === "reject";
  const labels = {
    publish: "Publicar plantilla de landing",
    reject: "Rechazar plantilla de landing",
    archive: "Archivar plantilla de landing",
    restore: "Restaurar plantilla de landing",
    delete: "Eliminar plantilla de landing",
  } as const;
  const destructive = action.kind === "delete" || rejection;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-template-action-title"
      >
        <h2
          id="landing-template-action-title"
          className="text-base font-semibold text-zinc-900"
        >
          {labels[action.kind]}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {rejection
            ? `Indicá por qué “${action.template.name}” no puede publicarse.`
            : action.kind === "delete"
            ? `Se eliminará definitivamente “${action.template.name}”.`
            : `¿Querés ${
                action.kind === "publish"
                  ? "publicar"
                  : action.kind === "archive"
                  ? "archivar"
                  : "restaurar"
              } “${action.template.name}”?`}
        </p>
        {rejection && (
          <textarea
            autoFocus
            maxLength={500}
            className="mt-4 min-h-24 w-full rounded-xl border border-zinc-300 p-3 text-sm outline-none transition focus:border-[#253621] focus:ring-4 focus:ring-[#253621]/15"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Motivo del rechazo"
          />
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-xs hover:bg-zinc-50"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={rejection && !reason.trim()}
            className={`rounded-lg px-3 py-2 text-xs font-semibold text-white transition active:scale-[0.99] disabled:opacity-40 ${
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#182618] hover:bg-[#101c10]"
            }`}
            onClick={onConfirm}
          >
            {rejection
              ? "Rechazar"
              : action.kind === "delete"
              ? "Eliminar definitivamente"
              : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
