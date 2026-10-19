import { getServerEnv } from "@/platform/config/server-env";
import { createSqlitePrismaClient, type SqlitePrismaClient } from "./sqlite-client";

const env = getServerEnv();
const globalForPrisma = globalThis as unknown as { restaurantMenuPrisma?: SqlitePrismaClient };

const cachedClient = globalForPrisma.restaurantMenuPrisma;
const hasLatestDelegates =
  Boolean(cachedClient) &&
  typeof cachedClient?.landingCustomModule !== "undefined" &&
  typeof cachedClient?.landingTemplate !== "undefined";

export const prisma =
  hasLatestDelegates && cachedClient
    ? cachedClient
    : createSqlitePrismaClient(env.DATABASE_URL);

if (env.NODE_ENV !== "production") {
  globalForPrisma.restaurantMenuPrisma = prisma;
}

