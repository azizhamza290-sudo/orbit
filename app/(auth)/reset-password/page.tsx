"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { KeyRound, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });
type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center shadow-2xl">
        <h1 className="text-xl font-bold">Invalid reset link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link is missing its token. Request a fresh reset email.
        </p>
        <Button variant="outline" className="mt-6 w-full" asChild>
          <Link href="/forgot-password">Request new link</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const res = await fetch("/api/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: values.password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setServerError(body?.error ?? "Could not reset your password");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="glass-strong w-full max-w-md rounded-3xl p-8 text-center shadow-2xl">
        <KeyRound className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Password updated</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You can now sign in with your new password.
        </p>
        <Button variant="gradient" className="mt-6 w-full" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-strong w-full max-w-md rounded-3xl p-8 shadow-2xl"
    >
      <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" {...register("password")} />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input id="confirm" type="password" {...register("confirm")} />
          {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
        </div>
        {serverError && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {serverError}
          </p>
        )}
        <Button type="submit" variant="gradient" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update password
        </Button>
      </form>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
