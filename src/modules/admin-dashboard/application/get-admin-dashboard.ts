import { z } from "zod";
import type { AdminDashboardReader } from "./ports";

export function createGetAdminDashboard(reader: AdminDashboardReader) {
  return (tenantId: string) => reader.get(z.string().min(1).parse(tenantId));
}
