import { getServerEnv } from "@/platform/config/server-env";
import { createSqlitePrismaClient, type SqlitePrismaClient } from "./sqlite-client";

const CURRENT_SCHEMA_GENERATION = 6;
const env = getServerEnv();
const globalForPrisma = globalThis as unknown as { restaurantMenuPrisma?: SqlitePrismaClient & { _generation?: number } };

const cachedClient = globalForPrisma.restaurantMenuPrisma;
const hasLatestDelegates =
  Boolean(cachedClient) &&
  cachedClient?._generation === CURRENT_SCHEMA_GENERATION &&
  typeof cachedClient?.landingCustomModule !== "undefined" &&
  typeof cachedClient?.landingTemplate !== "undefined" &&
  typeof cachedClient?.tableReservation !== "undefined" &&
  typeof cachedClient?.restaurantStaffMember !== "undefined";

export const prisma =
  hasLatestDelegates && cachedClient
    ? cachedClient
    : createSqlitePrismaClient(env.DATABASE_URL);

if (env.NODE_ENV !== "production") {
  (prisma as { _generation?: number })._generation = CURRENT_SCHEMA_GENERATION;
  globalForPrisma.restaurantMenuPrisma = prisma;
}
