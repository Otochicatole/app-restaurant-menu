"use client";

import { useRouter } from "next/navigation";
import { Save, Trash2, Upload, X } from "lucide-react";
import { productEditorInputSchema, type ProductInput, type ProductView } from "../contracts";
import { useProductEditorController, type ProductEditorMutations } from "./use-product-editor";

export interface ProductEditorProps extends ProductEditorMutations {
  groups: { id: string; name: string }[];
  product?: ProductView;
  defaultGroupId?: string;
  submitLabel?: string;
  redirectTo?: string;
  onSuccess?: (product: ProductView) => void;
  onCancel?: () => void;
}

export function ProductEditor({
  groups,
  product,
  defaultGroupId,
  createProduct,
  updateProduct,
  submitLabel = "Guardar",
  redirectTo = "/admin/catalog",
  onSuccess,
  onCancel,
}: ProductEditorProps) {
  const router = useRouter();
  const {
    chooseFile,
    fieldErrors,
    fileInputRef,
    loading,
    markMediaForRemoval,
    previewUrl,
    removeMedia,
    save,
    selectedFile,
    serverError,
    setFieldErrors,
  } = useProductEditorController({
    product,
    createProduct,
    updateProduct,
    onSuccess: (savedProduct) => {
      if (onSuccess) onSuccess(savedProduct);
      else {
        router.push(redirectTo);
        router.refresh();
      }
    },
  });

  const hasExistingMedia = Boolean(product?.mediaUrl);
  const showExistingPreview = hasExistingMedia && !removeMedia && !selectedFile;
  const showNewPreview = Boolean(selectedFile && !removeMedia);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    const parsed = productEditorInputSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") ?? "",
      price: formData.get("price"),
      groupId: formData.get("groupId"),
    });
    if (!parsed.success) {
      setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    const input: ProductInput = parsed.data;
    await save(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="product-name" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Nombre</label>
        <input id="product-name" name="name" type="text" defaultValue={product?.name ?? ""} className={inputClassName} />
        {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
      </div>
      <div>
        <label htmlFor="product-description" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Descripción</label>
        <textarea id="product-description" name="description" rows={3} defaultValue={product?.description ?? ""} className={inputClassName} />
        {fieldErrors.description && <FieldError>{fieldErrors.description}</FieldError>}
      </div>
      <div>
        <label htmlFor="product-price" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Precio</label>
        <input id="product-price" name="price" type="number" min="0" step="0.01" defaultValue={product?.price ?? 0} className={inputClassName} />
        {fieldErrors.price && <FieldError>{fieldErrors.price}</FieldError>}
      </div>
      <div>
        <label htmlFor="product-group" className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Grupo</label>
        <select id="product-group" name="groupId" defaultValue={product?.groupId ?? defaultGroupId ?? ""} className={inputClassName}>
          <option value="">Seleccioná un grupo</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
        {fieldErrors.groupId && <FieldError>{fieldErrors.groupId}</FieldError>}
      </div>
      <div>
        <span className="block text-xs font-bold uppercase tracking-wide text-zinc-500">Foto o video</span>
        <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          {showExistingPreview && product?.mediaType === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.mediaUrl ?? undefined} alt="Vista previa" className="mb-3 max-h-40 rounded-lg object-contain" />
          )}
          {showExistingPreview && product?.mediaType === "video" && <video src={product.mediaUrl ?? undefined} className="mb-3 max-h-40 w-full rounded-lg" controls playsInline />}
          {showNewPreview && selectedFile?.type.startsWith("image/") && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl ?? undefined} alt="Vista previa" className="mb-3 max-h-40 rounded-lg object-contain" />
          )}
          {showNewPreview && selectedFile?.type.startsWith("video/") && <video src={previewUrl ?? undefined} className="mb-3 max-h-40 w-full rounded-lg" controls playsInline />}
          {showExistingPreview && (
            <button type="button" onClick={markMediaForRemoval} className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
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
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              className="hidden"
            />
            {selectedFile && <span className="truncate text-xs text-zinc-500">{selectedFile.name}</span>}
          </div>
          <p className="mt-2 text-xs text-zinc-400">JPG, PNG, WEBP, GIF (hasta 5MB) o MP4, WEBM (hasta 50MB).</p>
        </div>
      </div>
      {serverError && <p className="text-sm text-red-600" role="alert">{serverError}</p>}
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

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-red-600">{children}</p>;
}

const inputClassName = "mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-100";
