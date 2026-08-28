"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/platform/application/action-result";
import type { FontCategory, FontOption, FontTarget } from "../contracts";

export type FontActionResult = ActionResult;

export type FontSettingsProps = {
  fonts: FontOption[];
  activeFontId: Record<FontTarget, string | null>;
  selectFont: (target: FontTarget, fontId: string | null) => Promise<FontActionResult>;
  removeFont: (id: string) => Promise<FontActionResult>;
};

export function useFontSettingsController({
  fonts,
  activeFontId,
  selectFont,
  removeFont,
}: FontSettingsProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | FontCategory>("all");
  const [selectedTarget, setSelectedTargetState] = useState<FontTarget>("global");
  const [selectingKey, setSelectingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmFont, setConfirmFont] = useState<FontOption | null>(null);
  const [deletingFontId, setDeletingFontId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const visibleFonts = useMemo(
    () => (filter === "all" ? fonts : fonts.filter((font) => font.category === filter)),
    [filter, fonts],
  );

  const setSelectedTarget = useCallback((target: FontTarget) => {
    setSelectedTargetState(target);
    setSelectingKey(null);
    setActionError(null);
  }, []);

  const applyFont = useCallback(async (fontId: string | null) => {
    const operationKey = fontId ?? "__default__";
    setSelectingKey(operationKey);
    setActionError(null);
    try {
      const result = await selectFont(selectedTarget, fontId);
      if (!result.success) {
        setActionError(result.error?.message ?? "No se pudo aplicar la fuente");
        return;
      }
      router.refresh();
    } catch {
      setActionError("No pudimos comunicarnos con el servidor. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setSelectingKey(null);
    }
  }, [router, selectFont, selectedTarget]);

  const deleteFont = useCallback(async () => {
    if (!confirmFont) return;
    setDeletingFontId(confirmFont.id);
    setActionError(null);
    try {
      const result = await removeFont(confirmFont.id);
      if (!result.success) {
        setActionError(result.error?.message ?? "No se pudo eliminar la fuente");
        setConfirmFont(null);
        return;
      }
      setConfirmFont(null);
      router.refresh();
    } catch {
      setActionError("No pudimos comunicarnos con el servidor. Revisá tu conexión e intentá nuevamente.");
      setConfirmFont(null);
    } finally {
      setDeletingFontId(null);
    }
  }, [confirmFont, removeFont, router]);

  const uploadFont = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadError(null);
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      setUploadError("Seleccioná un archivo de fuente.");
      return;
    }

    setUploading(true);
    try {
      const response = await fetch("/api/fonts", { method: "POST", body: formData });
      if (!response.ok) {
        setUploadError(await readResponseError(response, "No se pudo instalar la fuente"));
        return;
      }
      setUploadOpen(false);
      router.refresh();
    } catch {
      setUploadError("No pudimos subir el archivo. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setUploading(false);
    }
  }, [router]);

  const openUpload = useCallback(() => {
    setUploadError(null);
    setUploadOpen(true);
  }, []);

  const closeUpload = useCallback(() => {
    if (!uploading) setUploadOpen(false);
  }, [uploading]);

  return {
    fonts,
    visibleFonts,
    filter,
    setFilter,
    selectedTarget,
    setSelectedTarget,
    activeFontIdForTarget: activeFontId[selectedTarget] ?? null,
    selectingKey,
    applyFont,
    actionError,
    dismissActionError: () => setActionError(null),
    confirmFont,
    requestDelete: setConfirmFont,
    closeDelete: () => {
      if (!deletingFontId) setConfirmFont(null);
    },
    deleteFont,
    deletingFontId,
    uploadOpen,
    uploading,
    uploadError,
    openUpload,
    closeUpload,
    uploadFont,
  };
}

async function readResponseError(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" && body !== null &&
      "error" in body && typeof body.error === "object" && body.error !== null &&
      "message" in body.error && typeof body.error.message === "string"
    ) {
      return body.error.message;
    }
  } catch {
    // The transport can return an empty or non-JSON error body.
  }
  return fallback;
}

export type FontSettingsController = ReturnType<typeof useFontSettingsController>;
