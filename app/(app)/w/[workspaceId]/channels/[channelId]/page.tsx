import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatView } from "@/components/chat/chat-view";

export default async function ChannelPage({
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
      deletedAt: null,
      type: { not: "DM" },
      OR: [{ type: "PUBLIC" }, { members: { some: { userId: session.user.id } } }],
    },
  });
  if (!channel) notFound();

  return (
    <ChatView channel={channel} workspaceId={workspaceId} currentUserId={session.user.id} />
  );
}
