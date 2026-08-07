"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

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
  }) => Promise<{ success: boolean; error?: { message: string } }>;
  submitLabel?: string;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().default(""),
  price: z.string().min(1, "Price is required"),
  groupId: z.string().min(1, "Group is required"),
});

export function ProductForm({ groups, initialData, onSubmit, submitLabel = "Save" }: ProductFormProps) {
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
        router.push("/admin/products");
        router.refresh();
      } else {
        setServerError(result.error?.message ?? "Failed to save");
      }
    } catch {
      setServerError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          defaultValue={initialData?.name}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-zinc-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initialData?.description}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
      </div>
      <div>
        <label htmlFor="price" className="block text-sm font-medium text-zinc-700">
          Price
        </label>
        <input
          type="number"
          step="0.01"
          id="price"
          name="price"
          defaultValue={initialData?.price}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price}</p>}
      </div>
      <div>
        <label htmlFor="groupId" className="block text-sm font-medium text-zinc-700">
          Group
        </label>
        <select
          id="groupId"
          name="groupId"
          defaultValue={initialData?.groupId}
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="">Select a group</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        {errors.groupId && <p className="mt-1 text-xs text-red-600">{errors.groupId}</p>}
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
