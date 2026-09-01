import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/modules/identity-access/server";
import { getServerEnv } from "@/platform/config/server-env";

function buildCSP(): string {
  const scriptSrc = "'self' 'unsafe-inline'" + (getServerEnv().NODE_ENV !== "production" ? " 'unsafe-eval'" : "");
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", buildCSP());
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

  if (getServerEnv().NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  const protectedArea = pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") || pathname.startsWith("/superadmin");
  if (!protectedArea) return response;

  const token = req.cookies.get("session")?.value;
  if (!token) return NextResponse.redirect(new URL("/admin/login", req.url));

  return verifySessionToken(token).then(
    () => {
      response.headers.set("Cache-Control", "no-store");
      return response;
    },
    () => NextResponse.redirect(new URL("/admin/login", req.url)),
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
