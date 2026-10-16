import { z } from "zod";

export const landingContentSchema = z.object({
  htmlContent: z.string().max(500_000, "El HTML no puede superar 500 KB"),
  cssContent: z.string().max(500_000, "El CSS no puede superar 500 KB"),
  jsContent: z.string().max(500_000, "El JavaScript no puede superar 500 KB"),
});

export const saveLandingCommandSchema = landingContentSchema.extend({
  tenantId: z.string().min(1),
});

export const publishLandingCommandSchema = landingContentSchema.extend({
  tenantId: z.string().min(1),
});

export type SaveLandingCommand = z.infer<typeof saveLandingCommandSchema>;
export type PublishLandingCommand = z.infer<typeof publishLandingCommandSchema>;

export type LandingPageData = {
  id: string;
  tenantId: string;
  htmlContent: string;
  cssContent: string;
  jsContent: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicLandingResult =
  | { kind: "not_found" }
  | { kind: "disabled" }
  | { kind: "preparation"; restaurantName: string; restaurantSlug: string }
  | {
      kind: "ready";
      restaurantName: string;
      restaurantSlug: string;
      html: string;
    };
