import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-lg bg-muted animate-pulse", className)}
      {...props}
    />
  );
}

/** Ready-made skeleton for the message list. */
export function MessageListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-5 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3" style={{ opacity: 1 - i * 0.12 }}>
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-[70%]" />
            {i % 2 === 0 && <Skeleton className="h-3.5 w-[45%]" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export { Skeleton };
