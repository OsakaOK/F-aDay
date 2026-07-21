import { z } from "zod";
import { getPlayerId } from "@/lib/identity";
import { GameError, submitGuess } from "@/lib/game";
import { errorResponse, stateResponse } from "@/lib/api";

const bodySchema = z.object({ cca3: z.string().length(3) });

export async function POST(request: Request) {
  const cookieId = await getPlayerId();

  let cca3: string;
  try {
    const json = await request.json();
    cca3 = bodySchema.parse(json).cca3.toUpperCase();
  } catch {
    return errorResponse("Invalid request.", 400);
  }

  try {
    await submitGuess(cookieId, cca3);
  } catch (err) {
    if (err instanceof GameError) {
      const status = err.code === "already_finished" ? 409 : 400;
      return errorResponse(err.message, status);
    }
    throw err;
  }

  return stateResponse(cookieId);
}
