import type { VideoItem } from "@/lib/tiktok/types";

function extractYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export async function fetchYouTubeData(
  resolvedUrl: string,
  cleanHashtag: string
): Promise<VideoItem> {
  const videoId = extractYouTubeId(resolvedUrl);
  if (!videoId) {
    return makeErrorVideo(resolvedUrl, "URL YouTube Shorts tidak valid");
  }

  const embedUrl = `https://www.youtube.com/shorts/${videoId}`;

  // 1. Coba ambil data via Invidious API
  try {
    const invidiousRes = await fetch(`https://inv.tux.pizza/api/v1/videos/${videoId}`, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (invidiousRes.ok) {
      const data = await invidiousRes.json();

      let formattedDate = "-";
      if (data.published) {
        const dateObj = new Date(data.published * 1000);
        formattedDate = dateObj.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }

      const rawAuthor = data.author || "unknown";
      const cleanAuthor = rawAuthor.replace(/\s+/g, "").toLowerCase();
      const formattedAuthor = cleanAuthor.startsWith("@") ? cleanAuthor : `@${cleanAuthor}`;

      return {
        id: videoId,
        platform: "youtube",
        sourceUrl: resolvedUrl,
        videoUrl: embedUrl,
        title: data.title || "",
        authorName: formattedAuthor,
        authorDisplayName: rawAuthor,
        authorUrl: data.authorUrl ? `https://www.youtube.com${data.authorUrl}` : "",
        authorAvatar: data.authorThumbnails?.[0]?.url || "",
        coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        views: Number(data.viewCount || 0),
        likes: Number(data.likeCount || 0),
        comments: 0,
        shares: 0,
        saves: 0,
        postedAt: formattedDate,
        status: "qualified", // Otomatis diset QUALIFIED
      };
    }
  } catch {
    // Lanjut ke fallback oEmbed jika Invidious tidak merespons
  }

  // 2. Fallback: oEmbed + Direct HTML Scraper Meta Tags
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(resolvedUrl)}&format=json`;
    const res = await fetch(oembedUrl, { cache: "no-store" });

    if (!res.ok) {
      return makeErrorVideo(resolvedUrl, "Video tidak ditemukan atau private");
    }

    const oembedData = await res.json();
    const rawAuthor = oembedData.author_name || "youtube_creator";
    const cleanAuthor = rawAuthor.replace(/\s+/g, "").toLowerCase();
    const formattedAuthor = cleanAuthor.startsWith("@") ? cleanAuthor : `@${cleanAuthor}`;

    let views = 0;
    let likes = 0;

    try {
      const pageRes = await fetch(embedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        cache: "no-store",
      });

      if (pageRes.ok) {
        const html = await pageRes.text();

        const viewMatch =
          html.match(/"viewCount":"(\d+)"/) ||
          html.match(/itemprop="interactionCount" content="(\d+)"/) ||
          html.match(/"videoViewCountRenderer":\{"viewCount":\{"simpleText":"([\d,\.]+)/);

        if (viewMatch) {
          views = parseInt(viewMatch[1].replace(/[^\d]/g, ""), 10) || 0;
        }

        const likeMatch =
          html.match(/"label":"([\d,\.]+)\s+likes"/i) ||
          html.match(/"likeCount":"(\d+)"/);

        if (likeMatch) {
          likes = parseInt(likeMatch[1].replace(/[^\d]/g, ""), 10) || 0;
        }
      }
    } catch {
      // Abaikan error parsing HTML
    }

    return {
      id: videoId,
      platform: "youtube",
      sourceUrl: resolvedUrl,
      videoUrl: embedUrl,
      title: oembedData.title || "",
      authorName: formattedAuthor,
      authorDisplayName: rawAuthor,
      authorUrl: oembedData.author_url || "",
      authorAvatar: oembedData.thumbnail_url || "",
      coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      views: views,
      likes: likes,
      comments: 0,
      shares: 0,
      saves: 0,
      postedAt: "-",
      status: "qualified", // Otomatis diset QUALIFIED
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal mengambil data YouTube";
    return makeErrorVideo(resolvedUrl, msg);
  }
}

function makeErrorVideo(sourceUrl: string, message: string): VideoItem {
  return {
    id: sourceUrl,
    platform: "youtube",
    sourceUrl,
    videoUrl: sourceUrl,
    title: "Gagal Memuat Video (Private / Dihapus)",
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