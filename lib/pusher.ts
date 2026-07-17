import Pusher from "pusher";

/**
 * Server-side Pusher client. Instantiated lazily so builds succeed
 * even when env vars are not yet configured (e.g. CI type-checks).
 */
let _pusher: Pusher | null = null;

export function getPusher(): Pusher | null {
  if (_pusher) return _pusher;
  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET) return null;
  _pusher = new Pusher({
    appId: PUSHER_APP_ID,
    key: PUSHER_KEY,
    secret: PUSHER_SECRET,
    cluster: PUSHER_CLUSTER || "eu",
    useTLS: true,
  });
  return _pusher;
}

/** Fire-and-forget trigger that never breaks the request. */
export async function trigger(
  channels: string | string[],
  event: string,
  payload: unknown,
) {
  try {
    const pusher = getPusher();
    if (!pusher) return;
    await pusher.trigger(channels, event, payload);
  } catch (error) {
    console.error("[pusher] trigger failed:", error);
  }
}

// ── Channel naming helpers ──────────────────────────────────
export const pusherChannels = {
  workspace: (workspaceId: string) => `private-workspace-${workspaceId}`,
  channel: (channelId: string) => `private-channel-${channelId}`,
  user: (userId: string) => `private-user-${userId}`,
  presence: (workspaceId: string) => `presence-workspace-${workspaceId}`,
};

// ── Event names ─────────────────────────────────────────────
export const pusherEvents = {
  messageNew: "message:new",
  messageUpdate: "message:update",
  messageDelete: "message:delete",
  reactionUpdate: "reaction:update",
  typing: "typing",
  notification: "notification",
  channelUpdate: "channel:update",
  memberUpdate: "member:update",
};
