import { z } from "zod";
import { NotFoundError } from "@/platform/application/errors";
import type { PublishedMenuReader } from "./ports";

const slugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(50);

export function createPublicMenuUseCases(reader: PublishedMenuReader) {
  return {
    async getPublicMenu(slugInput: string) {
      const slug = slugSchema.parse(slugInput);
      const menu = await reader.getBySlug(slug);
      if (!menu) throw new NotFoundError("Menu");
      return menu;
    },
  };
}
