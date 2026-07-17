import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { listUserWorkspaces } from "@/services/workspace.service";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspaces = await listUserWorkspaces(session.user.id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your workspaces</h1>
          <p className="mt-1 text-muted-foreground">
            Jump back in, or spin up a new space for your team.
          </p>
        </div>
        <Button variant="gradient" asChild>
          <Link href="/workspaces/new">
            <Plus className="mr-1 h-4 w-4" /> New workspace
          </Link>
        </Button>
      </div>

      {workspaces.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-3xl border border-dashed py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No workspaces yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first workspace and invite your team — it takes less than a minute.
          </p>
          <Button variant="gradient" className="mt-6" asChild>
            <Link href="/workspaces/new">Create a workspace</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {workspaces.map((w) => (
            <Link
              key={w.id}
              href={`/w/${w.id}`}
              className="group flex items-center gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
                {w.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{w.name}</p>
                <p className="text-sm text-muted-foreground">
                  {w.memberCount} {w.memberCount === 1 ? "member" : "members"} · {w.role.toLowerCase()}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
