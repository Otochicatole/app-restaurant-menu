import "server-only";

import { tenantManagementService } from "./infrastructure/composition";

export {
  createTenantAction,
  deleteTenantAction,
  deleteTenantMenusAction,
  resetTenantPasswordAction,
  setTenantMaxMenusAction,
  setTenantMultiMenuAction,
  setTenantStatusAction,
  updateTenantAction,
} from "./presentation/actions";
export type { TenantActionResult } from "./presentation/actions";

export type {
  ActiveTenant,
  CreateTenantCommand,
  CreatedTenant,
  DeleteTenantCommand,
  DeleteTenantMenusCommand,
  SetTenantMaxMenusCommand,
  SetTenantMultiMenuCommand,
  SetTenantStatusCommand,
  TenantListItem,
  TenantMenuSummary,
  TenantStatus,
  UpdateTenantCommand,
} from "./contracts";
export {
  createTenantCommandSchema,
  deleteTenantCommandSchema,
  deleteTenantMenusCommandSchema,
  resetTenantPasswordCommandSchema,
  setTenantMaxMenusCommandSchema,
  setTenantMultiMenuCommandSchema,
  setTenantStatusCommandSchema,
  tenantSlugSchema,
  updateTenantCommandSchema,
} from "./contracts";

export const tenantManagement = tenantManagementService;
