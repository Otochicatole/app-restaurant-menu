import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/modules/identity-access/server";
import { prisma } from "@/platform/database/prisma";
import { blobStore } from "@/platform/storage";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; assetId: string }> }) {
  try {
    await requireSuperAdmin();
    const { id, assetId } = await params;
    const asset = await prisma.menuTemplateAsset.findFirst({ where: { id: assetId, templateId: id }, select: { storageKey: true, mimeType: true, name: true } });
    if (!asset) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Asset no encontrado" } }, { status: 404 });
    const bytes = await blobStore.read(asset.storageKey);
    return new NextResponse(new Uint8Array(bytes) as BodyInit, { headers: { "Content-Type": asset.mimeType || "application/octet-stream", "Content-Disposition": `inline; filename="${asset.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`, "Cache-Control": "private, max-age=300" } });
  } catch { return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Asset no encontrado" } }, { status: 404 }); }
}
