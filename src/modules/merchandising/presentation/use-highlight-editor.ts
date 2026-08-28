"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/platform/application/action-result";
import { replaceHighlightsSchema, type ReplaceHighlightsCommand } from "../contracts";

export type HighlightProductOption = {
  id: string;
  name: string;
  groupName: string;
  price: number;
};

export type HighlightEditorProps = {
  products: HighlightProductOption[];
  featured: (string | null)[];
  onSave: (featured: (string | null)[]) => Promise<ActionResult>;
};

function toSlots(featured: (string | null)[]): ReplaceHighlightsCommand["productIds"] {
  return [featured[0] ?? null, featured[1] ?? null, featured[2] ?? null];
}

export function useHighlightEditor({ featured, onSave }: Pick<HighlightEditorProps, "featured" | "onSave">) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReplaceHighlightsCommand["productIds"]>(() => toSlots(featured));
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updatePosition = useCallback((position: number, productId: string) => {
    setSelected((current) => current.map((value, index) => (
      index === position ? productId || null : value
    )) as ReplaceHighlightsCommand["productIds"]);
    setError(null);
    setSuccessMessage(null);
  }, []);

  const isSelectedElsewhere = useCallback((productId: string, position: number) => (
    selected.some((selectedId, index) => index !== position && selectedId === productId)
  ), [selected]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const parsed = replaceHighlightsSchema.safeParse({ productIds: selected });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisá las posiciones seleccionadas");
      return;
    }

    setSaving(true);
    try {
      const result = await onSave(parsed.data.productIds);
      if (!result.success) {
        setError(result.error?.message ?? "No se pudieron guardar los productos destacados");
        return;
      }
      setSuccessMessage("Productos destacados guardados.");
      router.refresh();
    } catch {
      setError("No pudimos comunicarnos con el servidor. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setSaving(false);
    }
  }, [onSave, router, selected]);

  return { selected, updatePosition, isSelectedElsewhere, error, successMessage, saving, handleSubmit };
}
