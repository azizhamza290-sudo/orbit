import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { slugify, randomToken } from "@/lib/utils";
import type { WorkspaceRole } from "@prisma/client";
import type { CreateWorkspaceInput } from "@/lib/validations";

const ROLE_RANK: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MODERATOR: 2,
  MEMBER: 1,
};

/** Get a member's role in a workspace, or null. */
export async function getMembership(workspaceId: string, userId: string) {
  return db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId }, deletedAt: null },
  });
}

/** Require at least `minRole` in the workspace; throws 403/404 otherwise. */
export async function requireRole(
  workspaceId: string,
  userId: string,
  minRole: WorkspaceRole = "MEMBER",
) {
  const member = await getMembership(workspaceId, userId);
  if (!member) throw new HttpError(404, "Workspace not found");
  if (ROLE_RANK[member.role] < ROLE_RANK[minRole]) {
    throw new HttpError(403, "You don't have permission to do that");
  }
  return member;
}

export async function listUserWorkspaces(userId: string) {
  const memberships = await db.workspaceMember.findMany({
    where: { userId, deletedAt: null, workspace: { deletedAt: null } },
    include: {
      workspace: { include: { _count: { select: { members: { where: { deletedAt: null } } } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
    memberCount: m.workspace._count.members,
  }));
}

export async function createWorkspace(userId: string, input: CreateWorkspaceInput) {
  const base = slugify(input.name) || "workspace";
  let slug = base;
  let attempt = 0;
  while (await db.workspace.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${randomToken(3).slice(0, 4)}`;
    if (attempt > 5) throw new HttpError(409, "Could not generate a unique workspace URL");
  }

  return db.workspace.create({
    data: {
      name: input.name,
      description: input.description,
      slug,
      ownerId: userId,
      members: { create: { userId, role: "OWNER" } },
      channels: {
        create: [
          {
            name: "general",
            topic: "Company-wide announcements",
            createdById: userId,
            members: { create: { userId } },
          },
          {
            name: "random",
            topic: "Off-topic fun",
            createdById: userId,
            members: { create: { userId } },
          },
        ],
      },
    },
  });
}

export async function createInvite(
  workspaceId: string,
  createdById: string,
  email: string | undefined,
  role: WorkspaceRole,
) {
  return db.workspaceInvite.create({
    data: {
      workspaceId,
      createdById,
      email,
      role,
      token: randomToken(24),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });
}

export async function acceptInvite(token: string, userId: string) {
  const invite = await db.workspaceInvite.findUnique({
    where: { token },
    include: { workspace: true },
  });
  if (!invite || invite.acceptedAt) throw new HttpError(404, "Invite not found or already used");
  if (invite.expiresAt < new Date()) throw new HttpError(410, "This invite has expired");

  const existing = await getMembership(invite.workspaceId, userId);

  const [member] = await db.$transaction([
    db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
      update: { deletedAt: null, role: existing?.role ?? invite.role },
      create: { workspaceId: invite.workspaceId, userId, role: invite.role },
    }),
    db.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  // Auto-join public channels.
  const publicChannels = await db.channel.findMany({
    where: { workspaceId: invite.workspaceId, type: "PUBLIC", isArchived: false, deletedAt: null },
    select: { id: true },
  });
  if (publicChannels.length) {
    await db.channelMember.createMany({
      data: publicChannels.map((c) => ({ channelId: c.id, userId })),
      skipDuplicates: true,
    });
  }

  return { member, workspace: invite.workspace };
}
