import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseBody, withErrorHandling } from "@/lib/api";
import { listNotifications, markNotificationsRead } from "@/services/notification.service";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const data = await listNotifications(user.id);
  return NextResponse.json(data);
});

const markSchema = z.object({ ids: z.array(z.string().uuid()).optional() });

export const PATCH = withErrorHandling(async (request: Request) => {
  const user = await requireUser();
  const { ids } = await parseBody(request, markSchema);
  await markNotificationsRead(user.id, ids);
  return NextResponse.json({ ok: true });
});
