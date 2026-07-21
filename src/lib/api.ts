import { NextResponse } from "next/server";
import { getGameState } from "./game";

/** Standard success payload: always returns the fresh full game state. */
export async function stateResponse(cookieId: string, status = 200) {
  const state = await getGameState(cookieId);
  return NextResponse.json({ ok: true, state }, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}
