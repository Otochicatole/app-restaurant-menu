import { prisma } from "@/platform/database/prisma";
import { canvasDocumentSchema } from "@/modules/menu-editor/contracts";
import type { PublicCanvasMenuView } from "../contracts";

export async function getPublishedCanvasBySlug(slug: string): Promise<PublicCanvasMenuView | null> {
  const project = await prisma.menuProject.findFirst({
    where: {
      slug,
      restaurant: { status: "ACTIVE", organization: { status: "ACTIVE" } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      publicDescription: true,
      publishedJson: true,
      restaurant: { select: { id: true, name: true, slug: true } },
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
    ? await prisma.menuAsset.findMany({ where: { restaurantId: project.restaurant.id, id: { in: [...ids] } } })
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
      fontFamily: asset.kind === "FONT" ? `editor-font-${asset.id}` : null,
    };
  }
  return {
    restaurant: { id: project.restaurant.id, name: project.name, slug: project.slug },
    profile: { name: project.name, description: project.publicDescription },
    document,
    assets: assetMap,
  };
}

export async function getPublicMenuStatus(slug: string): Promise<"published" | "preparation" | null> {
  const project = await prisma.menuProject.findFirst({
    where: {
      slug,
      restaurant: { status: "ACTIVE", organization: { status: "ACTIVE" } },
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
      restaurant: { status: "ACTIVE", organization: { status: "ACTIVE" } },
    },
    select: { name: true, publicDescription: true },
  });
  return project ? { title: project.name, description: project.publicDescription } : null;
}

export async function resolvePublishedMenuBySlug(slug: string): Promise<{ restaurantId: string; projectId: string } | null> {
  const project = await prisma.menuProject.findFirst({
    where: {
      slug,
      restaurant: { status: "ACTIVE", organization: { status: "ACTIVE" } },
    },
    select: { id: true, restaurantId: true },
  });
  return project ? { restaurantId: project.restaurantId, projectId: project.id } : null;
}
