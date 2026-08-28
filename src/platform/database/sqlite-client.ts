import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/generated/prisma/client";
import { assertLocalSqliteUrl } from "@/platform/config/sqlite-url";

export type SqlitePrismaClient = PrismaClient;

export function createSqlitePrismaClient(databaseUrl: string): PrismaClient {
  assertLocalSqliteUrl(databaseUrl);
  const adapter = new PrismaLibSql({ url: databaseUrl.trim(), timeout: 5_000 });
  return new PrismaClient({ adapter });
}
