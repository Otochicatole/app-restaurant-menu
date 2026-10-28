import type { MenuProjectSummary, MenuProjectView } from "../contracts";
import { BadRequestError } from "@/platform/application/errors";
import type { createMenuEditorUseCases } from "./menu-editor-use-cases";
export type ActiveMenuWorkspace = { menus: MenuProjectSummary[]; active: MenuProjectView | null; needsSelection: boolean };
export async function resolveActiveMenuWorkspace(editor: ReturnType<typeof createMenuEditorUseCases>, restaurantId: string): Promise<ActiveMenuWorkspace> {
 const menus = await editor.listProjects(restaurantId);
 const active = menus[0] ? await editor.getProject(restaurantId, menus[0].id) : null;
 return { menus, active, needsSelection: !active };
}
export function requireWorkspaceProject(workspace: ActiveMenuWorkspace): MenuProjectView {
 if (!workspace.active) throw new BadRequestError("El restaurante no tiene una carta.");
 return workspace.active;
}
