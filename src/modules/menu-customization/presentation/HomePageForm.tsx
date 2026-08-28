"use client";

import { Save } from "lucide-react";
import { useMenuHeaderForm, type MenuHeaderSubmitAction } from "./use-menu-header-form";

export type HomePageFormProps = {
  initialData?: { title: string; description: string };
  onSubmit: MenuHeaderSubmitAction;
  submitLabel?: string;
};

export function HomePageForm({ initialData, onSubmit, submitLabel = "Guardar" }: HomePageFormProps) {
  const controller = useMenuHeaderForm(onSubmit);

  return (
    <form onSubmit={controller.handleSubmit} className="space-y-5" aria-busy={controller.saving} noValidate>
      <div>
        <label htmlFor="menu-title" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Título</label>
        <input
          type="text"
          id="menu-title"
          name="title"
          required
          maxLength={100}
          defaultValue={initialData?.title}
          aria-invalid={Boolean(controller.fieldErrors.title)}
          aria-describedby={controller.fieldErrors.title ? "menu-title-error" : undefined}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        {controller.fieldErrors.title && <p id="menu-title-error" role="alert" className="mt-1 text-xs text-red-600">{controller.fieldErrors.title}</p>}
      </div>
      <div>
        <label htmlFor="menu-description" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Descripción</label>
        <input
          type="text"
          id="menu-description"
          name="description"
          maxLength={500}
          defaultValue={initialData?.description}
          aria-invalid={Boolean(controller.fieldErrors.description)}
          aria-describedby={controller.fieldErrors.description ? "menu-description-error" : undefined}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        {controller.fieldErrors.description && <p id="menu-description-error" role="alert" className="mt-1 text-xs text-red-600">{controller.fieldErrors.description}</p>}
      </div>
      <div aria-live="polite" className="min-h-5">
        {controller.error && <p role="alert" className="text-sm text-red-600">{controller.error}</p>}
        {controller.successMessage && <p role="status" className="text-sm text-emerald-700">{controller.successMessage}</p>}
      </div>
      <button
        type="submit"
        disabled={controller.saving}
        className="flex flex-row items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {controller.saving ? "Guardando..." : <><Save size={15} /> {submitLabel}</>}
      </button>
    </form>
  );
}

