import { prisma } from "@/shared/backend/database/prisma";
import { STORAGE_DIR } from "@/shared/backend/storage";
import { promises as fs } from "fs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await fs.access(STORAGE_DIR);
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "degraded" }, { status: 503 });
  }
}
