"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Save, Trash2, Upload, X } from "lucide-react";

interface ProductFormProps {
  groups: { id: string; name: string }[];
  initialData?: {
    name: string;
    description: string;
    price: number;
    groupId: string;
    mediaUrl?: string | null;
    mediaType?: "image" | "video" | null;
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const setPreview = (url: string | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  };

  const hasExistingMedia = Boolean(initialData?.mediaUrl);
  const showExistingPreview = hasExistingMedia && !removeMedia && !selectedFile;
  const showNewPreview = Boolean(selectedFile && !removeMedia);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setRemoveMedia(false);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleRemoveMedia = () => {
    setSelectedFile(null);
    setRemoveMedia(true);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const syncMedia = async (productId: string) => {
    if (removeMedia) {
      const response = await fetch(`/api/products/${productId}/media`, { method: "DELETE" });
      if (!response.ok) throw new Error("No se pudo quitar el archivo");
      return;
    }
    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const response = await fetch(`/api/products/${productId}/media`, { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? "No se pudo subir el archivo");
      }
    }
  };

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

      if (!result.success) {
        setServerError(result.error?.message ?? "No se pudo guardar");
        return;
      }

      const product = result.data as { id: string } | undefined;
      if (product?.id) {
        try {
          await syncMedia(product.id);
        } catch (error) {
          setServerError(error instanceof Error ? error.message : "No se pudo subir el archivo");
          return;
        }
      }

      if (onSuccess) {
        onSuccess(result);
      } else {
        router.push(redirectTo);
        router.refresh();
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
      <div>
        <span className="block text-xs font-bold uppercase tracking-wide text-zinc-500">
          Foto o video
        </span>
        <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          {showExistingPreview && initialData?.mediaType === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={initialData.mediaUrl ?? undefined} alt="Vista previa" className="mb-3 max-h-40 rounded-lg object-contain" />
          )}
          {showExistingPreview && initialData?.mediaType === "video" && (
            <video src={initialData.mediaUrl ?? undefined} className="mb-3 max-h-40 w-full rounded-lg" controls playsInline />
          )}
          {showNewPreview && selectedFile?.type.startsWith("image/") && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl ?? undefined} alt="Vista previa" className="mb-3 max-h-40 rounded-lg object-contain" />
          )}
          {showNewPreview && selectedFile?.type.startsWith("video/") && (
            <video src={previewUrl ?? undefined} className="mb-3 max-h-40 w-full rounded-lg" controls playsInline />
          )}
          {showExistingPreview && (
            <button type="button" onClick={handleRemoveMedia} className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
              <Trash2 size={14} /> Quitar archivo
            </button>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50">
              <Upload size={14} /> {hasExistingMedia ? "Reemplazar archivo" : "Subir archivo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile && <span className="truncate text-xs text-zinc-500">{selectedFile.name}</span>}
          </div>
          <p className="mt-2 text-xs text-zinc-400">JPG, PNG, WEBP, GIF (hasta 5MB) o MP4, WEBM (hasta 50MB).</p>
        </div>
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
