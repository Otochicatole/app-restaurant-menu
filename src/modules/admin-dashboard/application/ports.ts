import type { AdminDashboardView } from "../contracts";

export interface AdminDashboardReader {
  get(tenantId: string): Promise<AdminDashboardView>;
}
