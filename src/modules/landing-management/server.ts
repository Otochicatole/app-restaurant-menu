import "server-only";

import { landingManagementService } from "./infrastructure/composition";

export {
  publishLandingAction,
  saveLandingDraftAction,
} from "./presentation/actions";
export type { LandingActionResult } from "./presentation/actions";

export type {
  LandingPageData,
  PublicLandingResult,
  PublishLandingCommand,
  SaveLandingCommand,
} from "./contracts";
export {
  landingContentSchema,
  publishLandingCommandSchema,
  saveLandingCommandSchema,
} from "./contracts";

export const landingManagement = landingManagementService;
