import { db } from "@/lib/db";
import { requireRole } from "@/services/workspace.service";
import type { SearchResults } from "@/types";

/** Workspace-wide search across messages, channels, members and files. */
export async function searchWorkspace(
  workspaceId: string,
  userId: string,
  query: string,
  type: "all" | "messages" | "channels" | "members" | "files",
  limit = 20,
): Promise<SearchResults> {
  await requireRole(workspaceId, userId, "MEMBER");
  const q = query.trim();

  const [messages, channels, members, files] = await Promise.all([
    type === "all" || type === "messages"
      ? db.message.findMany({
          where: {
            deletedAt: null,
            content: { contains: q, mode: "insensitive" },
            channel: {
              workspaceId,
              deletedAt: null,
              OR: [{ type: "PUBLIC" }, { members: { some: { userId } } }],
            },
          },
          include: {
            author: { select: { id: true, name: true, image: true } },
            channel: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : Promise.resolve([]),
    type === "all" || type === "channels"
      ? db.channel.findMany({
          where: {
            workspaceId,
            deletedAt: null,
            type: { not: "DM" },
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
              { topic: { contains: q, mode: "insensitive" } },
            ],
          },
          take: limit,
        })
      : Promise.resolve([]),
    type === "all" || type === "members"
      ? db.workspaceMember
          .findMany({
            where: {
              workspaceId,
              deletedAt: null,
              user: {
                deletedAt: null,
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              },
            },
            include: { user: { select: { id: true, name: true, image: true } } },
            take: limit,
          })
          .then((rows) => rows.map((r) => r.user))
      : Promise.resolve([]),
    type === "all" || type === "files"
      ? db.attachment.findMany({
          where: {
            name: { contains: q, mode: "insensitive" },
            message: {
              deletedAt: null,
              channel: {
                workspaceId,
                OR: [{ type: "PUBLIC" }, { members: { some: { userId } } }],
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        })
      : Promise.resolve([]),
  ]);

  return {
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      channelId: m.channel.id,
      channelName: m.channel.name,
      author: m.author,
      createdAt: m.createdAt.toISOString(),
    })),
    channels: channels.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      type: c.type,
    })),
    members,
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      url: f.url,
      mimeType: f.mimeType,
      size: f.size,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}
