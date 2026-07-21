import { z } from "zod";
import { getPlayerId } from "@/lib/identity";
import { CommunityError, submitHint } from "@/lib/community";
import { errorResponse, stateResponse } from "@/lib/api";

const bodySchema = z.object({ text: z.string() });

export async function POST(request: Request) {
  const cookieId = await getPlayerId();

  let text: string;
  try {
    text = bodySchema.parse(await request.json()).text;
  } catch {
    return errorResponse("Invalid request.", 400);
  }

  try {
    await submitHint(cookieId, text);
  } catch (err) {
    if (err instanceof CommunityError) {
      const status = err.code === "not_eligible" ? 403 : err.code === "already_submitted" ? 409 : 400;
      return errorResponse(err.message, status);
    }
    throw err;
  }

  return stateResponse(cookieId, 201);
}
