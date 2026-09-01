import "server-only";

import { tenantManagementService } from "./infrastructure/composition";

export {
  createTenantAction,
  deleteTenantAction,
  resetTenantPasswordAction,
  setTenantStatusAction,
  updateTenantAction,
} from "./presentation/actions";
export type { TenantActionResult } from "./presentation/actions";

export type {
  ActiveTenant,
  CreateTenantCommand,
  CreatedTenant,
  DeleteTenantCommand,
  SetTenantStatusCommand,
  TenantListItem,
  TenantStatus,
  UpdateTenantCommand,
} from "./contracts";
export {
  createTenantCommandSchema,
  deleteTenantCommandSchema,
  resetTenantPasswordCommandSchema,
  setTenantStatusCommandSchema,
  tenantSlugSchema,
  updateTenantCommandSchema,
} from "./contracts";

export const tenantManagement = tenantManagementService;
