import { NextResponse } from "next/server";
import { fetchTikTokDataWithRetry } from "@/lib/tiktok/server/fetchTikTok";
import type { TikTokBatchRequest, TikTokBatchResponse } from "@/lib/tiktok/types";

const MAX_BATCH_SIZE = 30;

// Resolver shortlink dengan Browser User-Agent agar tidak diblokir TikTok
async function resolveTikTokUrl(url: string): Promise<string> {
  const trimmedUrl = url.trim();
  if (trimmedUrl.includes("vt.tiktok.com") || trimmedUrl.includes("vm.tiktok.com")) {
    try {
      const response = await fetch(trimmedUrl, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      return response.url || trimmedUrl;
    } catch {
      return trimmedUrl;
    }
  }
  return trimmedUrl;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TikTokBatchRequest;
    const { videoUrls, targetHashtag } = body;

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return NextResponse.json({ error: "Masukkan minimal 1 URL video TikTok" }, { status: 400 });
    }

    if (videoUrls.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Satu batch maksimal ${MAX_BATCH_SIZE} URL. Pecah dulu di sisi klien.` },
        { status: 400 }
      );
    }

    if (!targetHashtag) {
      return NextResponse.json({ error: "Hashtag target tidak boleh kosong" }, { status: 400 });
    }

    const cleanHashtag = targetHashtag.toLowerCase().replace("#", "").trim();

    // Memproses URL secara sekuensial dengan jeda 1.2 detik (1200ms) untuk menghindari Rate Limit TikTok (1 req/sec)
    const videos = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const originalUrl = videoUrls[i];
      const resolvedUrl = await resolveTikTokUrl(originalUrl);
      
      const videoData = await fetchTikTokDataWithRetry(resolvedUrl, cleanHashtag);
      videos.push(videoData);

      if (i < videoUrls.length - 1) {
        await delay(1200);
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