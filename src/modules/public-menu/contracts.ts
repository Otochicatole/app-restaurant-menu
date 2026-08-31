import type { FontCategory, FontTarget } from "@/modules/menu-customization/contracts";
import type { CanvasDocumentV1 } from "@/modules/menu-editor/contracts";

export type PublicMenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
};

export type PublicMenuSection = {
  id: string;
  name: string;
  description: string;
  items: PublicMenuItem[];
};

export type PublicMenuFont = {
  id: string;
  name: string;
  category: FontCategory;
  source: "google" | "custom";
  googleFamily: string | null;
  familyAlias: string;
  fontFamily: string;
  weights: string;
  fileUrl: string | null;
};

export type PublicMenuTheme = {
  fonts: Record<FontTarget, PublicMenuFont | null>;
};

export type PublicMenuHighlight = {
  position: 1 | 2 | 3;
  product: Pick<PublicMenuItem, "id" | "name" | "price"> & { groupName: string };
};

export type PublicMenuView = {
  tenant: { id: string; name: string; slug: string };
  header: { title: string; description: string };
  sections: PublicMenuSection[];
  highlights: [PublicMenuHighlight | null, PublicMenuHighlight | null, PublicMenuHighlight | null];
  theme: PublicMenuTheme;
};

export type PublicMenuMetadata = { title: string; description: string };

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
