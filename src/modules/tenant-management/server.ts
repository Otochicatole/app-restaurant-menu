import "server-only";

import { tenantManagementService } from "./infrastructure/composition";

export {
  createTenantAction,
  deleteTenantAction,
  deleteTenantMenusAction,
  resetTenantPasswordAction,
  setTenantLandingAction,
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
  SetTenantLandingCommand,
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
  setTenantLandingCommandSchema,
  setTenantMaxMenusCommandSchema,
  setTenantMultiMenuCommandSchema,
  setTenantStatusCommandSchema,
  tenantSlugSchema,
  updateTenantCommandSchema,
} from "./contracts";

export const tenantManagement = tenantManagementService;
