import { checkReadiness } from "@/platform/health/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await checkReadiness();
  return Response.json(result, {
    status: result.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
