import { NextResponse } from "next/server";
import { fetchTikTokDataWithRetry } from "@/lib/tiktok/server/fetchTikTok";
import type { TikTokBatchRequest, TikTokBatchResponse } from "@/lib/tiktok/types";

// Klien mengirim per-chunk (lihat lib/tiktok/chunk.ts). Batas ini adalah
// pengaman sisi server: menolak request yang mengirim satu batch terlalu besar
// dan berisiko melewati timeout function Vercel.
const MAX_BATCH_SIZE = 30;

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

    // Diproses PARALEL (bukan loop sekuensial + delay seperti versi lama) —
    // ini yang membuat batch 1.000+ link tetap muat di dalam timeout serverless.
    const videos = await Promise.all(
      videoUrls.map((url) => fetchTikTokDataWithRetry(url, cleanHashtag))
    );

    const response: TikTokBatchResponse = {
      hashtag: `#${cleanHashtag}`,
      videos,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
