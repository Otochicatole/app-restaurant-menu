import type { PublicMenuView } from "../contracts";

export interface PublishedMenuReader {
  getBySlug(slug: string): Promise<PublicMenuView | null>;
}
