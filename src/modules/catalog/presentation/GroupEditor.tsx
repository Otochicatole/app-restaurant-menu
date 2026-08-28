"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, X } from "lucide-react";
import { groupInputSchema, type CatalogActionResult, type GroupInput, type GroupView } from "../contracts";

export interface GroupEditorProps {
  initialData?: GroupInput;
  onSubmit: (input: GroupInput) => Promise<CatalogActionResult<GroupView>>;
  submitLabel?: string;
  redirectTo?: string;
  onSuccess?: (group: GroupView) => void;
  onCancel?: () => void;
}

export function GroupEditor({
  initialData,
  onSubmit,
  submitLabel = "Guardar",
  redirectTo = "/admin/catalog",
  onSuccess,
  onCancel,
}: GroupEditorProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    const parsed = groupInputSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
    });
    if (!parsed.success) {
      setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit(parsed.data);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      if (onSuccess) onSuccess(result.data);
      else {
        router.push(redirectTo);
        router.refresh();
      }
    } catch {
      setError("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="group-name" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Nombre</label>
        <input
          id="group-name"
          name="name"
          type="text"
          defaultValue={initialData?.name}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
      </div>
      <div>
        <label htmlFor="group-description" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Descripción</label>
        <textarea
          id="group-description"
          name="description"
          rows={3}
          defaultValue={initialData?.description}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        {fieldErrors.description && <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>}
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-4">
        <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50">
          {loading ? "Guardando..." : <><Save size={15} /> {submitLabel}</>}
        </button>
        <button type="button" onClick={() => (onCancel ? onCancel() : router.back())} className="flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
          <X size={15} /> Cancelar
        </button>
      </div>
    </form>
  );
}

