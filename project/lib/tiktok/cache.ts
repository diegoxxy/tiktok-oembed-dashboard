"use client";

import { createStore, get, set, del, clear, keys } from "idb-keyval";
import type { VideoItem } from "./types";

// Store terpisah (bukan default idb-keyval) supaya tidak bentrok dengan data lain.
const store = createStore("tiktok-campaign-dashboard", "video-cache");

interface CacheEntry {
  video: VideoItem;
  cachedAt: number;
}

function cacheKey(sourceUrl: string): string {
  return sourceUrl.trim();
}

/**
 * Ambil banyak entri cache sekaligus. Mengembalikan Map<sourceUrl, VideoItem>
 * hanya untuk URL yang memang ada di cache — sisanya berarti harus di-fetch.
 */
export async function getManyFromCache(
  sourceUrls: string[]
): Promise<Map<string, VideoItem>> {
  const result = new Map<string, VideoItem>();
  await Promise.all(
    sourceUrls.map(async (url) => {
      try {
        const entry = (await get<CacheEntry>(cacheKey(url), store)) ?? null;
        if (entry) result.set(url, entry.video);
      } catch {
        // IndexedDB tidak tersedia (mis. private browsing) — anggap saja cache miss.
      }
    })
  );
  return result;
}

export async function setManyInCache(entries: { sourceUrl: string; video: VideoItem }[]): Promise<void> {
  try {
    await Promise.all(
      entries.map(({ sourceUrl, video }) =>
        set(cacheKey(sourceUrl), { video, cachedAt: Date.now() } satisfies CacheEntry, store)
      )
    );
  } catch {
    // Best-effort — kegagalan cache tidak boleh menggagalkan scan.
  }
}

export async function removeFromCache(sourceUrl: string): Promise<void> {
  try {
    await del(cacheKey(sourceUrl), store);
  } catch {
    /* no-op */
  }
}

export async function clearCache(): Promise<void> {
  try {
    await clear(store);
  } catch {
    /* no-op */
  }
}

export async function getCacheSize(): Promise<number> {
  try {
    const allKeys = await keys(store);
    return allKeys.length;
  } catch {
    return 0;
  }
}
