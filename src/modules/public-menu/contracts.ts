import type { CanvasDocumentV1 } from "@/modules/menu-editor/ui";

export type PublicCanvasAsset = {
  id: string;
  kind: "IMAGE" | "FONT";
  name: string;
  mimeType: string;
  url: string;
  fontFamily: string | null;
};

export type PublicCanvasMenuView = {
  tenant: { id: string; name: string; slug: string };
  profile: { name: string; description: string };
  document: CanvasDocumentV1;
  assets: Record<string, PublicCanvasAsset>;
};

export type PublicMenuMetadata = {
  title: string;
  description: string;
};
