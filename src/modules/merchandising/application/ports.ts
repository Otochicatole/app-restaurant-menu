import type { HighlightSlots, ReplaceHighlightsCommand } from "../contracts";

export interface HighlightsRepository {
  get(tenantId: string): Promise<HighlightSlots>;
  replace(tenantId: string, command: ReplaceHighlightsCommand): Promise<void>;
}
