import { createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import type { LoginThrottle } from "../application/ports";

const MAX_FAILURES = 5;
const WINDOW_MILLISECONDS = 60_000;
const RETENTION_MILLISECONDS = 7 * 24 * 60 * 60_000;

export class PrismaLoginThrottle implements LoginThrottle {
  constructor(private readonly client: PrismaClient) {}

  async retryAfterSeconds(key: string, now: Date): Promise<number | null> {
    const throttle = await this.client.loginThrottle.findUnique({
      where: { key: opaqueKey(key) },
      select: { blockedUntil: true },
    });
    if (!throttle?.blockedUntil || throttle.blockedUntil <= now) return null;
    return Math.max(1, Math.ceil((throttle.blockedUntil.getTime() - now.getTime()) / 1000));
  }

  async recordFailure(key: string, now: Date): Promise<void> {
    const storedKey = opaqueKey(key);
    const windowStart = new Date(now.getTime() - WINDOW_MILLISECONDS);
    const blockedUntil = new Date(now.getTime() + WINDOW_MILLISECONDS);

    await this.client.loginThrottle.deleteMany({
      where: { updatedAt: { lt: new Date(now.getTime() - RETENTION_MILLISECONDS) } },
    });

    await this.client.$executeRaw`
      INSERT INTO "LoginThrottle" (
        "key", "failures", "windowStartedAt", "blockedUntil", "updatedAt"
      ) VALUES (
        ${storedKey}, 1, ${now}, NULL, ${now}
      )
      ON CONFLICT ("key") DO UPDATE SET
        "failures" = CASE
          WHEN "LoginThrottle"."windowStartedAt" < ${windowStart} THEN 1
          ELSE "LoginThrottle"."failures" + 1
        END,
        "windowStartedAt" = CASE
          WHEN "LoginThrottle"."windowStartedAt" < ${windowStart} THEN ${now}
          ELSE "LoginThrottle"."windowStartedAt"
        END,
        "blockedUntil" = CASE
          WHEN "LoginThrottle"."blockedUntil" > ${now} THEN "LoginThrottle"."blockedUntil"
          WHEN "LoginThrottle"."windowStartedAt" < ${windowStart} THEN NULL
          WHEN "LoginThrottle"."failures" + 1 >= ${MAX_FAILURES} THEN ${blockedUntil}
          ELSE NULL
        END,
        "updatedAt" = ${now}
    `;
  }

  async reset(key: string): Promise<void> {
    await this.client.loginThrottle.deleteMany({ where: { key: opaqueKey(key) } });
  }
}

function opaqueKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
