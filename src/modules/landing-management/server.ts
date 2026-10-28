import "server-only";

import { landingManagementService } from "./infrastructure/composition";

export {
  createCustomLandingModuleAction,
  createLandingTemplateAction,
  deleteCustomLandingModuleAction,
  deletePrivateLandingTemplateAction,
  exportLandingTemplateAction,
  importLandingTemplateAction,
  listSuperadminLandingTemplatesAction,
  moderateLandingTemplateAction,
  publishLandingAction,
  saveLandingDraftAction,
} from "./presentation/actions";
export type { LandingActionResult } from "./presentation/actions";

export type {
  CreateCustomModuleCommand,
  CreateLandingTemplateCommand,
  LandingBlock,
  LandingCustomModuleView,
  LandingDocumentV1,
  LandingModuleField,
  LandingPageData,
  LandingTemplateStatus,
  LandingTemplateView,
  LandingTemplateVisibility,
  LandingTheme,
  PublicLandingResult,
  PublishLandingCommand,
  SaveLandingCommand,
  SuperadminLandingTemplateList,
  SuperadminLandingTemplateQuery,
  SuperadminLandingTemplateTab,
  SuperadminLandingTemplateView,
} from "./contracts";
export {
  createCustomModuleCommandSchema,
  createLandingTemplateSchema,
  landingContentSchema,
  landingDocumentSchema,
  publishLandingCommandSchema,
  saveLandingCommandSchema,
  superadminLandingTemplateQuerySchema,
} from "./contracts";

export const landingManagement = landingManagementService;
