import { errorResponse } from "@/platform/http/api-response";
import { getServerEnv } from "@/platform/config/server-env";

type RequestWithHeaders = Pick<Request, "headers">;

export function validateOrigin(request: RequestWithHeaders): boolean {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") return false;

  const origin = normalizeOrigin(request.headers.get("origin"));
  if (!origin) return fetchSite === "same-origin";

  return allowedOrigins(request).has(origin);
}

export function csrfErrorResponse() {
  return errorResponse("CSRF_ERROR", "Invalid request origin", 403);
}

function allowedOrigins(request: RequestWithHeaders): Set<string> {
  const env = getServerEnv();
  const origins = new Set<string>();
  const configured = [
    env.APP_URL,
    process.env.NEXT_PUBLIC_URL,
    hostUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL, "https"),
    hostUrl(process.env.VERCEL_URL, "https"),
  ];
  for (const value of configured) {
    const origin = normalizeOrigin(value ?? null);
    if (origin) origins.add(origin);
  }

  const host = request.headers.get("host");
  if (env.NODE_ENV !== "production" && host && isValidHostHeader(host)) {
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
    const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : "http";
    origins.add(`${protocol}://${host.toLowerCase()}`);
  }

  if (env.NODE_ENV !== "production") {
    const port = process.env.PORT ?? "3000";
    origins.add(`http://localhost:${port}`);
    origins.add(`http://127.0.0.1:${port}`);
  }
  return origins;
}

function normalizeOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin.toLowerCase();
  } catch {
    return null;
  }
}

function hostUrl(host: string | undefined, protocol: "https"): string | undefined {
  return host ? `${protocol}://${host}` : undefined;
}

function isValidHostHeader(host: string): boolean {
  return /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host);
}
