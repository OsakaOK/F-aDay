import { NextResponse, type NextRequest } from "next/server";
import { PLAYER_COOKIE } from "@/lib/identity";

const ONE_YEAR = 60 * 60 * 24 * 400; // ~400 days

/**
 * Ensures every visitor has a stable, anonymous `player_id` cookie (no accounts,
 * no signup). Sets it on first visit and injects it into the current request so
 * server components/handlers see it on that same render.
 */
export function middleware(request: NextRequest) {
  const existing = request.cookies.get(PLAYER_COOKIE)?.value;
  const id = existing ?? crypto.randomUUID();

  // Make the id visible to this request's server code immediately.
  request.cookies.set(PLAYER_COOKIE, id);
  const response = NextResponse.next({ request });

  if (!existing) {
    response.cookies.set(PLAYER_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: ONE_YEAR,
      path: "/",
    });
  }

  return response;
}

export const config = {
  // Run on everything except static assets and image optimizer output.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
