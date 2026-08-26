import { NextResponse } from "next/server";
import { fetchTikTokDataWithRetry } from "@/lib/tiktok/server/fetchTikTok";
import { fetchYouTubeData } from "@/lib/tiktok/server/fetchYouTube";
import type { TikTokBatchRequest, TikTokBatchResponse, VideoItem } from "@/lib/tiktok/types";

const MAX_BATCH_SIZE = 30;

/**
 * Membersihkan query parameters dan memperbaiki typo sintaks URL TikTok
 */
function sanitizeUrl(url: string): string {
  let cleaned = url.trim();

  // Perbaiki typo missing slash setelah kata 'video' (misal: /video767643... -> /video/767643...)
  cleaned = cleaned.replace(/\/video(\d+)/gi, "/video/$1");

  // Perbaiki typo double slash (misal: /video//7677... -> /video/7677...)
  cleaned = cleaned.replace(/\/video\/{2,}/gi, "/video/");

  // Hapus query parameters (misal: ?is_from_webapp=1&sender_device=pc)
  try {
    const parsed = new URL(cleaned);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return cleaned;
  }
}

async function resolveTikTokUrl(url: string): Promise<string> {
  const clean = sanitizeUrl(url);
  if (!clean) return "";

  if (clean.includes("vt.tiktok.com") || clean.includes("vm.tiktok.com")) {
    try {
      const response = await fetch(clean, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      return response.url ? sanitizeUrl(response.url) : clean;
    } catch {
      return clean;
    }
  }
  return clean;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TikTokBatchRequest;
    const { videoUrls, targetHashtag } = body;

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return NextResponse.json({ error: "Masukkan minimal 1 URL video" }, { status: 400 });
    }

    if (videoUrls.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Satu batch maksimal ${MAX_BATCH_SIZE} URL. Pecah dulu di sisi klien.` },
        { status: 400 }
      );
    }

    if (!targetHashtag || !targetHashtag.trim()) {
      return NextResponse.json({ error: "Hashtag target tidak boleh kosong" }, { status: 400 });
    }

    const cleanHashtag = targetHashtag.toLowerCase().replace("#", "").trim();
    const validUrls = videoUrls.map((u) => sanitizeUrl(u)).filter(Boolean);

    const videos: VideoItem[] = [];
    for (let i = 0; i < validUrls.length; i++) {
      const originalUrl = validUrls[i];
      let videoData: VideoItem;

      try {
        if (originalUrl.includes("youtube.com") || originalUrl.includes("youtu.be")) {
          videoData = await fetchYouTubeData(originalUrl, cleanHashtag);
        } else {
          const resolvedUrl = await resolveTikTokUrl(originalUrl);
          videoData = await fetchTikTokDataWithRetry(resolvedUrl, cleanHashtag);
          if (videoData) {
            videoData.platform = "tiktok";
          }
        }
      } catch (err) {
        const isYouTube = originalUrl.includes("youtube.com") || originalUrl.includes("youtu.be");
        videoData = {
          id: originalUrl,
          platform: isYouTube ? "youtube" : "tiktok",
          sourceUrl: originalUrl,
          videoUrl: originalUrl,
          title: "Gagal Memuat Video",
          authorName: "unknown",
          authorDisplayName: "unknown",
          authorUrl: "",
          authorAvatar: "",
          coverUrl: "",
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          postedAt: "-",
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Gagal memuat video",
        };
      }

      videos.push(videoData);

      if (i < validUrls.length - 1) {
        await delay(300);
      }
    }

    const response: TikTokBatchResponse = {
      hashtag: `#${cleanHashtag}`,
      videos,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}