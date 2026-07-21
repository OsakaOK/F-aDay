import { z } from "zod";
import { getPlayerId } from "@/lib/identity";
import { castFlag, CommunityError } from "@/lib/community";
import { errorResponse, stateResponse } from "@/lib/api";

const bodySchema = z.object({
  targetType: z.enum(["hint", "fact"]),
  targetId: z.string().uuid(),
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
    await castFlag(cookieId, body.targetType, body.targetId);
  } catch (err) {
    if (err instanceof CommunityError) {
      const status = err.code === "not_eligible" ? 403 : err.code === "not_found" ? 404 : 400;
      return errorResponse(err.message, status);
    }
    throw err;
  }

  return stateResponse(cookieId);
}
