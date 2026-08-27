import { NextRequest } from "next/server";
import { getFontFile } from "@/features/fonts/backend/services/font.service";
import { ensureAdmin } from "@/features/auth/backend/services/auth.service";
import { notFoundResponse, errorResponse } from "@/shared/backend/responses";
import { AppError } from "@/shared/backend/errors/app-error";
import { contentTypeForPath, readFile } from "@/shared/backend/storage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const account = await ensureAdmin();
    const { id } = await params;
    const font = await getFontFile(id, account.tenantId!);

    const buffer = await readFile(font.filePath);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentTypeForPath(font.filePath),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.code, error.message, error.statusCode);
    }
    return notFoundResponse("Font");
  }
}
