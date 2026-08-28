import "server-only";

import { menuCustomizationService } from "./infrastructure/composition";

export {
  deleteMenuFontAction,
  selectMenuFontAction,
  updateMenuHeaderAction,
} from "./presentation/actions";
export type { MenuCustomizationActionResult } from "./presentation/actions";

export type {
  CustomFontUpload,
  FontCategory,
  FontOption,
  FontSelection,
  FontTarget,
  MenuHeader,
  SelectFontCommand,
  UpdateMenuHeaderCommand,
} from "./contracts";
export {
  createCustomFontSchema,
  fontCategorySchema,
  fontFamilyAlias,
  fontTargetSchema,
  FONT_CATEGORIES,
  FONT_CATEGORY_LABELS,
  FONT_SETTING_KEYS,
  FONT_TARGETS,
  FONT_TARGET_LABELS,
  selectFontSchema,
  updateMenuHeaderSchema,
} from "./contracts";

export const menuCustomization = menuCustomizationService;
