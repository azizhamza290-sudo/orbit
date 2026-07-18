import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { apiError, parseBody, withErrorHandling } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { aiChatSchema } from "@/lib/validations";
import { resolveAiContext } from "@/services/ai/context";
import { getAssistantReply } from "@/services/ai/assistant.service";

export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser();

  // AI calls are more expensive than a regular API request (upstream
  // cost + latency), so this gets its own, tighter bucket rather than
  // sharing the general message rate limit.
  const { success } = rateLimit(`ai:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!success) {
    return apiError(429, "You're sending messages to the AI assistant too fast");
  }

  const input = await parseBody(request, aiChatSchema);

  // Every ID in `context` is verified against the user's actual access
  // inside resolveAiContext — throws 403/404 if they don't have it.
  const context = await resolveAiContext(user.id, user.name, input.context);

  const result = await getAssistantReply(input.message, context, input.history);
  return NextResponse.json(result);
});
