import { z } from "zod";
import { getPlayerId } from "@/lib/identity";
import { castVote, CommunityError } from "@/lib/community";
import { errorResponse, stateResponse } from "@/lib/api";

const bodySchema = z.object({
  targetType: z.enum(["hint", "fact"]),
  targetId: z.string().uuid(),
  value: z.enum(["up", "down"]),
});

export async function POST(request: Request) {
  const cookieId = await getPlayerId();

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return errorResponse("Invalid request.", 400);
  }

  try {
    await castVote(cookieId, body.targetType, body.targetId, body.value);
  } catch (err) {
    if (err instanceof CommunityError) {
      const status = err.code === "not_eligible" ? 403 : err.code === "not_found" ? 404 : 400;
      return errorResponse(err.message, status);
    }
    throw err;
  }

  return stateResponse(cookieId);
}
