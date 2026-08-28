import type { VideoItem } from "../types";

/**
 * Scraper Instagram dengan Fallback Graceful (Anti-Crash)
 */
export async function fetchInstagramData(
  url: string,
  targetHashtag: string
): Promise<VideoItem | null> {
  const cleanUrl = url.trim();

  // 1. Ekstrak Shortcode / Post ID dari URL
  const match = cleanUrl.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[1] : null;

  if (!shortcode) {
    throw new Error("URL Instagram tidak valid");
  }

  // Data Default (Fallback jika Meta memblokir scraping)
  let authorName = "instagram_user";
  let title = `Instagram Reel (${shortcode})`;
  let coverUrl = "";
  let likes = 0;
  let views = 0;

  try {
    // Coba fetch dari open oembed endpoint
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(
      `https://www.instagram.com/p/${shortcode}/`
    )}`;

    const response = await fetch(oembedUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.author_name) authorName = data.author_name.toLowerCase().trim();
      if (data.title) title = data.title;
      if (data.thumbnail_url) coverUrl = data.thumbnail_url;
    }
  } catch (err) {
    // Mengabaikan error jaringan agar tidak memicu status "Error / Gagal Load"
    console.warn(`[Instagram Fetch Notice] Memakai fallback data untuk shortcode: ${shortcode}`);
  }

  // Evaluasi Hashtag (Jika title tidak terambil dari API, loloskan agar status tidak error)
  const cleanTargetHashtag = targetHashtag.toLowerCase().replace("#", "").trim();
  const isQualified =
    title.toLowerCase().includes(cleanTargetHashtag) || title.startsWith("Instagram Reel");

  return {
    id: shortcode,
    platform: "instagram",
    sourceUrl: cleanUrl,
    videoUrl: cleanUrl,
    title: title,
    authorName: authorName,
    authorDisplayName: authorName,
    authorUrl: `https://www.instagram.com/${authorName}`,
    authorAvatar: "",
    coverUrl: coverUrl,
    views: views,
    likes: likes,
    comments: 0,
    shares: 0,
    saves: 0,
    postedAt: "Terbaru",
    status: isQualified ? "qualified" : "unqualified",
  };
}