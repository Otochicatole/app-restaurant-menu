import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { BadRequestError } from "@/platform/application/errors";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { menuEditor, type MenuAssetKind } from "@/modules/menu-editor/server";
import { checksum } from "@/modules/menu-editor/server";
import { blobStore } from "@/platform/storage";
import { errorResponse, handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);
const FONT_TYPES = new Set(["font/woff", "font/woff2", "font/ttf", "font/otf", "application/font-woff", "application/font-woff2", "application/x-font-ttf", "application/vnd.ms-opentype"]);

export async function GET(request: NextRequest) {
  try {
    const actor = await requireTenantAdmin();
    const kind = new URL(request.url).searchParams.get("kind");
    if (kind && kind !== "IMAGE" && kind !== "VIDEO" && kind !== "FONT") throw new BadRequestError("Tipo de asset inválido");
    return successResponse(await menuEditor.listAssets(actor.tenantId, kind as MenuAssetKind | undefined));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const form = await request.formData();
    const kind = form.get("kind");
    if (kind !== "IMAGE" && kind !== "VIDEO" && kind !== "FONT") throw new BadRequestError("Tipo de asset inválido");
    const file = form.get("file");
    if (!(file instanceof File)) return errorResponse("VALIDATION_ERROR", "Archivo no proporcionado", 422);
    const content = new Uint8Array(await file.arrayBuffer());
    const types = kind === "IMAGE" ? IMAGE_TYPES : kind === "VIDEO" ? VIDEO_TYPES : FONT_TYPES;
    const extension = extensionFor(file.type, file.name);
    const extensionAllowedFont = kind === "FONT" && ["woff", "woff2", "ttf", "otf"].includes(extension) && (!file.type || file.type === "application/octet-stream");
    if (!types.has(file.type) && !extensionAllowedFont) throw new BadRequestError("Formato de archivo no soportado.");
    const max = kind === "IMAGE" ? 5 * 1024 * 1024 : kind === "VIDEO" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size <= 0 || file.size > max) throw new BadRequestError("El archivo excede el tamaño máximo permitido.");
    const dimensions = kind === "IMAGE" ? imageDimensions(content, file.type) : null;
    if (kind === "IMAGE" && (!dimensions || dimensions.width > 8192 || dimensions.height > 8192)) throw new BadRequestError("La imagen no es válida o supera 8192×8192 píxeles.");
    const storageKey = `tenants/${actor.tenantId}/editor-assets/${randomUUID()}.${extension}`;
    await blobStore.put(storageKey, Buffer.from(content));
    try {
      const asset = await menuEditor.createAsset(actor.tenantId, {
        tenantId: actor.tenantId,
        kind,
        name: String(form.get("name") || file.name).trim().slice(0, 100) || file.name,
        mimeType: file.type,
        byteSize: file.size,
        checksum: checksum(content),
        storageKey,
        ...(dimensions ?? {}),
      });
      return successResponse(asset, 201);
    } catch (error) {
      await blobStore.delete(storageKey).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}

function imageDimensions(bytes: Uint8Array, mimeType: string): { width: number; height: number } | null {
  if (mimeType === "image/png" && bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50) return { width: new DataView(bytes.buffer, bytes.byteOffset).getUint32(16), height: new DataView(bytes.buffer, bytes.byteOffset).getUint32(20) };
  if (mimeType === "image/webp" && bytes.length >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    const chunk = String.fromCharCode(...bytes.slice(12, 16));
    if (chunk === "VP8X") return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
    if (chunk === "VP8L" && bytes[20] === 0x2f && bytes.length >= 25) return { width: 1 + ((bytes[21] | (bytes[22] << 8)) & 0x3fff), height: 1 + (((bytes[22] >> 6) | (bytes[23] << 2) | (bytes[24] << 10)) & 0x3fff) };
    if (chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { width: bytes[26] | (bytes[27] << 8), height: bytes[28] | (bytes[29] << 8) };
  }
  if (mimeType === "image/jpeg" && bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
      offset += 2 + length;
    }
  }
  return null;
}

function extensionFor(type: string, name: string): string {
  const known: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm", "font/woff": "woff", "font/woff2": "woff2", "font/ttf": "ttf", "font/otf": "otf" };
  return known[type] ?? (name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin");
}
