"use client";

import useSWRInfinite from "swr/infinite";
import { fetcher } from "@/lib/fetcher";
import type { MessageWithRelations, Paginated } from "@/types";

/**
 * Infinite, cursor-paginated channel history.
 * Pages are newest-first; the UI renders them reversed (oldest at top).
 */
export function useChannelMessages(channelId: string | null) {
  const getKey = (
    pageIndex: number,
    previousPage: Paginated<MessageWithRelations> | null,
  ) => {
    if (!channelId) return null;
    if (previousPage && !previousPage.nextCursor) return null;
    const cursor = previousPage?.nextCursor;
    return `/api/channels/${channelId}/messages?limit=40${cursor ? `&cursor=${cursor}` : ""}`;
  };

  const swr = useSWRInfinite<Paginated<MessageWithRelations>>(getKey, fetcher, {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
  });

  const messages: MessageWithRelations[] =
    swr.data?.flatMap((page) => page.items).slice().reverse() ?? [];

  const upsertMessage = (message: MessageWithRelations) => {
    swr.mutate(
      (pages) => {
        if (!pages || pages.length === 0) return pages;
        // Update existing
        const exists = pages.some((p) => p.items.some((m) => m.id === message.id));
        if (exists) {
          return pages.map((p) => ({
            ...p,
            items: p.items.map((m) => (m.id === message.id ? { ...m, ...message } : m)),
          }));
        }
        // Prepend to the newest page (page 0 is newest-first)
        const [first, ...rest] = pages;
        return [{ ...first, items: [message, ...first.items] }, ...rest];
      },
      { revalidate: false },
    );
  };

  const removeMessage = (messageId: string) => {
    swr.mutate(
      (pages) =>
        pages?.map((p) => ({ ...p, items: p.items.filter((m) => m.id !== messageId) })),
      { revalidate: false },
    );
  };

  return {
    messages,
    isLoading: swr.isLoading,
    isError: swr.error,
    hasMore: swr.data ? !!swr.data[swr.data.length - 1]?.nextCursor : false,
    loadMore: () => swr.setSize((s) => s + 1),
    isLoadingMore: swr.isValidating && (swr.data?.length ?? 0) > 0,
    upsertMessage,
    removeMessage,
    mutate: swr.mutate,
  };
}
