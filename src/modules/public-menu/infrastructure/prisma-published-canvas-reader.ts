import { prisma } from "@/platform/database/prisma";
import { canvasDocumentSchema } from "@/modules/menu-editor/contracts";
import type { PublicCanvasMenuView } from "../contracts";

export async function getPublishedCanvasBySlug(slug: string): Promise<PublicCanvasMenuView | null> {
  const project = await prisma.menuProject.findFirst({
    where: {
      slug,
      tenant: { status: "ACTIVE" },
      OR: [
        { isPrimary: true },
        { tenant: { multiMenuEnabled: true } },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      publicDescription: true,
      publishedJson: true,
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });
  if (!project?.publishedJson) return null;

  const document = canvasDocumentSchema.parse(JSON.parse(project.publishedJson));
  const ids = new Set<string>();
  for (const node of document.nodes) {
    if (node.type === "image") ids.add(node.assetId);
    if (node.type === "text" && node.fontAssetId) ids.add(node.fontAssetId);
    if (node.type === "text" && node.modalAssetId) ids.add(node.modalAssetId);
    if (node.type === "shape" && node.shape === "rect" && node.backgroundImage) ids.add(node.backgroundImage.assetId);
  }
  const assets = ids.size
    ? await prisma.menuAsset.findMany({ where: { tenantId: project.tenant.id, id: { in: [...ids] } } })
    : [];
  const assetMap: PublicCanvasMenuView["assets"] = {};
  for (const asset of assets) {
    assetMap[asset.id] = {
      id: asset.id,
      kind: asset.kind,
      name: asset.name,
      mimeType: asset.mimeType,
      url: `/api/public/menus/${encodeURIComponent(project.slug)}/assets/${encodeURIComponent(asset.id)}/file`,
      width: asset.width,
      height: asset.height,
      fontFamily: asset.fontFamily ?? (asset.kind === "FONT" ? `"editor-font-${asset.id}"` : null),
    };
  }
  return {
    tenant: { id: project.tenant.id, name: project.name, slug: project.slug },
    profile: { name: project.name, description: project.publicDescription },
    document,
    assets: assetMap,
  };
}

export async function getPublicMenuStatus(slug: string): Promise<"published" | "preparation" | null> {
  const project = await prisma.menuProject.findFirst({
    where: {
      slug,
      tenant: { status: "ACTIVE" },
      OR: [
        { isPrimary: true },
        { tenant: { multiMenuEnabled: true } },
      ],
    },
    select: { publishedJson: true },
  });
  if (!project) return null;
  return project.publishedJson ? "published" : "preparation";
}

export async function getPublicMenuMetadata(slug: string): Promise<{ title: string; description: string } | null> {
  const project = await prisma.menuProject.findFirst({
    where: {
      slug,
      tenant: { status: "ACTIVE" },
      OR: [
        { isPrimary: true },
        { tenant: { multiMenuEnabled: true } },
      ],
    },
    select: { name: true, publicDescription: true },
  });
  return project ? { title: project.name, description: project.publicDescription } : null;
}

export async function resolvePublishedMenuBySlug(slug: string): Promise<{ tenantId: string; projectId: string } | null> {
  const project = await prisma.menuProject.findFirst({
    where: {
      slug,
      tenant: { status: "ACTIVE" },
      OR: [
        { isPrimary: true },
        { tenant: { multiMenuEnabled: true } },
      ],
    },
    select: { id: true, tenantId: true },
  });
  return project ? { tenantId: project.tenantId, projectId: project.id } : null;
}
