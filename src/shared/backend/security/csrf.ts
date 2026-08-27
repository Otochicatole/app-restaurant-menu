import { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.APP_URL,
  process.env.NEXT_PUBLIC_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  `http://localhost:${process.env.PORT ?? 3000}`,
  `http://127.0.0.1:${process.env.PORT ?? 3000}`,
].filter(Boolean) as string[];

function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  if (process.env.NODE_ENV !== "production") return true;

  const originHost = hostOf(origin);
  if (!originHost) return false;

  if (ALLOWED_ORIGINS.some((allowed) => hostOf(allowed) === originHost)) {
    return true;
  }

  const requestHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  return requestHost != null && hostOf(`https://${requestHost}`) === originHost;
}

export function csrfErrorResponse() {
  return Response.json(
    { success: false, error: { code: "CSRF_ERROR", message: "Invalid origin" } },
    { status: 403 }
  );
}
