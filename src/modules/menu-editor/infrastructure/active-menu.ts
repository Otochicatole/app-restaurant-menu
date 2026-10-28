import "server-only";
import { resolveActiveMenuWorkspace, requireWorkspaceProject } from "../application/active-menu-workspace";
import { menuEditorService } from "./composition";
export type { ActiveMenuWorkspace } from "../application/active-menu-workspace";
export async function loadActiveMenuWorkspace(restaurantId: string) { return resolveActiveMenuWorkspace(menuEditorService, restaurantId); }
export async function requireActiveMenuProject(restaurantId: string) { return requireWorkspaceProject(await loadActiveMenuWorkspace(restaurantId)); }
export const requireActiveMenuProjectForApi = requireActiveMenuProject;
