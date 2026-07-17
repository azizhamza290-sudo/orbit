import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withErrorHandling } from "@/lib/api";
import { searchSchema } from "@/lib/validations";
import { searchWorkspace } from "@/services/search.service";

export const GET = withErrorHandling(
  async (request: Request, ctx: { params: Promise<{ workspaceId: string }> }) => {
    const { workspaceId } = await ctx.params;
    const user = await requireUser();

    const { searchParams } = new URL(request.url);
    const { q, type, limit } = searchSchema.parse({
      q: searchParams.get("q") ?? "",
      type: searchParams.get("type") ?? "all",
      limit: searchParams.get("limit") ?? undefined,
    });

    const results = await searchWorkspace(workspaceId, user.id, q, type, limit);
    return NextResponse.json(results);
  },
);
