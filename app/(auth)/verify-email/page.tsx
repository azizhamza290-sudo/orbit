"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    fetch("/api/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => setState(res.ok ? "ok" : "error"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center shadow-2xl">
      {state === "loading" && (
        <>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-bold">Verifying your email…</h1>
        </>
      )}
      {state === "ok" && (
        <>
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Email verified</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your account is fully active.</p>
          <Button variant="gradient" className="mt-6 w-full" asChild>
            <Link href="/workspaces">Continue to Orbit</Link>
          </Button>
        </>
      )}
      {state === "error" && (
        <>
          <XCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Link expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This verification link is invalid or has expired. Sign in to request a new one.
          </p>
          <Button variant="outline" className="mt-6 w-full" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}
