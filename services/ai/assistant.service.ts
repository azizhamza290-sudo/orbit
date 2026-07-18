import { requestChatCompletion } from "./openrouter";
import type { AiChatMessage, AiContext, AiChatResult } from "./types";

const BASE_SYSTEM_PROMPT = `You are Orbit AI, a helpful assistant built into the Orbit team collaboration app.
Be concise and practical. Format responses with markdown (lists, code blocks, bold) when it helps
readability, but don't pad short answers with unnecessary structure. You cannot take actions in the
app yet (you can't send messages, create tasks, or read channel history on your own) — if asked to do
something like that, explain what you can help draft or plan instead.`;

function buildSystemPrompt(context: AiContext): string {
  const lines = [BASE_SYSTEM_PROMPT];

  const scope: string[] = [];
  if (context.workspaceName) scope.push(`workspace "${context.workspaceName}"`);
  if (context.isDirectMessage) {
    scope.push("a direct message conversation");
  } else if (context.channelName) {
    scope.push(`channel "#${context.channelName}"`);
  }

  if (scope.length > 0) {
    lines.push(`You're currently being used by ${context.userName} in the ${scope.join(", ")}.`);
  } else {
    lines.push(`You're currently being used by ${context.userName}.`);
  }

  return lines.join("\n\n");
}

/**
 * Answer a single user message, grounded in whatever context was
 * already resolved (and access-checked) by `resolveAiContext`.
 *
 * `history` is optional prior turns from the same conversation so the
 * assistant has short-term memory within a session — the caller (API
 * route) is responsible for capping its length before it gets here.
 */
export async function getAssistantReply(
  message: string,
  context: AiContext,
  history: AiChatMessage[] = [],
): Promise<AiChatResult> {
  const messages: AiChatMessage[] = [
    { role: "system", content: buildSystemPrompt(context) },
    ...history,
    { role: "user", content: message },
  ];

  const reply = await requestChatCompletion(messages);
  return { reply };
}
