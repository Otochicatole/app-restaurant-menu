import { NextRequest } from "next/server";
import { BadRequestError } from "@/platform/application/errors";
import { requireTenantAdmin } from "@/modules/identity-access/server";
import { createCustomFontSchema, menuCustomization, type FontOption } from "@/modules/menu-customization/server";
import { errorResponse, handleApiError, successResponse } from "@/platform/http/api-response";
import { csrfErrorResponse, validateOrigin } from "@/platform/security/csrf";

export async function GET() {
  try {
    const actor = await requireTenantAdmin();
    const fonts = await menuCustomization.listFonts(actor.tenantId);
    return successResponse(await Promise.all(fonts.map((font) => toLegacyHttpFont(actor.tenantId, font))));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) return csrfErrorResponse();
    const actor = await requireTenantAdmin();
    const formData = await request.formData();
    const metadata = createCustomFontSchema.parse({
      name: formData.get("name"),
      category: formData.get("category"),
    });
    const file = formData.get("file");
    if (!(file instanceof File)) return errorResponse("VALIDATION_ERROR", "Archivo de fuente no proporcionado", 422);
    if (file.size > 10 * 1024 * 1024) throw new BadRequestError("El archivo excede el tamaño máximo de 10MB.");
    const font = await menuCustomization.createCustomFont(actor.tenantId, {
      ...metadata,
      file: { name: file.name, size: file.size, buffer: new Uint8Array(await file.arrayBuffer()) },
    });
    return successResponse(await toLegacyHttpFont(actor.tenantId, font), 201);
  } catch (error) {
    return handleApiError(error);
  }
}

async function toLegacyHttpFont(tenantId: string, font: FontOption) {
  const filePath = font.source === "custom" && font.hasFile
    ? (await menuCustomization.getCustomFontAsset(tenantId, font.id)).storageKey
    : null;
  return {
    id: font.id,
    name: font.name,
    category: font.category,
    source: font.source,
    googleFamily: font.googleFamily,
    fontFamily: font.fontFamily,
    weights: font.weights,
    filePath,
    createdAt: font.createdAt,
    updatedAt: font.updatedAt,
  };
}
