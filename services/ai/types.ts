// ─────────────────────────────────────────────────────────────
// Orbit AI — shared types
// Kept separate from `types/index.ts` (Prisma-model-derived types)
// since these describe the AI request/response contract, not
// database entities.
// ─────────────────────────────────────────────────────────────

export type AiRole = "system" | "user" | "assistant";

export interface AiChatMessage {
  role: AiRole;
  content: string;
}

/**
 * Raw context identifiers the client may send. These are just IDs —
 * the server resolves them against the database and checks the
 * requesting user actually has access before any of it reaches a
 * prompt. Never trust names/content supplied directly by the client.
 */
export interface AiContextInput {
  workspaceId?: string;
  channelId?: string;
  conversationId?: string;
}

/**
 * Safe, server-resolved context, built by `resolveAiContext`. Only
 * display-safe fields end up here — no message content, no member
 * lists, nothing that wasn't already verified as visible to the
 * requesting user.
 */
export interface AiContext {
  userName: string;
  workspaceName?: string;
  channelName?: string;
  isDirectMessage?: boolean;
}

export interface AiChatResult {
  reply: string;
}
