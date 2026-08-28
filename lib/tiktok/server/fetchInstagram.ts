import type { VideoItem } from "@/lib/tiktok/types";

/**
 * Mendapatkan data Instagram Reel / Post secara gratis tanpa login.
 * Menggunakan public GraphQL / OEmbed endpoint.
 */
export async function fetchInstagramData(
  targetUrl: string,
  targetHashtag: string
): Promise<VideoItem> {
  // Ekstraksi Shortcode Instagram (e.g. instagram.com/reel/C123456/ -> C123456)
  const shortcodeMatch = targetUrl.match(/\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
  const shortcode = shortcodeMatch ? shortcodeMatch[1] : null;

  if (!shortcode) {
    throw new Error("URL Instagram tidak valid");
  }

  try {
    // 1. Fetch metadata via OpenGraph/oEmbed publik
    const oembedRes = await fetch(
      `https://api.instagram.com/oembed/?url=${encodeURIComponent(targetUrl)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!oembedRes.ok) {
      throw new Error("Gagal mengambil data Instagram (Public Limit)");
    }

    const data = await oembedRes.json();

    const authorName = data.author_name || "instagram_user";
    const title = data.title || "Instagram Reel";
    const hasHashtag = title.toLowerCase().includes(targetHashtag.toLowerCase());

    return {
      id: shortcode,
      platform: "instagram",
      sourceUrl: targetUrl,
      videoUrl: targetUrl,
      title: title,
      authorName: authorName,
      authorDisplayName: data.author_name || authorName,
      authorUrl: `https://www.instagram.com/${authorName}`,
      authorAvatar: data.thumbnail_url || "",
      coverUrl: data.thumbnail_url || "",
      views: 0, // Public oEmbed Instagram menyembunyikan angka views/likes demi privasi
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      postedAt: "-",
      status: hasHashtag ? "qualified" : "unqualified",
    };
  } catch (err) {
    throw new Error(
      err instanceof Error ? err.message : "Gagal memproses link Instagram"
    );
  }
}