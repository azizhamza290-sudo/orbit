"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Hash, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { mutate } from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(40)
    .regex(/^[a-z0-9-_]+$/, "Lowercase letters, numbers, dashes and underscores only"),
  description: z.string().max(300).optional(),
  isPrivate: z.boolean().default(false),
});
type FormValues = z.infer<typeof schema>;

export function CreateChannelDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isPrivate: false },
  });

  const isPrivate = watch("isPrivate");

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const res = await fetch(`/api/workspaces/${workspaceId}/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        description: values.description,
        type: values.isPrivate ? "PRIVATE" : "PUBLIC",
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setServerError(body?.error ?? "Could not create channel");
      return;
    }
    const { channel } = await res.json();
    toast.success(`#${channel.name} created`);
    mutate(`/api/workspaces/${workspaceId}/channels`);
    reset();
    onOpenChange(false);
    router.push(`/w/${workspaceId}/channels/${channel.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>
            Channels are where conversations happen around a topic.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="channel-name">Name</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="channel-name" placeholder="product-updates" className="pl-9" {...register("name")} />
            </div>
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="channel-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="channel-desc" placeholder="What is this channel about?" {...register("description")} />
          </div>
          <div className="flex items-center justify-between rounded-xl border p-3.5">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", isPrivate ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground")}>
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Private channel</p>
                <p className="text-xs text-muted-foreground">Only invited members can see it</p>
              </div>
            </div>
            <Switch checked={isPrivate} onCheckedChange={(v) => setValue("isPrivate", v)} />
          </div>
          {serverError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
          )}
          <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create channel
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
