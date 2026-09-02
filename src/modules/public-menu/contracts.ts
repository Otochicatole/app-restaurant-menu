import type { CanvasDocumentV1 } from "@/modules/menu-editor/ui";

export type PublicCanvasAsset = {
  id: string;
  kind: "IMAGE" | "VIDEO" | "FONT";
  name: string;
  mimeType: string;
  url: string;
  width?: number | null;
  height?: number | null;
  fontFamily?: string | null;
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
