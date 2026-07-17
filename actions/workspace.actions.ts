"use server";

/**
 * Server Actions for mutations that are more ergonomic as direct
 * function calls than fetch() round-trips. All actions re-validate
 * the caller's session server-side.
 */
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createWorkspaceSchema, createChannelSchema } from "@/lib/validations";
import { createWorkspace } from "@/services/workspace.service";
import { createChannel } from "@/services/channel.service";
import { trigger, pusherChannels, pusherEvents } from "@/lib/pusher";

export async function createWorkspaceAction(input: unknown) {
  const user = await requireUser();
  const parsed = createWorkspaceSchema.parse(input);
  const workspace = await createWorkspace(user.id, parsed);
  revalidatePath("/workspaces");
  return { id: workspace.id, slug: workspace.slug };
}

export async function createChannelAction(workspaceId: string, input: unknown) {
  const user = await requireUser();
  const parsed = createChannelSchema.parse(input);
  const channel = await createChannel(workspaceId, user.id, parsed);
  await trigger(pusherChannels.workspace(workspaceId), pusherEvents.channelUpdate, {
    type: "channel:created",
    channelId: channel.id,
  });
  revalidatePath(`/w/${workspaceId}`);
  return { id: channel.id };
}
