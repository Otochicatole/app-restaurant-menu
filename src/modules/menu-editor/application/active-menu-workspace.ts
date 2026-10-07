import { BadRequestError } from "@/platform/application/errors";
import type { MenuProjectSummary, MenuProjectView } from "../contracts";
import { createTemplateDocument } from "../domain/template";
import type { createMenuEditorUseCases } from "./menu-editor-use-cases";

type MenuEditor = ReturnType<typeof createMenuEditorUseCases>;

export type ActiveMenuWorkspace = {
  multiMenuEnabled: boolean;
  maxMenus: number;
  canCreateMenu: boolean;
  menus: MenuProjectSummary[];
  active: MenuProjectView | null;
  needsSelection: boolean;
};

export async function resolveActiveMenuWorkspace(
  menuEditor: MenuEditor,
  tenantId: string,
  cookieProjectId: string | undefined,
): Promise<ActiveMenuWorkspace> {
  const [quota, allMenus] = await Promise.all([
    menuEditor.getTenantMenuQuota(tenantId),
    menuEditor.listProjects(tenantId),
  ]);
  const multiMenuEnabled = quota.multiMenuEnabled;

  let menus = allMenus;
  if (menus.length === 0) {
    const primary = await menuEditor.getPrimaryProject(tenantId, createTemplateDocument("Menú"));
    menus = [
      {
        id: primary.id,
        name: primary.name,
        slug: primary.slug,
        publicDescription: primary.publicDescription,
        isPrimary: primary.isPrimary,
        hasPublishedDocument: primary.hasPublishedDocument,
      },
    ];
  }

  const usable = multiMenuEnabled ? menus : menus.filter((menu) => menu.isPrimary);
  const usableMenus = usable.length > 0 ? usable : menus.filter((menu) => menu.isPrimary);
  const canCreateMenu = multiMenuEnabled && usableMenus.length < quota.maxMenus;

  const cookieMatch = cookieProjectId
    ? usableMenus.find((menu) => menu.id === cookieProjectId) ?? null
    : null;

  if (cookieMatch) {
    const active = await menuEditor.getProject(tenantId, cookieMatch.id);
    return { multiMenuEnabled, maxMenus: quota.maxMenus, canCreateMenu, menus: usableMenus, active, needsSelection: false };
  }

  if (usableMenus.length === 1) {
    const only = usableMenus[0]!;
    const active = await menuEditor.getProject(tenantId, only.id);
    return { multiMenuEnabled, maxMenus: quota.maxMenus, canCreateMenu, menus: usableMenus, active, needsSelection: false };
  }

  return { multiMenuEnabled, maxMenus: quota.maxMenus, canCreateMenu, menus: usableMenus, active: null, needsSelection: true };
}

export function requireWorkspaceProject(workspace: ActiveMenuWorkspace): MenuProjectView {
  if (!workspace.active) throw new BadRequestError("Seleccioná un menú para continuar.");
  return workspace.active;
}
