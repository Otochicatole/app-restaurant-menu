"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check, Plus, Trash2, UtensilsCrossed, X } from "lucide-react";
import type { MenuProjectSummary } from "../contracts";
import type { MenuActionResult } from "./menu-actions";

type Props = {
  menus: MenuProjectSummary[];
  multiMenuEnabled: boolean;
  maxMenus: number;
  canCreateMenu: boolean;
  activeMenuId: string | null;
  accountLabel: string;
  selectMenu: (formData: FormData) => Promise<MenuActionResult>;
  createMenu: (formData: FormData) => Promise<MenuActionResult>;
  deleteMenus: (formData: FormData) => Promise<MenuActionResult>;
};

type ConfirmState =
  | { kind: "selected"; ids: string[] }
  | { kind: "all" }
  | null;

const fieldClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100";

export function MenuPickerScreen({
  menus,
  multiMenuEnabled,
  maxMenus,
  canCreateMenu,
  activeMenuId,
  accountLabel,
  selectMenu,
  createMenu,
  deleteMenus,
}: Props) {
  const [notice, setNotice] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [managing, setManaging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const run = (
    action: (formData: FormData) => Promise<MenuActionResult>,
    formData: FormData,
    projectId?: string,
  ) => {
    startTransition(async () => {
      setNotice(null);
      setPendingId(projectId ?? "create");
      const result = await action(formData);
      setPendingId(null);
      if (!result.success) setNotice({ tone: "error", message: result.error.message });
      else if (result.data?.deletedCount != null) {
        setNotice({
          tone: "success",
          message:
            result.data.deletedCount === 1
              ? "Menú eliminado."
              : `${result.data.deletedCount} menús eliminados.`,
        });
        setSelected(new Set());
        setConfirm(null);
        setManaging(false);
      }
    });
  };

  const toggleSelected = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(menus.map((menu) => menu.id)));
  const clearSelection = () => setSelected(new Set());

  const usageRatio = maxMenus > 0 ? Math.min(1, menus.length / maxMenus) : 0;
  const selectedCount = selected.size;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#fafafa] text-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(24,24,27,0.06),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(24,24,27,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,24,27,0.03)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-5 pb-16 pt-12 sm:px-8 sm:pt-16">
        <header className="animate-[menuPickerIn_0.45s_ease-out_both]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500 shadow-sm backdrop-blur">
              <UtensilsCrossed size={13} strokeWidth={2.25} />
              Tus menús
            </div>
            <button
              type="button"
              onClick={() => {
                setManaging((open) => !open);
                setSelected(new Set());
                setShowCreate(false);
                setConfirm(null);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                managing
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
              }`}
            >
              {managing ? "Listo" : "Administrar"}
            </button>
          </div>
          <h1 className="mt-6 text-[2.15rem] font-semibold leading-[1.1] tracking-tight text-zinc-950 sm:text-5xl">
            Hola, {accountLabel}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500 sm:text-[15px]">
            {managing
              ? "Marcá los menús que quieras eliminar, o borrá todos de una vez."
              : "Elegí con qué carta querés trabajar. Podés volver acá cuando quieras desde la navegación."}
          </p>

          {multiMenuEnabled && (
            <div className="mt-6 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200/80">
                <div
                  className="h-full rounded-full bg-zinc-900 transition-[width] duration-500 ease-out"
                  style={{ width: `${usageRatio * 100}%` }}
                />
              </div>
              <p className="shrink-0 text-xs font-medium tabular-nums text-zinc-500">
                {menus.length}/{maxMenus}
              </p>
            </div>
          )}
        </header>

        {notice && (
          <div
            role="alert"
            className={`mt-6 animate-[menuPickerIn_0.3s_ease-out_both] rounded-2xl border px-4 py-3 text-sm ${
              notice.tone === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-zinc-200 bg-white text-zinc-700"
            }`}
          >
            {notice.message}
          </div>
        )}

        {managing && (
          <div className="mt-6 flex flex-wrap items-center gap-2 animate-[menuPickerIn_0.3s_ease-out_both]">
            <button
              type="button"
              onClick={selectedCount === menus.length ? clearSelection : selectAll}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              {selectedCount === menus.length ? "Quitar selección" : "Seleccionar todos"}
            </button>
            <button
              type="button"
              disabled={pending || selectedCount === 0}
              onClick={() => setConfirm({ kind: "selected", ids: [...selected] })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 size={13} />
              Eliminar seleccionados ({selectedCount})
            </button>
            <button
              type="button"
              disabled={pending || menus.length === 0}
              onClick={() => setConfirm({ kind: "all" })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
            >
              <Trash2 size={13} />
              Eliminar todos
            </button>
          </div>
        )}

        <section className="mt-8 flex-1">
          <ul className="overflow-hidden rounded-[1.35rem] border border-zinc-200/90 bg-white shadow-[0_24px_60px_-36px_rgba(24,24,27,0.35)]">
            {menus.map((menu, index) => {
              const active = menu.id === activeMenuId;
              const busy = pending && pendingId === menu.id;
              const isChecked = selected.has(menu.id);

              if (managing) {
                return (
                  <li
                    key={menu.id}
                    className="animate-[menuPickerIn_0.45s_ease-out_both] border-b border-zinc-100 last:border-b-0"
                    style={{ animationDelay: `${80 + index * 45}ms` }}
                  >
                    <div
                      className={`flex w-full items-center gap-4 px-4 py-4 sm:gap-5 sm:px-5 sm:py-5 ${
                        isChecked ? "bg-red-50/70" : "bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => toggleSelected(menu.id)}
                        className="flex min-w-0 flex-1 items-center gap-4 text-left transition disabled:opacity-60 sm:gap-5"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm ${
                            isChecked
                              ? "border-red-600 bg-red-600 text-white"
                              : "border-zinc-200 bg-zinc-50 text-zinc-400"
                          }`}
                        >
                          {isChecked ? <Check size={16} strokeWidth={2.5} /> : null}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[15px] font-semibold tracking-tight text-zinc-950 sm:text-base">
                              {menu.name}
                            </p>
                            {menu.isPrimary && (
                              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                Principal
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate font-mono text-xs text-zinc-400">/m/{menu.slug}</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirm({ kind: "selected", ids: [menu.id] })}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        aria-label={`Eliminar ${menu.name}`}
                      >
                        <Trash2 size={14} />
                        Quitar
                      </button>
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={menu.id}
                  className="animate-[menuPickerIn_0.45s_ease-out_both] border-b border-zinc-100 last:border-b-0"
                  style={{ animationDelay: `${80 + index * 45}ms` }}
                >
                  <form action={(formData) => run(selectMenu, formData, menu.id)}>
                    <input type="hidden" name="projectId" value={menu.id} />
                    <button
                      type="submit"
                      disabled={pending}
                      className={`group flex w-full items-center gap-4 px-4 py-4 text-left transition duration-200 disabled:opacity-60 sm:gap-5 sm:px-5 sm:py-5 ${
                        active ? "bg-zinc-950 text-white" : "bg-white hover:bg-zinc-50"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold tabular-nums ${
                          active ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`truncate text-[15px] font-semibold tracking-tight sm:text-base ${
                              active ? "text-white" : "text-zinc-950"
                            }`}
                          >
                            {menu.name}
                          </p>
                          {menu.isPrimary && (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                active ? "bg-white/15 text-zinc-200" : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              Principal
                            </span>
                          )}
                          {active && (
                            <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-900">
                              En uso
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate font-mono text-xs text-zinc-400">
                          /m/{menu.slug}
                          {menu.publicDescription ? ` · ${menu.publicDescription}` : ""}
                        </p>
                      </div>

                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold transition duration-200 ${
                          active ? "text-white" : "text-zinc-900"
                        }`}
                      >
                        <span className="hidden sm:inline">
                          {busy ? "Abriendo…" : active ? "Continuar" : "Abrir"}
                        </span>
                        <ArrowRight
                          size={16}
                          className={`transition duration-200 ${
                            busy ? "animate-pulse" : "group-hover:translate-x-0.5"
                          } ${active ? "text-zinc-300" : "text-zinc-400 group-hover:text-zinc-900"}`}
                        />
                      </span>
                    </button>
                  </form>
                </li>
              );
            })}

            {!managing && multiMenuEnabled && canCreateMenu && (
              <li
                className="animate-[menuPickerIn_0.45s_ease-out_both]"
                style={{ animationDelay: `${80 + menus.length * 45}ms` }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreate((open) => !open)}
                  className="flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-zinc-50 sm:gap-5 sm:px-5 sm:py-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500">
                    <Plus size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold tracking-tight text-zinc-950 sm:text-base">
                      {showCreate ? "Cancelar" : "Agregar menú"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">Nuevo lienzo con su propio slug público</p>
                  </div>
                </button>
              </li>
            )}
          </ul>

          {showCreate && !managing && multiMenuEnabled && canCreateMenu && (
            <form
              action={(formData) => run(createMenu, formData)}
              className="mt-3 animate-[menuPickerIn_0.3s_ease-out_both] grid gap-3 rounded-[1.35rem] border border-zinc-200/90 bg-white p-5 shadow-[0_24px_60px_-36px_rgba(24,24,27,0.25)] sm:grid-cols-2"
            >
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
                Nombre
                <input name="name" required maxLength={100} placeholder="Carta de verano" className={fieldClass} />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-600">
                Slug público
                <input
                  name="slug"
                  required
                  minLength={3}
                  maxLength={50}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  placeholder="carta-verano"
                  className={fieldClass}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-600 sm:col-span-2">
                Descripción
                <input
                  name="publicDescription"
                  maxLength={500}
                  defaultValue="Menú digital"
                  className={fieldClass}
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  {pending && pendingId === "create" ? "Creando…" : "Crear y abrir"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          )}

          {multiMenuEnabled && !canCreateMenu && (
            <p className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-600">
              Alcanzaste el cupo de {maxMenus} menús. Pedile al administrador de la plataforma que aumente el límite si necesitás más.
            </p>
          )}
        </section>
      </div>

      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) setConfirm(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-menus-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="delete-menus-title" className="text-base font-semibold text-zinc-900">
                {confirm.kind === "all" ? "Eliminar todos los menús" : "Eliminar menús"}
              </h2>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirm(null)}
                className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {confirm.kind === "all"
                ? "Se eliminarán todos los menús de esta cuenta. Si no queda ninguno, se creará uno vacío al volver a entrar."
                : confirm.ids.length === 1
                  ? `Se eliminará “${menus.find((menu) => menu.id === confirm.ids[0])?.name ?? "este menú"}” de forma definitiva.`
                  : `Se eliminarán ${confirm.ids.length} menús de forma definitiva.`}{" "}
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirm(null)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const formData = new FormData();
                  if (confirm.kind === "all") {
                    formData.set("scope", "all");
                  } else {
                    formData.set("scope", "selected");
                    for (const id of confirm.ids) formData.append("projectId", id);
                  }
                  run(deleteMenus, formData, "delete");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 size={15} />
                {pending && pendingId === "delete" ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes menuPickerIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
