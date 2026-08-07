import { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_URL,
  `http://localhost:${process.env.PORT ?? 3000}`,
  `http://127.0.0.1:${process.env.PORT ?? 3000}`,
].filter(Boolean) as string[];

export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  if (process.env.NODE_ENV !== "production") return true;

  return ALLOWED_ORIGINS.some((allowed) => {
    try {
      const originUrl = new URL(origin);
      const allowedUrl = new URL(allowed);
      return originUrl.host === allowedUrl.host;
    } catch {
      return false;
    }
  });
}

export function csrfErrorResponse() {
  return Response.json(
    { success: false, error: { code: "CSRF_ERROR", message: "Invalid origin" } },
    { status: 403 }
  );
}
