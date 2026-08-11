"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { Save, X } from "lucide-react";

interface ProductFormProps {
  groups: { id: string; name: string }[];
  initialData?: {
    name: string;
    description: string;
    price: number;
    groupId: string;
  };
  onSubmit: (data: {
    name: string;
    description: string;
    price: number;
    groupId: string;
  }) => Promise<FormActionResult>;
  submitLabel?: string;
  redirectTo?: string;
  onSuccess?: (result: FormActionResult) => void;
  onCancel?: () => void;
}

export interface FormActionResult {
  success: boolean;
  data?: unknown;
  error?: { message: string };
}

const formSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(100, "El nombre es demasiado largo"),
  description: z.string().default(""),
  price: z.string().min(1, "El precio es obligatorio"),
  groupId: z.string().min(1, "El grupo es obligatorio"),
}).refine((value) => Number.isFinite(Number(value.price)) && Number(value.price) >= 0, {
  path: ["price"],
  message: "Ingresá un precio válido",
});

export function ProductForm({ groups, initialData, onSubmit, submitLabel = "Guardar", redirectTo = "/admin/catalog", onSuccess, onCancel }: ProductFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || "",
      price: formData.get("price") as string,
      groupId: formData.get("groupId") as string,
    };

    const parsed = formSchema.safeParse(data);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit({
        name: parsed.data.name,
        description: parsed.data.description,
        price: parseFloat(parsed.data.price),
        groupId: parsed.data.groupId,
      });

      if (result.success) {
        if (onSuccess) {
          onSuccess(result);
        } else {
          router.push(redirectTo);
          router.refresh();
        }
      } else {
        setServerError(result.error?.message ?? "No se pudo guardar");
      }
    } catch {
      setServerError("Ocurrió un error inesperado");
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
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
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
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
      </div>
      <div>
        <label htmlFor="price" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">
          Precio
        </label>
        <input
          type="number"
          step="0.01"
          id="price"
          name="price"
          defaultValue={initialData?.price}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        />
        {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
      </div>
      <div>
        <label htmlFor="groupId" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">
          Grupo
        </label>
        <select
          id="groupId"
          name="groupId"
          defaultValue={initialData?.groupId}
          className="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100"
        >
          <option value="">Seleccioná un grupo</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        {errors.groupId && <p className="mt-1 text-xs text-red-600">{errors.groupId}</p>}
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
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
