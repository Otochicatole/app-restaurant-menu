import { describe, expect, it, vi } from "vitest";
import { createTemplateDocument } from "../domain/template";
import type { MenuTemplateView } from "../contracts";
import type { TemplateRepository } from "./template-ports";
import { createTemplateUseCases } from "./template-use-cases";

const view: MenuTemplateView = { id: "t1", name: "Plantilla", description: "", visibility: "PUBLIC", status: "PENDING", isSystem: false, tenantId: "tenant", document: createTemplateDocument("Café"), rejectionReason: null, createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString() };
function repository(): TemplateRepository {
  return { list: vi.fn(async () => [view]), createPrivate: vi.fn(async () => view), submitPublic: vi.fn(async () => view), apply: vi.fn(async () => view.document), updatePrivate: vi.fn(async () => view), deletePrivate: vi.fn(async () => undefined), listPending: vi.fn(async () => [view]), listForSuperadmin: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 24 })), deletePublic: vi.fn(async () => undefined), moderate: vi.fn(async () => view) };
}

describe("template use cases", () => {
  it("valida documentos y enruta envíos públicos", async () => {
    const repo = repository();
    const service = createTemplateUseCases(repo);
    await service.create("tenant", view.document, { name: "Comunidad", description: "", submitPublic: true });
    expect(repo.submitPublic).toHaveBeenCalledWith(expect.objectContaining({ tenantId: "tenant", name: "Comunidad" }));
  });

  it("exige motivo al rechazar y valida filtros de superadmin", async () => {
    const repo = repository();
    const service = createTemplateUseCases(repo);
    expect(() => service.moderate("t1", "reject")).toThrow();
    await service.listForSuperadmin({ tab: "pending", page: 1, pageSize: 24, query: "" });
    expect(repo.listForSuperadmin).toHaveBeenCalled();
  });
});
