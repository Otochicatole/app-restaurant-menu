"use client";

import { useEffect, useRef, useState } from "react";
import type { CatalogActionResult, ProductInput, ProductView } from "../contracts";

export interface ProductEditorMutations {
  createProduct?: (input: ProductInput) => Promise<CatalogActionResult<ProductView>>;
  updateProduct: (command: { productId: string; input: ProductInput }) => Promise<CatalogActionResult<ProductView>>;
}

export function useProductEditorController(options: ProductEditorMutations & {
  product?: ProductView;
  onSuccess(product: ProductView): void;
}) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [persistedProductId, setPersistedProductId] = useState<string | null>(options.product?.id ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const setPreview = (url: string | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  };

  const chooseFile = (file: File | null) => {
    setSelectedFile(file);
    setRemoveMedia(false);
    setServerError(null);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const markMediaForRemoval = () => {
    setSelectedFile(null);
    setRemoveMedia(true);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const save = async (input: ProductInput) => {
    setLoading(true);
    setServerError(null);
    try {
      const knownProductId = persistedProductId ?? options.product?.id;
      const result = knownProductId
        ? await options.updateProduct({ productId: knownProductId, input })
        : options.createProduct
          ? await options.createProduct(input)
          : { success: false as const, error: { code: "INVALID_EDITOR_STATE", message: "No se puede crear el producto" } };

      if (!result.success) {
        setServerError(result.error.message);
        return;
      }

      // Persist immediately after metadata succeeds. If media fails, the next submit
      // updates this product instead of issuing a second create command.
      setPersistedProductId(result.data.id);
      let savedProduct = result.data;
      try {
        savedProduct = await syncMedia(result.data.id, result.data);
      } catch (error) {
        setServerError(error instanceof Error ? error.message : "No se pudo sincronizar el archivo");
        return;
      }
      options.onSuccess(savedProduct);
    } catch {
      setServerError("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const syncMedia = async (productId: string, fallback: ProductView): Promise<ProductView> => {
    if (removeMedia && (options.product?.mediaUrl || persistedProductId)) {
      return fetchMediaMutation(`/api/products/${encodeURIComponent(productId)}/media`, { method: "DELETE" }, "No se pudo quitar el archivo");
    }
    if (selectedFile) {
      const body = new FormData();
      body.append("file", selectedFile);
      return fetchMediaMutation(`/api/products/${encodeURIComponent(productId)}/media`, { method: "POST", body }, "No se pudo subir el archivo");
    }
    return fallback;
  };

  return {
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
  };
}

async function fetchMediaMutation(url: string, init: RequestInit, fallbackMessage: string): Promise<ProductView> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null) as
    | { success: true; data: ProductView }
    | { success: false; error: { message: string } }
    | null;
  if (!response.ok || !body?.success) {
    throw new Error(body && !body.success ? body.error.message : fallbackMessage);
  }
  return body.data;
}

