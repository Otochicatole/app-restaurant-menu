import type { CanvasDocumentV1, CreateTemplateCommand, MenuTemplateView, SuperadminTemplateList, SuperadminTemplateQuery } from "../contracts";

export type TemplateCreateInput = CreateTemplateCommand & { tenantId: string; document: CanvasDocumentV1 };

export interface TemplateRepository {
  list(tenantId: string): Promise<MenuTemplateView[]>;
  createPrivate(input: TemplateCreateInput): Promise<MenuTemplateView>;
  submitPublic(input: TemplateCreateInput): Promise<MenuTemplateView>;
  apply(tenantId: string, templateId: string): Promise<CanvasDocumentV1>;
  updatePrivate(tenantId: string, templateId: string, input: { name?: string; description?: string }): Promise<MenuTemplateView>;
  deletePrivate(tenantId: string, templateId: string): Promise<void>;
  listPending(): Promise<MenuTemplateView[]>;
  listForSuperadmin(input: SuperadminTemplateQuery): Promise<SuperadminTemplateList>;
  deletePublic(templateId: string): Promise<void>;
  moderate(templateId: string, action: "publish" | "reject" | "archive" | "restore", reason?: string): Promise<MenuTemplateView>;
}
