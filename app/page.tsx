"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  Hash,
  Lock,
  MessageSquare,
  Search,
  Sparkles,
  UploadCloud,
  Users,
  Zap,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  {
    icon: MessageSquare,
    title: "Realtime chat",
    description: "Channels, threads, reactions, mentions and typing indicators — all instant.",
  },
  {
    icon: Hash,
    title: "Organized channels",
    description: "Public and private channels with topics, pins and archives.",
  },
  {
    icon: Users,
    title: "Direct messages",
    description: "Private 1:1 conversations with read receipts and presence.",
  },
  {
    icon: UploadCloud,
    title: "File sharing",
    description: "Images, video, PDFs, docs and archives with inline previews.",
  },
  {
    icon: Search,
    title: "Search everything",
    description: "Messages, channels, people and files — one keystroke away.",
  },
  {
    icon: Bell,
    title: "Smart notifications",
    description: "Realtime mentions, replies and invites. Never miss what matters.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Ambient gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[140px]" />
        <div className="absolute top-1/3 -left-40 h-[400px] w-[400px] rounded-full bg-violet-500/15 blur-[120px]" />
        <div className="absolute bottom-0 -right-40 h-[400px] w-[400px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <Zap className="h-4.5 w-4.5" fill="currentColor" />
          </div>
          <span className="text-lg font-bold tracking-tight">Orbit</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="gradient" asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center sm:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          Free forever · Open source · No ads, no tracking
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl"
        >
          Where great teams
          <br />
          <span className="text-gradient">orbit together</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground"
        >
          Orbit brings channels, direct messages, threads, file sharing and realtime
          search into one beautiful, blazing-fast workspace. No subscriptions. No premium
          tiers. Just collaboration.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button size="lg" variant="gradient" asChild className="h-12 px-8 text-base">
            <Link href="/register">
              Create your workspace <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base">
            <Link href="https://github.com" target="_blank" rel="noreferrer">
              <Github className="mr-1 h-4 w-4" /> Star on GitHub
            </Link>
          </Button>
        </motion.div>

        {/* App preview mock */}
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="glass-strong mt-16 overflow-hidden rounded-2xl shadow-2xl shadow-indigo-500/10 text-left"
        >
          <div className="flex items-center gap-1.5 border-b px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-3 text-xs text-muted-foreground">Orbit · #general</span>
          </div>
          <div className="grid grid-cols-[180px_1fr] sm:grid-cols-[220px_1fr]">
            <div className="border-r bg-sidebar/60 p-3 text-sm">
              {["general", "engineering", "design", "random"].map((c, i) => (
                <div
                  key={c}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
                    i === 0
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Hash className="h-3.5 w-3.5" /> {c}
                </div>
              ))}
              <div className="mt-4 px-2.5 text-xs font-semibold uppercase text-muted-foreground">
                Direct messages
              </div>
              {["Ava Chen", "Mia Rossi"].map((n) => (
                <div
                  key={n}
                  className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-muted-foreground"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> {n}
                </div>
              ))}
            </div>
            <div className="space-y-4 p-4 text-sm">
              {[
                { name: "Ava Chen", time: "09:41", msg: "Welcome to **Orbit HQ**! 🎉 Ship day is Friday.", hue: "from-indigo-400 to-violet-500" },
                { name: "Liam Patel", time: "09:43", msg: "Realtime is *so* fast ⚡ typing indicators included.", hue: "from-emerald-400 to-teal-500" },
                { name: "Mia Rossi", time: "09:45", msg: "Pinned the launch checklist 📌 — reactions anyone? 👍 🚀", hue: "from-rose-400 to-pink-500" },
              ].map((m) => (
                <div key={m.msg} className="flex gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${m.hue} text-xs font-bold text-white`}
                  >
                    {m.name.split(" ").map((p) => p[0]).join("")}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold">{m.name}</span>
                      <span className="text-xs text-muted-foreground">{m.time}</span>
                    </div>
                    <p className="text-muted-foreground">{m.msg.replace(/[*_]/g, "")}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-xl border bg-background/60 px-4 py-3 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> Message #general — markdown supported
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Everything a team needs. <span className="text-gradient">Nothing it doesn&apos;t.</span>
        </h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              className="group glass rounded-2xl p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-500 transition-transform group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24 text-center">
        <div className="glass-strong rounded-3xl px-8 py-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Free today. Free tomorrow. Free forever.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            No credit card. No trial countdown. No feature gates. Create a workspace and
            invite your team in under a minute.
          </p>
          <Button size="lg" variant="gradient" asChild className="mt-8 h-12 px-8 text-base">
            <Link href="/register">
              Start collaborating <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        Orbit — open-source team collaboration. MIT licensed.
      </footer>
    </div>
  );
}
