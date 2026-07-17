"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateWorkspaceSchema } from "@/lib/validations";
import type { WorkspaceWithRole } from "@/types";

type FormValues = z.infer<typeof updateWorkspaceSchema>;

export default function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceWithRole | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(updateWorkspaceSchema) });

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}`)
      .then((r) => r.json())
      .then(({ workspace }) => {
        setWorkspace(workspace);
        reset({
          name: workspace.name,
          description: workspace.description ?? "",
        });
      });
  }, [workspaceId, reset]);

  const onSubmit = async (values: FormValues) => {
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      toast.success("Workspace updated");
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Could not update workspace");
    }
  };

  const deleteWorkspace = async () => {
    setDeleting(true);
    const res = await fetch(`/api/workspaces/${workspaceId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) {
      toast.success("Workspace deleted");
      router.push("/workspaces");
    } else {
      toast.error("Could not delete workspace");
    }
  };

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isOwner = workspace.role === "OWNER";

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Workspace settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Manage how {workspace.name} looks and feels.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Name</Label>
            <Input id="ws-name" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-desc">Description</Label>
            <Textarea id="ws-desc" rows={3} {...register("description")} />
          </div>
          <div className="space-y-1.5">
            <Label>Workspace URL</Label>
            <Input value={`orbit.app/${workspace.slug}`} readOnly className="font-mono text-xs text-muted-foreground" />
          </div>
          <Button type="submit" variant="gradient" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save changes
          </Button>
        </form>

        {isOwner && (
          <>
            <Separator className="my-10" />
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive">Danger zone</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Deleting a workspace removes all channels, messages and files. This
                    action cannot be undone.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-4"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete workspace
                  </Button>
                </div>
              </div>
            </div>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete {workspace.name}?</DialogTitle>
                  <DialogDescription>
                    This permanently deletes the workspace, its channels and all messages.
                    There is no undo.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={deleteWorkspace} disabled={deleting}>
                    {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete forever
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
