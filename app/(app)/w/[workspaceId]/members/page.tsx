import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { MembersView } from "@/components/members/members-view";
import { db } from "@/lib/db";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const me = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id }, deletedAt: null },
  });
  if (!me) redirect("/workspaces");

  return (
    <MembersView workspaceId={workspaceId} currentUserId={session.user.id} myRole={me.role} />
  );
}
