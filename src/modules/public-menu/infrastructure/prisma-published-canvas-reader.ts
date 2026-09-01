import { prisma } from "@/platform/database/prisma";
import { canvasDocumentSchema } from "@/modules/menu-editor/contracts";
import type { PublicCanvasMenuView } from "../contracts";

export async function getPublishedCanvasBySlug(slug: string): Promise<PublicCanvasMenuView | null> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { id: true, name: true, slug: true, publicDescription: true },
  });
  if (!tenant) return null;
  const project = await prisma.menuProject.findUnique({ where: { tenantId: tenant.id }, select: { publishedJson: true } });
  if (!project?.publishedJson) return null;

  const document = canvasDocumentSchema.parse(JSON.parse(project.publishedJson));
  const ids = new Set<string>();
  for (const node of document.nodes) {
    if (node.type === "image") ids.add(node.assetId);
    if (node.type === "text" && node.fontAssetId) ids.add(node.fontAssetId);
  }
  const assets = ids.size
    ? await prisma.menuAsset.findMany({ where: { tenantId: tenant.id, id: { in: [...ids] }, references: { some: { tenantId: tenant.id, scope: "PUBLISHED" } } } })
    : [];
  const assetMap: PublicCanvasMenuView["assets"] = {};
  for (const asset of assets) {
    assetMap[asset.id] = {
      id: asset.id,
      kind: asset.kind,
      name: asset.name,
      mimeType: asset.mimeType,
      url: `/api/public/menus/${encodeURIComponent(tenant.slug)}/assets/${encodeURIComponent(asset.id)}/file`,
      fontFamily: asset.fontFamily ?? (asset.kind === "FONT" ? `"editor-font-${asset.id}"` : null),
    };
  }
  return { tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug }, profile: { name: tenant.name, description: tenant.publicDescription }, document, assets: assetMap };
}

export async function getPublicMenuStatus(slug: string): Promise<"published" | "preparation" | null> {
  const tenant = await prisma.tenant.findFirst({ where: { slug, status: "ACTIVE" }, select: { id: true } });
  if (!tenant) return null;
  const project = await prisma.menuProject.findUnique({ where: { tenantId: tenant.id }, select: { publishedJson: true } });
  return project?.publishedJson ? "published" : "preparation";
}

export async function getPublicMenuMetadata(slug: string): Promise<{ title: string; description: string } | null> {
  const tenant = await prisma.tenant.findFirst({
    where: { slug, status: "ACTIVE" },
    select: { name: true, publicDescription: true },
  });
  return tenant ? { title: tenant.name, description: tenant.publicDescription } : null;
}
