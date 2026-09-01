import type { TenantListItem } from "../contracts";
import type { TenantActionResult } from "./actions";

export type TenantRow = TenantListItem;

export type TenantFormAction = (formData: FormData) => Promise<TenantActionResult>;

export type TenantManagerProps = {
  tenants: TenantRow[];
  createTenant: TenantFormAction;
  updateTenant: TenantFormAction;
  toggleTenant: TenantFormAction;
  resetPassword: TenantFormAction;
  deleteTenant: TenantFormAction;
};

export type PendingTenantConfirmation =
  | { type: "toggle"; tenant: TenantRow }
  | { type: "reset"; tenant: TenantRow }
  | { type: "delete"; tenant: TenantRow };
