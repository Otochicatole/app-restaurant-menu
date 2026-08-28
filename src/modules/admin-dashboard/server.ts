import "server-only";

import { createGetAdminDashboard } from "./application/get-admin-dashboard";
import { PrismaAdminDashboardReader } from "./infrastructure/prisma-admin-dashboard-reader";

export type { AdminDashboardView } from "./contracts";
export const getAdminDashboard = createGetAdminDashboard(new PrismaAdminDashboardReader());
