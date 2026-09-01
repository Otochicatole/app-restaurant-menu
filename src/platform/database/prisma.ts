import { getServerEnv } from "@/platform/config/server-env";
import { createSqlitePrismaClient, type SqlitePrismaClient } from "./sqlite-client";

const env = getServerEnv();
const globalForPrisma = globalThis as unknown as { restaurantMenuPrisma?: SqlitePrismaClient };

export const prisma = globalForPrisma.restaurantMenuPrisma ?? createSqlitePrismaClient(env.DATABASE_URL);

if (env.NODE_ENV !== "production") {
  globalForPrisma.restaurantMenuPrisma = prisma;
}
