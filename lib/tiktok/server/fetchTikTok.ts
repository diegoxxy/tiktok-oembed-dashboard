import type { VideoItem } from "@/lib/tiktok/types";

/**
 * Mengekstrak Video ID 19 digit dari URL TikTok untuk penanganan typo path/username
 */
export function extractTikTokVideoId(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/i);
  return match ? match[1] : null;
}

export async function fetchTikTokDataWithRetry(
  resolvedUrl: string,
  cleanHashtag: string
): Promise<VideoItem> {
  const videoId = extractTikTokVideoId(resolvedUrl);

  // Jika URL memiliki ID video 19 digit, buat URL netral untuk memutus error typo username (@berframa vs @ber1rama)
  const canonicalUrl = videoId
    ? `https://www.tiktok.com/@tiktok/video/${videoId}`
    : resolvedUrl;

  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(canonicalUrl)}`;
    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return makeErrorVideo(resolvedUrl, `HTTP error ${res.status}`);
    }

    const json = await res.json();
    if (json.code !== 0 || !json.data) {
      return makeErrorVideo(resolvedUrl, json.msg || "Video tidak ditemukan atau private");
    }

    const data = json.data;

    let formattedDate = "-";
    if (data.create_time) {
      const dateObj = new Date(data.create_time * 1000);
      formattedDate = dateObj.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    const authorUniqueId = data.author?.unique_id || "unknown";

    return {
      id: data.id || videoId || resolvedUrl,
      platform: "tiktok",
      sourceUrl: resolvedUrl, // Pertahankan input awal user
      videoUrl: canonicalUrl,
      title: data.title || "",
      authorName: authorUniqueId.startsWith("@") ? authorUniqueId : `@${authorUniqueId}`,
      authorDisplayName: data.author?.nickname || authorUniqueId,
      authorUrl: `https://www.tiktok.com/@${authorUniqueId.replace(/^@/, "")}`,
      authorAvatar: data.author?.avatar || "",
      coverUrl: data.cover || "",
      views: Number(data.play_count || 0),
      likes: Number(data.digg_count || 0),
      comments: Number(data.comment_count || 0),
      shares: Number(data.share_count || 0),
      saves: Number(data.collect_count || 0),
      postedAt: formattedDate,
      status: "qualified", // Otomatis diset QUALIFIED untuk semua video valid
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengambil data";
    return makeErrorVideo(resolvedUrl, msg);
  }
}

function makeErrorVideo(sourceUrl: string, message: string): VideoItem {
  return {
    id: sourceUrl,
    platform: "tiktok",
    sourceUrl,
    videoUrl: sourceUrl,
    title: "Gagal Memuat Video (Private / Dihapus / Typo)",
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
    errorMessage: message,
  };
}