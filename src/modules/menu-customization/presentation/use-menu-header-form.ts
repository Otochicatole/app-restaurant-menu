"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/platform/application/action-result";
import { updateMenuHeaderSchema, type UpdateMenuHeaderCommand } from "../contracts";

export type MenuHeaderSubmitAction = (
  data: UpdateMenuHeaderCommand,
) => Promise<ActionResult>;

type HeaderField = keyof UpdateMenuHeaderCommand;

export function useMenuHeaderForm(onSubmit: MenuHeaderSubmitAction) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<HeaderField, string>>>({});
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = updateMenuHeaderSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
    });

    if (!parsed.success) {
      const errors: Partial<Record<HeaderField, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "title" || field === "description") {
          errors[field] ??= issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const result = await onSubmit(parsed.data);
      if (!result.success) {
        setError(result.error?.message ?? "No se pudieron guardar los cambios");
        return;
      }
      setSuccessMessage("Cambios guardados.");
      router.refresh();
    } catch {
      setError("No pudimos comunicarnos con el servidor. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setSaving(false);
    }
  }, [onSubmit, router]);

  return { error, successMessage, fieldErrors, saving, handleSubmit };
}
