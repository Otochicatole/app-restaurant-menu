import type { CanvasDocumentV1, CreateTemplateCommand, MenuTemplateView, SuperadminTemplateList, SuperadminTemplateQuery } from "../contracts";
import type { PortableTemplate } from "../domain/template-bundle";

export type TemplateCreateInput = CreateTemplateCommand & { restaurantId: string; document: CanvasDocumentV1 };

export interface TemplateRepository {
  list(restaurantId: string): Promise<MenuTemplateView[]>;
  createPrivate(input: TemplateCreateInput): Promise<MenuTemplateView>;
  submitPublic(input: TemplateCreateInput): Promise<MenuTemplateView>;
  exportPortable(restaurantId: string, templateId: string): Promise<PortableTemplate>;
  importPortable(restaurantId: string, template: PortableTemplate): Promise<MenuTemplateView>;
  apply(restaurantId: string, templateId: string): Promise<CanvasDocumentV1>;
  updatePrivate(restaurantId: string, templateId: string, input: { name?: string; description?: string }): Promise<MenuTemplateView>;
  deletePrivate(restaurantId: string, templateId: string): Promise<void>;
  listPending(): Promise<MenuTemplateView[]>;
  listForSuperadmin(input: SuperadminTemplateQuery): Promise<SuperadminTemplateList>;
  deletePublic(templateId: string): Promise<void>;
  moderate(templateId: string, action: "publish" | "reject" | "archive" | "restore", reason?: string): Promise<MenuTemplateView>;
}
