// app/api/admin/route.ts
//
// ── Cookie contract ────────────────────────────────────────────────────────
// Name:     admin_session          (matches ADMIN_COOKIE in middleware.ts)
// Value:    nitk_admin_authenticated_0457  (matches ADMIN_COOKIE_VALUE)
// Path:     /                      (must be "/" so it's sent for ALL routes
//                                   including /admin/dashboard.
//                                   Using path:"/admin" would NOT be sent
//                                   when the middleware first checks on a
//                                   redirect-landing, causing a loop.)
// HttpOnly: true                   (JS cannot read it — XSS safe)
// SameSite: lax                    (works on same-origin navigation)
// Secure:   true in production      (HTTPS only on Vercel)
// ──────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_COOKIE_VALUE } from "@/middleware";

const CORRECT_PIN    = "0457";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

// POST /api/admin  —  verify PIN, set session cookie
export async function POST(request: NextRequest) {
  let pin: string | undefined;

  try {
    const body = await request.json();
    pin = body?.pin;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!pin || pin.trim() !== CORRECT_PIN) {
    return NextResponse.json({ success: false, error: "Incorrect PIN." }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set(ADMIN_COOKIE, ADMIN_COOKIE_VALUE, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",            // ← "/" not "/admin" — see note above
    maxAge:   COOKIE_MAX_AGE,
  });

  return response;
}

// DELETE /api/admin  —  clear the session cookie (logout)
export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   0,              // immediate expiry
  });

  return response;
}
