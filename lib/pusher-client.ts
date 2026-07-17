"use client";

import PusherClient from "pusher-js";

let _client: PusherClient | null = null;

/** Shared browser-side Pusher client (singleton). */
export function getPusherClient(): PusherClient | null {
  if (typeof window === "undefined") return null;
  if (_client) return _client;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) return null;
  _client = new PusherClient(key, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
    authEndpoint: "/api/pusher/auth",
  });
  return _client;
}
