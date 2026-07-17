import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { WorkspaceShell } from "@/components/sidebar/workspace-shell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const member = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id }, deletedAt: null },
    include: {
      workspace: { include: { _count: { select: { members: { where: { deletedAt: null } } } } } },
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  if (!member || member.workspace.deletedAt) notFound();

  const workspace = {
    ...member.workspace,
    role: member.role,
    memberCount: member.workspace._count.members,
  };

  return (
    <WorkspaceShell workspace={workspace} currentUser={member.user}>
      {children}
    </WorkspaceShell>
  );
}
