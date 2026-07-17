import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parseBody, withErrorHandling } from "@/lib/api";
import { createWorkspaceSchema } from "@/lib/validations";
import { createWorkspace, listUserWorkspaces } from "@/services/workspace.service";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const workspaces = await listUserWorkspaces(user.id);
  return NextResponse.json({ workspaces });
});

export const POST = withErrorHandling(async (request: Request) => {
  const user = await requireUser();
  const input = await parseBody(request, createWorkspaceSchema);
  const workspace = await createWorkspace(user.id, input);
  return NextResponse.json({ workspace }, { status: 201 });
});
