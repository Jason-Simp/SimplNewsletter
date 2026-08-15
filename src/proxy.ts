import { NextResponse, type NextRequest } from "next/server";

const mutationMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const signupAttempts = new Map<string, number[]>();

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  if (mutationMethods.has(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return NextResponse.json({ status: "error", message: "Cross-site request rejected." }, { status: 403 });
    }

    const length = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(length) && length > 6 * 1024 * 1024) {
      return NextResponse.json({ status: "error", message: "Request body is too large." }, { status: 413 });
    }
  }

  if (request.method === "POST" && request.nextUrl.pathname === "/api/auth/signup") {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const recent = (signupAttempts.get(ip) ?? []).filter((timestamp) => now - timestamp < 60 * 60 * 1000);
    if (recent.length >= 5) {
      return NextResponse.json({ status: "error", message: "Too many signup attempts. Try again later." }, { status: 429 });
    }
    recent.push(now);
    signupAttempts.set(ip, recent);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.elevenlabs.io",
    "media-src 'self' blob: https:",
    "frame-src https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/).*)"]
};
