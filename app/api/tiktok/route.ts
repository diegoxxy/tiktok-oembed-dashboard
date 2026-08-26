import { NextResponse } from "next/server";
import { fetchTikTokDataWithRetry } from "@/lib/tiktok/server/fetchTikTok";
import { fetchYouTubeData } from "@/lib/tiktok/server/fetchYouTube";
import type { VideoBatchRequest, VideoBatchResponse, VideoItem } from "@/lib/tiktok/types";

const MAX_BATCH_SIZE = 30;

/**
 * Normalisasi URL TikTok:
 * 1. Menghilangkan query params.
 * 2. Memperbaiki typo penulisan path slash (/video767... -> /video/767...).
 * 3. Menetralkan username typo dengan mengekstrak Video ID secara presisi.
 */
function sanitizeAndNormalizeUrl(url: string): { cleanUrl: string; videoId: string | null } {
  let cleaned = url.trim();

  // Fix typo missing slash atau double slash pada /video/
  cleaned = cleaned.replace(/\/video(\d+)/gi, "/video/$1");
  cleaned = cleaned.replace(/\/video\/{2,}/gi, "/video/");

  // Hapus query parameters (?is_from_webapp=1, dll)
  try {
    const parsed = new URL(cleaned);
    cleaned = `${parsed.origin}${parsed.pathname}`;
  } catch {
    // Apabila bukan URL valid, kembalikan string awal
  }

  // Ekstraksi Video ID TikTok jika ada (19 digit angka)
  const tiktokIdMatch = cleaned.match(/\/video\/(\d+)/i);
  const videoId = tiktokIdMatch ? tiktokIdMatch[1] : null;

  // Jika terdapat Video ID, buat URL canonical netral untuk menghindari error typo username
  if (videoId && (cleaned.includes("tiktok.com") || cleaned.includes("vm.tiktok.com") || cleaned.includes("vt.tiktok.com"))) {
    cleaned = `https://www.tiktok.com/@tiktok/video/${videoId}`;
  }

  return { cleanUrl: cleaned, videoId };
}

/**
 * Resolve URL pendek (vt.tiktok.com / vm.tiktok.com)
 */
async function resolveTikTokUrl(url: string): Promise<string> {
  const { cleanUrl } = sanitizeAndNormalizeUrl(url);
  if (!cleanUrl) return "";

  if (cleanUrl.includes("vt.tiktok.com") || cleanUrl.includes("vm.tiktok.com")) {
    try {
      const response = await fetch(cleanUrl, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (response.url) {
        const resolved = sanitizeAndNormalizeUrl(response.url);
        return resolved.cleanUrl;
      }
      return cleanUrl;
    } catch {
      return cleanUrl;
    }
  }
  return cleanUrl;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VideoBatchRequest;
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

    // Proses fetch setiap URL
    const videos: VideoItem[] = [];

    for (let i = 0; i < videoUrls.length; i++) {
      const originalInputUrl = videoUrls[i].trim();
      if (!originalInputUrl) continue;

      const isYouTube = originalInputUrl.includes("youtube.com") || originalInputUrl.includes("youtu.be");
      let videoData: VideoItem;

      try {
        if (isYouTube) {
          const { cleanUrl } = sanitizeAndNormalizeUrl(originalInputUrl);
          videoData = await fetchYouTubeData(cleanUrl, cleanHashtag);
          videoData.sourceUrl = originalInputUrl;
        } else {
          const resolvedUrl = await resolveTikTokUrl(originalInputUrl);
          videoData = await fetchTikTokDataWithRetry(resolvedUrl, cleanHashtag);

          if (videoData) {
            videoData.platform = "tiktok";
            videoData.sourceUrl = originalInputUrl;
          } else {
            throw new Error("Data video kosong / Private");
          }
        }
      } catch (err) {
        videoData = {
          id: originalInputUrl,
          platform: isYouTube ? "youtube" : "tiktok",
          sourceUrl: originalInputUrl,
          videoUrl: originalInputUrl,
          title: "Gagal Memuat Video (Private / Typo / Limit)",
          authorName: "unknown",
          authorDisplayName: "Unknown / Error",
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
          errorMessage: err instanceof Error ? err.message : "Gagal memuat metadata video",
        };
      }

      videos.push(videoData);

      if (i < videoUrls.length - 1) {
        await delay(250);
      }
    }

    const response: VideoBatchResponse = {
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