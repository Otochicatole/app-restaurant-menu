import "server-only";

import { cache } from "react";
import { createPublicMenuUseCases } from "./application/public-menu-use-cases";
import { PrismaPublishedMenuReader } from "./infrastructure/prisma-published-menu-reader";

export type {
  PublicMenuFont,
  PublicMenuHighlight,
  PublicMenuItem,
  PublicMenuMetadata,
  PublicMenuSection,
  PublicMenuTheme,
  PublicMenuView,
} from "./contracts";

const useCases = createPublicMenuUseCases(new PrismaPublishedMenuReader());

export const getPublicMenu = cache(useCases.getPublicMenu);
export const getPublicMenuMetadata = cache(async (slug: string) => {
  const menu = await getPublicMenu(slug);
  return { title: menu.header.title, description: menu.header.description };
});
