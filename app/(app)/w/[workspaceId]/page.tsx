import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function WorkspaceIndexPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Prefer #general, else the first visible channel.
  const channel = await db.channel.findFirst({
    where: {
      workspaceId,
      deletedAt: null,
      isArchived: false,
      type: { not: "DM" },
      OR: [{ type: "PUBLIC" }, { members: { some: { userId: session.user.id } } }],
    },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
  });

  if (channel) redirect(`/w/${workspaceId}/channels/${channel.id}`);
  redirect(`/w/${workspaceId}/members`);
}
