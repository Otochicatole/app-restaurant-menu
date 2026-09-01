import type { CanvasDocumentV1, CreateTemplateCommand, MenuTemplateView } from "../contracts";

export type TemplateCreateInput = CreateTemplateCommand & { tenantId: string; document: CanvasDocumentV1 };

export interface TemplateRepository {
  list(tenantId: string): Promise<MenuTemplateView[]>;
  createPrivate(input: TemplateCreateInput): Promise<MenuTemplateView>;
  submitPublic(input: TemplateCreateInput): Promise<MenuTemplateView>;
  apply(tenantId: string, templateId: string): Promise<CanvasDocumentV1>;
  updatePrivate(tenantId: string, templateId: string, input: { name?: string; description?: string }): Promise<MenuTemplateView>;
  deletePrivate(tenantId: string, templateId: string): Promise<void>;
  listPending(): Promise<MenuTemplateView[]>;
  moderate(templateId: string, action: "publish" | "reject" | "archive", reason?: string): Promise<MenuTemplateView>;
}
