import type { VideoItem } from "../types";

/**
 * Memuat metadata Instagram Reels/Posts tanpa login secara gratis.
 * Menggunakan strategi HTML Scraping & fallback embed parsing.
 */
export async function fetchInstagramData(
  url: string,
  targetHashtag: string
): Promise<VideoItem | null> {
  const cleanUrl = url.trim();

  // Ekstrak Shortcode / Post ID dari URL Instagram
  const match = cleanUrl.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[1] : null;

  if (!shortcode) {
    throw new Error("URL Instagram tidak valid atau shortcode tidak ditemukan");
  }

  // Gunakan URL embed resmi Instagram yang dapat di-fetch publik
  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

  try {
    const response = await fetch(embedUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webkit,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: Gagal memuat embed Instagram`);
    }

    const html = await response.text();

    // 1. Ekstrak Username
    const authorMatch = html.match(/"username":\s*"([^"]+)"/) || html.match(/class="UsernameText"[^>]*>([^<]+)</);
    const authorName = authorMatch ? authorMatch[1].trim() : "instagram_user";

    // 2. Ekstrak Caption / Title
    const captionMatch = html.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/) || html.match(/<title>([^<]+)<\/title>/);
    let title = "Instagram Video";
    if (captionMatch) {
      // Clean HTML tags dari caption
      title = captionMatch[1].replace(/<[^>]+>/g, "").trim();
    }

    // 3. Ekstrak Likes
    const likesMatch = html.match(/([\d,\.]+)\s*likes/i) || html.match(/class="LikesCount"[^>]*>([\d,\.]+)/);
    let likes = 0;
    if (likesMatch) {
      likes = parseInt(likesMatch[1].replace(/[,.]/g, ""), 10) || 0;
    }

    // 4. Ekstrak Thumbnail / Cover Image
    const imageMatch = html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/) || html.match(/og:image"\s*content="([^"]+)"/);
    const coverUrl = imageMatch ? imageMatch[1].replace(/&amp;/g, "&") : "";

    // Cek kelayakan kualifikasi berdasarkan syarat hashtag
    const normalizedTitle = title.toLowerCase();
    const cleanTargetHashtag = targetHashtag.toLowerCase().replace("#", "").trim();
    const isQualified = normalizedTitle.includes(cleanTargetHashtag);

    return {
      id: shortcode,
      platform: "instagram",
      sourceUrl: cleanUrl,
      videoUrl: cleanUrl,
      title: title || `Instagram Reel (${shortcode})`,
      authorName: authorName.toLowerCase(),
      authorDisplayName: authorName,
      authorUrl: `https://www.instagram.com/${authorName}`,
      authorAvatar: "",
      coverUrl,
      views: likes * 3 || 0, // Estimasi views dinamis jika views disembunyikan
      likes,
      comments: 0,
      shares: 0,
      saves: 0,
      postedAt: "Terbaru",
      status: isQualified ? "qualified" : "unqualified",
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Gagal mengekstrak metadata Instagram";
    throw new Error(errorMsg);
  }
}