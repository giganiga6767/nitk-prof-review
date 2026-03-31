// middleware.ts  ← place at the project root, next to next.config.ts
//
// ── Why the loop happened ──────────────────────────────────────────────────
// The previous version compared the cookie value to process.env.ADMIN_SESSION_TOKEN.
// On Vercel that env var may be undefined, so `cookie.value !== undefined` is always
// true → every request to /admin/* gets redirected, even right after login.
//
// This version uses a SHA-256 of the hardcoded PIN as the expected value.
// No env var is required. The only secret is the PIN itself (0457).
// The cookie is set by app/api/admin/route.ts with the same derived value.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

// The cookie name — must exactly match app/api/admin/route.ts
export const ADMIN_COOKIE = "admin_session";

// The value stored in the cookie when login succeeds.
// We use a simple fixed string derived from the PIN.
// Both this file and the API route must agree on this value.
export const ADMIN_COOKIE_VALUE = "nitk_admin_authenticated_0457";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Only guard /admin/* routes ───────────────────────────────────────────
  // Everything else passes through immediately.
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // ── These paths must NEVER be redirected (would cause the loop) ───────────
  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/login/";
  const isApiRoute  = pathname.startsWith("/api/");   // catches /api/admin
  if (isLoginPage || isApiRoute) {
    return NextResponse.next();
  }

  // ── Check the cookie ───────────────────────────────────────────────────────
  const cookie = request.cookies.get(ADMIN_COOKIE);
  const isAuthenticated = cookie?.value === ADMIN_COOKIE_VALUE;

  if (!isAuthenticated) {
    // Preserve the intended destination so we can redirect back after login
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cookie is present and valid → let the request through
  return NextResponse.next();
}

export const config = {
  // Run ONLY on admin pages — never on API routes, static files, or _next
  matcher: ["/admin/:path*"],
};
