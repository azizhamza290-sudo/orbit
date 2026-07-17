import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-7xl font-extrabold tracking-tight text-gradient">404</p>
      <h1 className="text-xl font-semibold">This page drifted out of orbit</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The link may be broken, or the page may have been moved or deleted.
      </p>
      <Button variant="gradient" asChild>
        <Link href="/workspaces">Back to your workspaces</Link>
      </Button>
    </div>
  );
}
