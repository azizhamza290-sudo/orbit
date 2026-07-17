"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { updateProfileSchema } from "@/lib/validations";

type FormValues = z.infer<typeof updateProfileSchema>;

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function ProfilePage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [loading, setLoading] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>([]);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(updateProfileSchema) });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(({ user }) => {
        reset({
          name: user.name,
          bio: user.bio ?? "",
          timezone: user.timezone,
          language: user.language,
          statusMessage: user.statusMessage ?? "",
        });
        setAvatar(user.image);
        setLinks(Array.isArray(user.socialLinks) ? user.socialLinks : []);
        setLoading(false);
      });
  }, [reset]);

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    setUploading(false);
    if (res.ok) {
      const { attachment } = await res.json();
      setAvatar(attachment.url);
      setValue("image", attachment.url, { shouldDirty: true });
    } else {
      toast.error("Avatar upload failed");
    }
  };

  const onSubmit = async (values: FormValues) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, image: avatar, socialLinks: links.filter((l) => l.url) }),
    });
    if (res.ok) {
      toast.success("Profile updated");
      await updateSession({ name: values.name, image: avatar });
      router.refresh();
    } else {
      toast.error("Could not update profile");
    }
  };

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <ThemeToggle />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight">Profile & preferences</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-8">
          {/* Avatar */}
          <section className="flex items-center gap-5">
            <UserAvatar user={{ name: "you", image: avatar }} className="h-20 w-20 rounded-2xl" />
            <div>
              <Label
                htmlFor="avatar-upload"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload avatar
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
              />
              <p className="mt-2 text-xs text-muted-foreground">PNG or JPG, up to 25 MB.</p>
            </div>
          </section>

          <Separator />

          {/* Basics */}
          <section className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="statusMessage">Status message</Label>
              <Input id="statusMessage" placeholder="🎯 Focusing…" {...register("statusMessage")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={3} placeholder="Tell your team a little about you" {...register("bio")} />
            </div>
          </section>

          <Separator />

          {/* Locale */}
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                {...register("timezone")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language">Language</Label>
              <select
                id="language"
                {...register("language")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </section>

          <Separator />

          {/* Social links */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Social links</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinks((l) => [...l, { label: "", url: "" }])}
                disabled={links.length >= 6}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add link
              </Button>
            </div>
            {links.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="Label"
                  value={link.label}
                  onChange={(e) =>
                    setLinks((l) => l.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                  }
                  className="w-32"
                />
                <Input
                  placeholder="https://…"
                  value={link.url}
                  onChange={(e) =>
                    setLinks((l) => l.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setLinks((l) => l.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </section>

          <Button type="submit" variant="gradient" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save profile
          </Button>
        </form>
      </div>
    </div>
  );
}
