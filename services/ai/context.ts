import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { requireRole } from "@/services/workspace.service";
import type { AiContext, AiContextInput } from "./types";

/**
 * Turn client-supplied IDs into safe, display-only context for the AI
 * prompt. Every ID is checked against the requesting user's actual
 * access before anything derived from it is used — a workspace or
 * channel name never reaches the model unless the user can already
 * see it via existing permission checks (`requireRole`, membership
 * lookups). No message content is pulled in here; that's Phase 2.
 */
export async function resolveAiContext(
  userId: string,
  userName: string,
  input: AiContextInput | undefined,
): Promise<AiContext> {
  const context: AiContext = { userName };
  if (!input) return context;

  if (input.workspaceId) {
    // Throws 404/403 if the user isn't a member — same guarantee every
    // other workspace-scoped route relies on.
    await requireRole(input.workspaceId, userId, "MEMBER");

    const workspace = await db.workspace.findUnique({
      where: { id: input.workspaceId },
      select: { name: true },
    });
    context.workspaceName = workspace?.name;
  }

  if (input.channelId) {
    const channel = await db.channel.findFirst({
      where: {
        id: input.channelId,
        deletedAt: null,
        // Visible if it's public, or the user is an explicit member —
        // mirrors the access rule used in listChannels/listMessages.
        OR: [{ type: "PUBLIC" }, { members: { some: { userId } } }],
        ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
      },
      select: { name: true, type: true },
    });

    if (!channel) {
      throw new HttpError(404, "Channel not found");
    }

    context.isDirectMessage = channel.type === "DM";
    context.channelName = channel.name ?? undefined;
  }

  if (input.conversationId && !input.channelId) {
    // A DM conversation is just a Channel of type DM — same check.
    const conversation = await db.channel.findFirst({
      where: {
        id: input.conversationId,
        type: "DM",
        deletedAt: null,
        members: { some: { userId } },
      },
      select: { id: true },
    });

    if (!conversation) {
      throw new HttpError(404, "Conversation not found");
    }

    context.isDirectMessage = true;
  }

  return context;
}
