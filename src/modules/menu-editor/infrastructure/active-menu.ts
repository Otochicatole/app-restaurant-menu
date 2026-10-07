import "server-only";

import { redirect } from "next/navigation";
import { BadRequestError } from "@/platform/application/errors";
import type { MenuProjectView } from "../contracts";
import { resolveActiveMenuWorkspace, requireWorkspaceProject, type ActiveMenuWorkspace } from "../application/active-menu-workspace";
import { clearActiveMenuCookie, readActiveMenuCookie, writeActiveMenuCookie } from "./active-menu-cookie";
import { menuEditorService } from "./composition";

export type { ActiveMenuWorkspace };

export async function loadActiveMenuWorkspace(tenantId: string): Promise<ActiveMenuWorkspace> {
  const cookieProjectId = await readActiveMenuCookie();
  return resolveActiveMenuWorkspace(menuEditorService, tenantId, cookieProjectId);
}

export async function requireActiveMenuProject(tenantId: string): Promise<MenuProjectView> {
  const workspace = await loadActiveMenuWorkspace(tenantId);
  if (workspace.needsSelection) redirect("/admin/menus");
  return requireWorkspaceProject(workspace);
}

export async function requireActiveMenuProjectForApi(tenantId: string): Promise<MenuProjectView> {
  const workspace = await loadActiveMenuWorkspace(tenantId);
  if (workspace.needsSelection || !workspace.active) {
    throw new BadRequestError("Seleccioná un menú para continuar.");
  }
  return workspace.active;
}

export { writeActiveMenuCookie, clearActiveMenuCookie, readActiveMenuCookie };
