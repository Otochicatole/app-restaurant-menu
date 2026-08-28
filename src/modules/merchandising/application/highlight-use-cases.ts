import { z } from "zod";
import { replaceHighlightsSchema, type ReplaceHighlightsCommand } from "../contracts";
import type { HighlightsRepository } from "./ports";

export function createHighlightUseCases(repository: HighlightsRepository) {
  const tenantIdSchema = z.string().min(1);
  return {
    getHighlights(tenantId: string) {
      return repository.get(tenantIdSchema.parse(tenantId));
    },
    replaceHighlights(tenantId: string, input: ReplaceHighlightsCommand) {
      const parsed = replaceHighlightsSchema.parse(input);
      return repository.replace(tenantIdSchema.parse(tenantId), {
        productIds: parsed.productIds as ReplaceHighlightsCommand["productIds"],
      });
    },
  };
}
