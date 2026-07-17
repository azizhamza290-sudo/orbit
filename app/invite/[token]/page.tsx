"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteInfo {
  invite: {
    workspace: { id: string; name: string; description: string | null };
    invitedBy: string;
  };
  authenticated: boolean;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          setError(body?.error ?? "Invalid invite");
          return;
        }
        setInfo(await r.json());
      })
      .catch(() => setError("Could not load invite"));
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    const res = await fetch(`/api/invites/${token}`, { method: "POST" });
    setAccepting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Could not accept invite");
      return;
    }
    const { workspace } = await res.json();
    router.push(`/w/${workspace.id}`);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <Zap className="h-5 w-5" fill="currentColor" />
        </div>

        {error ? (
          <>
            <XCircle className="mx-auto mt-6 h-10 w-10 text-destructive" />
            <h1 className="mt-3 text-xl font-bold">Invite unavailable</h1>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-6 w-full" asChild>
              <Link href="/">Go home</Link>
            </Button>
          </>
        ) : !info ? (
          <Loader2 className="mx-auto mt-6 h-8 w-8 animate-spin text-primary" />
        ) : (
          <>
            <CheckCircle2 className="mx-auto mt-6 h-10 w-10 text-emerald-500" />
            <h1 className="mt-3 text-2xl font-bold tracking-tight">
              Join {info.invite.workspace.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{info.invite.invitedBy}</span>{" "}
              invited you to collaborate on Orbit — free forever, no ads.
            </p>
            {info.invite.workspace.description && (
              <p className="mt-3 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                {info.invite.workspace.description}
              </p>
            )}
            {info.authenticated ? (
              <Button
                variant="gradient"
                className="mt-6 w-full"
                onClick={accept}
                disabled={accepting}
              >
                {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accept invitation
              </Button>
            ) : (
              <div className="mt-6 space-y-2">
                <Button variant="gradient" className="w-full" asChild>
                  <Link href={`/register?next=/invite/${token}`}>Create an account</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/login?next=/invite/${token}`}>Sign in to accept</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
