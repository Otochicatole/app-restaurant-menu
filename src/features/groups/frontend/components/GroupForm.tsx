"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Save, X } from "lucide-react";

interface GroupFormProps {
  initialData?: { name: string; description: string };
  onSubmit: (data: {
    name: string;
    description: string;
  }) => Promise<GroupFormActionResult>;
  submitLabel?: string;
  redirectTo?: string;
  onSuccess?: (result: GroupFormActionResult) => void;
  onCancel?: () => void;
}

export interface GroupFormActionResult {
  success: boolean;
  data?: unknown;
  error?: { message: string };
}

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100, "El nombre es demasiado largo"),
  description: z.string().max(500, "La descripción es demasiado larga").default(""),
});

export function GroupForm({ initialData, onSubmit, submitLabel = "Guardar", redirectTo = "/admin/catalog", onSuccess, onCancel }: GroupFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || "",
    };

    const parsed = formSchema.safeParse(data);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit(parsed.data);
      if (result.success) {
        if (onSuccess) {
          onSuccess(result);
        } else {
          router.push(redirectTo);
          router.refresh();
        }
      } else {
        setError(result.error?.message ?? "No se pudo guardar");
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
        <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">
          Nombre
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={initialData?.name}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
      </div>
      <div>
        <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initialData?.description}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        {fieldErrors.description && <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex flex-row items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
        >
          {loading ? "Guardando..." : <><Save size={15} /> {submitLabel}</>}
        </button>
        <button
          type="button"
          onClick={() => (onCancel ? onCancel() : router.back())}
          className="flex flex-row items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <X size={15} /> Cancelar
        </button>
      </div>
    </form>
  );
}
