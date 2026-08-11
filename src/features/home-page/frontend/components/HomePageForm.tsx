"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Save } from "lucide-react";

interface HomePageFormProps {
  initialData?: { title: string; description: string };
  onSubmit: (data: {
    title: string;
    description: string;
  }) => Promise<{ success: boolean; error?: { message: string } }>;
  submitLabel?: string;
}

const formSchema = z.object({
  title: z.string().min(1, "El título es obligatorio").max(100, "El título es demasiado largo"),
  description: z.string().min(1, "La descripción es obligatoria").max(200, "La descripción es demasiado larga"),
});

export function HomePageForm({ initialData, onSubmit, submitLabel = "Save" }: HomePageFormProps) {
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
      title: formData.get("title") as string,
      description: formData.get("description") as string,
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
        router.refresh();
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
        <label htmlFor="title" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">
          Título
        </label>
        <input
          type="text"
          id="title"
          name="title"
          defaultValue={initialData?.title}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        {fieldErrors.title && <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>}
      </div>
      <div>
        <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">
          Descripción
        </label>
        <input
          type="text"
          id="description"
          name="description"
          defaultValue={initialData?.description}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        {fieldErrors.description && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="flex flex-row items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
      >
        {loading ? "Guardando..." : <><Save size={15} /> {submitLabel}</>}
      </button>
    </form>
  );
}
