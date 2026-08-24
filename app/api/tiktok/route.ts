import { NextResponse } from "next/server";
import { fetchTikTokDataWithRetry } from "@/lib/tiktok/server/fetchTikTok";
import type { TikTokBatchRequest, TikTokBatchResponse } from "@/lib/tiktok/types";

const MAX_BATCH_SIZE = 30;

// Helper function untuk menyelesaikan shortlink (vt.tiktok.com / vm.tiktok.com)
async function resolveTikTokUrl(url: string): Promise<string> {
  const trimmedUrl = url.trim();
  if (trimmedUrl.includes("vt.tiktok.com") || trimmedUrl.includes("vm.tiktok.com")) {
    try {
      const response = await fetch(trimmedUrl, {
        method: "HEAD",
        redirect: "follow",
        cache: "no-store",
      });
      return response.url || trimmedUrl;
    } catch {
      return trimmedUrl;
    }
  }
  return trimmedUrl;
}

// Helper delay sederhana untuk jeda sekuensial antar request (menghindari rate-limit 429)
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

    // Prosese sekuensial dengan resolving shortlink & delay 400ms antar video dalam 1 batch
    const videos = [];
    for (let i = 0; i < videoUrls.length; i++) {
      const originalUrl = videoUrls[i];
      const resolvedUrl = await resolveTikTokUrl(originalUrl);
      
      const videoData = await fetchTikTokDataWithRetry(resolvedUrl, cleanHashtag);
      videos.push(videoData);

      // Beri jeda antar pemanggilan jika masih ada antrean
      if (i < videoUrls.length - 1) {
        await delay(400);
      }
    }

    const response: TikTokBatchResponse = {
      hashtag: `#${cleanHashtag}`,
      videos,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}