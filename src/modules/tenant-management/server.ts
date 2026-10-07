import "server-only";

import { tenantManagementService } from "./infrastructure/composition";

export {
  createTenantAction,
  deleteTenantAction,
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
  SetTenantMaxMenusCommand,
  SetTenantMultiMenuCommand,
  SetTenantStatusCommand,
  TenantListItem,
  TenantStatus,
  UpdateTenantCommand,
} from "./contracts";
export {
  createTenantCommandSchema,
  deleteTenantCommandSchema,
  resetTenantPasswordCommandSchema,
  setTenantMaxMenusCommandSchema,
  setTenantMultiMenuCommandSchema,
  setTenantStatusCommandSchema,
  tenantSlugSchema,
  updateTenantCommandSchema,
} from "./contracts";

export const tenantManagement = tenantManagementService;
