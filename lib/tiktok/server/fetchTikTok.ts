import type { VideoItem } from "@/lib/tiktok/types";

export async function fetchTikTokDataWithRetry(
  resolvedUrl: string,
  cleanHashtag: string
): Promise<VideoItem> {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(resolvedUrl)}`;
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
    const titleText = (data.title || "").toLowerCase();
    const isHashtagMatch = titleText.includes(`#${cleanHashtag}`);

    let formattedDate = "-";
    if (data.create_time) {
      const dateObj = new Date(data.create_time * 1000);
      formattedDate = dateObj.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    return {
      id: data.id || resolvedUrl,
      platform: "tiktok", // Tambahkan platform marker
      sourceUrl: resolvedUrl,
      videoUrl: data.play || resolvedUrl,
      title: data.title || "",
      authorName: data.author?.unique_id || "unknown",
      authorDisplayName: data.author?.nickname || "unknown",
      authorUrl: `https://www.tiktok.com/@${data.author?.unique_id || ""}`,
      authorAvatar: data.author?.avatar || "",
      coverUrl: data.cover || "",
      views: Number(data.play_count || 0),
      likes: Number(data.digg_count || 0),
      comments: Number(data.comment_count || 0),
      shares: Number(data.share_count || 0),
      saves: Number(data.collect_count || 0),
      postedAt: formattedDate,
      status: isHashtagMatch ? "qualified" : "unqualified",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengambil data";
    return makeErrorVideo(resolvedUrl, msg);
  }
}

function makeErrorVideo(sourceUrl: string, message: string): VideoItem {
  return {
    id: sourceUrl,
    platform: "tiktok", // Tambahkan platform marker
    sourceUrl,
    videoUrl: sourceUrl,
    title: "",
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