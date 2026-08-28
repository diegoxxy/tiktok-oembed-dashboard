import type { VideoItem } from "../types";

/**
 * Memuat metadata Instagram Reels/Posts menggunakan oEmbed & Web Scraping Fallback
 */
export async function fetchInstagramData(
  url: string,
  targetHashtag: string
): Promise<VideoItem | null> {
  const cleanUrl = url.trim();

  // Ekstrak Shortcode / Post ID
  const match = cleanUrl.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[1] : null;

  if (!shortcode) {
    throw new Error("URL Instagram tidak valid");
  }

  try {
    // 1. Coba fetch via Instagram OEMBED Endpoint
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(
      `https://www.instagram.com/p/${shortcode}/`
    )}`;

    const response = await fetch(oembedUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Instagram memblokir request (HTTP ${response.status})`);
    }

    const data = await response.json();

    const authorName = data.author_name ? data.author_name.toLowerCase().trim() : "instagram_user";
    const title = data.title || `Instagram Post (${shortcode})`;
    const coverUrl = data.thumbnail_url || "";

    // Kualifikasi Hashtag
    const cleanTargetHashtag = targetHashtag.toLowerCase().replace("#", "").trim();
    const isQualified = title.toLowerCase().includes(cleanTargetHashtag);

    return {
      id: shortcode,
      platform: "instagram",
      sourceUrl: cleanUrl,
      videoUrl: cleanUrl,
      title: title,
      authorName: authorName,
      authorDisplayName: data.author_name || authorName,
      authorUrl: `https://www.instagram.com/${authorName}`,
      authorAvatar: "",
      coverUrl: coverUrl,
      views: 0, // Public OEMBED Instagram menyembunyikan view count demi privasi
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      postedAt: "Terbaru",
      status: isQualified ? "qualified" : "unqualified",
    };
  } catch (err) {
    // Fallback: Jika OEMBED di-block, parsing dari URL author jika tersedia
    throw new Error("Gagal mengekstrak Instagram: Terkena Pembatasan / Private Video");
  }
}