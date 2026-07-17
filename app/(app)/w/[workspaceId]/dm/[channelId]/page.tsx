import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatView } from "@/components/chat/chat-view";

export default async function DirectMessagePage({
  params,
}: {
  params: Promise<{ workspaceId: string; channelId: string }>;
}) {
  const { workspaceId, channelId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const channel = await db.channel.findFirst({
    where: {
      id: channelId,
      workspaceId,
      type: "DM",
      deletedAt: null,
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });
  if (!channel) notFound();

  const other = channel.members.find((m) => m.userId !== session.user.id)?.user ?? null;
  const { members: _m, ...rest } = channel;

  return (
    <ChatView
      channel={{ ...rest, otherMember: other }}
      workspaceId={workspaceId}
      currentUserId={session.user.id}
    />
  );
}
