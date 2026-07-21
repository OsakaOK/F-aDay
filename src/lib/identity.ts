import { cookies } from "next/headers";

export const PLAYER_COOKIE = "player_id";

/**
 * The anonymous, cookie-based player identity. The cookie is guaranteed to be
 * present by middleware (see src/middleware.ts), which sets it on first visit.
 */
export async function getPlayerId(): Promise<string> {
  const store = await cookies();
  const id = store.get(PLAYER_COOKIE)?.value;
  if (id) return id;
  // Fallback for direct API hits that somehow bypassed middleware. This id won't
  // persist (no Set-Cookie here), but it keeps request handling well-defined.
  return crypto.randomUUID();
}
