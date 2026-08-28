import type { VideoItem } from "../types";

/**
 * Membuat SVG Cover placeholder ketika thumbnail Instagram diblokir Meta API
 */
function createInstagramPlaceholderSvg(shortcode: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
    <rect width="100%" height="100%" fill="#0f172a"/>
    <circle cx="150" cy="170" r="45" fill="none" stroke="#ec4899" stroke-width="4"/>
    <rect x="110" y="130" width="80" height="80" rx="20" fill="none" stroke="#ec4899" stroke-width="4"/>
    <circle cx="170" cy="148" r="5" fill="#ec4899"/>
    <text x="50%" y="260" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="600">INSTAGRAM REEL</text>
    <text x="50%" y="285" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="12">${shortcode}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Scraper Instagram Robust & Graceful Fallback
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

  // Gunakan ID unik shortcode sebagai nama author default agar TIDAK TERGABUNG ke satu folder
  let authorName = `ig_${shortcode}`;
  let title = `Instagram Reel (${shortcode})`;
  let coverUrl = createInstagramPlaceholderSvg(shortcode);
  let likes = 0;
  let views = 0;

  try {
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
    console.warn(`[Instagram Fetch Notice] Menggunakan fallback data untuk shortcode: ${shortcode}`);
  }

  // Evaluasi Hashtag
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
    authorUrl: authorName.startsWith("ig_")
      ? cleanUrl
      : `https://www.instagram.com/${authorName}`,
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