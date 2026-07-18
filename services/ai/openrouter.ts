import { HttpError } from "@/lib/api";
import type { AiChatMessage } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// A capable free-tier model by default so the feature works with zero
// spend out of the box. Override with OPENROUTER_MODEL for a paid model.
const DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free";

/** Read + validate the API key lazily (per-request), never at module load. */
function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    // Log detail server-side only; never leak "which env var" to the client.
    console.error("[ai] OPENROUTER_API_KEY is not set");
    throw new HttpError(503, "The AI assistant isn't configured yet.");
  }
  return key;
}

export interface OpenRouterChatOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Send a chat completion request to OpenRouter and return the assistant's
 * reply text. Throws HttpError for any failure mode (missing key, upstream
 * error, malformed response) so route handlers can rely on withErrorHandling.
 */
export async function requestChatCompletion(
  messages: AiChatMessage[],
  options: OpenRouterChatOptions = {},
): Promise<string> {
  const apiKey = getApiKey();
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // OpenRouter uses these for its optional public rankings; harmless
        // if the app URL isn't set, and never exposes anything sensitive.
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://orbit.app",
        "X-Title": "Orbit AI",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.5,
        max_tokens: options.maxTokens ?? 800,
      }),
    });
  } catch (error) {
    console.error("[ai] OpenRouter request failed:", error);
    throw new HttpError(502, "Couldn't reach the AI provider. Please try again.");
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[ai] OpenRouter returned ${response.status}:`, body);

    if (response.status === 401) {
      throw new HttpError(503, "The AI assistant isn't configured correctly.");
    }
    if (response.status === 429) {
      throw new HttpError(429, "The AI assistant is busy. Please try again shortly.");
    }
    throw new HttpError(502, "The AI assistant couldn't process that request.");
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    console.error("[ai] Failed to parse OpenRouter response:", error);
    throw new HttpError(502, "Received an unexpected response from the AI provider.");
  }

  const reply = extractReplyText(data);
  if (!reply) {
    console.error("[ai] OpenRouter response had no content:", JSON.stringify(data).slice(0, 500));
    throw new HttpError(502, "The AI assistant didn't return a response.");
  }

  return reply;
}

function extractReplyText(data: unknown): string | null {
  if (
    typeof data === "object" &&
    data !== null &&
    "choices" in data &&
    Array.isArray((data as { choices: unknown[] }).choices)
  ) {
    const first = (data as { choices: Array<{ message?: { content?: string } }> }).choices[0];
    const content = first?.message?.content;
    if (typeof content === "string" && content.trim().length > 0) {
      return content.trim();
    }
  }
  return null;
}
