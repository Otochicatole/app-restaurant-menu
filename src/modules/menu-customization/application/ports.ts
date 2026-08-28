import type {
  CustomFontUpload,
  FontOption,
  FontSelection,
  MenuHeader,
  SelectFontCommand,
  UpdateMenuHeaderCommand,
} from "../contracts";

export interface MenuCustomizationRepository {
  getHeader(tenantId: string): Promise<MenuHeader>;
  updateHeader(tenantId: string, input: UpdateMenuHeaderCommand): Promise<MenuHeader>;
  listFonts(tenantId: string): Promise<FontOption[]>;
  getFontSelection(tenantId: string): Promise<FontSelection>;
  selectFont(tenantId: string, input: SelectFontCommand): Promise<void>;
  createCustomFont(tenantId: string, input: CustomFontUpload): Promise<FontOption>;
  deleteCustomFont(tenantId: string, fontId: string): Promise<void>;
  getCustomFontAsset(tenantId: string, fontId: string): Promise<{ storageKey: string; name: string }>;
}
