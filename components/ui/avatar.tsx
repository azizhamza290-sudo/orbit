"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, initials, colorFromString } from "@/lib/utils";

const AvatarRoot = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-xl", className)}
    {...props}
  />
));
AvatarRoot.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-xl bg-muted text-sm font-semibold",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

/** High-level user avatar with deterministic gradient fallback + presence dot. */
export function UserAvatar({
  user,
  className,
  showStatus = false,
}: {
  user: { name: string; image?: string | null };
  className?: string;
  showStatus?: "online" | "offline" | false;
}) {
  return (
    <div className="relative inline-block">
      <AvatarRoot className={className}>
        {user.image && <AvatarImage src={user.image} alt={user.name} />}
        <AvatarFallback
          style={{
            background: `linear-gradient(135deg, ${colorFromString(user.name)}, ${colorFromString(
              user.name + "·",
            )})`,
            color: "white",
          }}
        >
          {initials(user.name)}
        </AvatarFallback>
      </AvatarRoot>
      {showStatus && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
            showStatus === "online" ? "bg-emerald-500" : "bg-zinc-400",
          )}
        />
      )}
    </div>
  );
}

export { AvatarRoot as Avatar, AvatarImage, AvatarFallback };
