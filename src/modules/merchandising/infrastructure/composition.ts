import { createHighlightUseCases } from "../application/highlight-use-cases";
import { PrismaHighlightsRepository } from "./prisma-highlights-repository";

export const highlightUseCases = createHighlightUseCases(new PrismaHighlightsRepository());
