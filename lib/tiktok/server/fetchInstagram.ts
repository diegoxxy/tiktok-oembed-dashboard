import type { VideoItem } from "@/lib/tiktok/types";

/**
 * Fetch metadata Instagram dari sisi server
 */
export async function fetchInstagramData(
  url: string,
  targetHashtag: string
): Promise<VideoItem | null> {
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[1] : null;

  if (!shortcode) {
    throw new Error("Format URL Instagram tidak valid");
  }

  const targetUrl = `https://www.instagram.com/p/${shortcode}/`;

  try {
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(oembedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const data = await res.json();
      const rawUsername = data.author_name || "unknown";
      const cleanUsername = rawUsername.toLowerCase().trim();
      const caption = data.title || "";
      const hasHashtag = caption.toLowerCase().includes(targetHashtag.toLowerCase());

      return {
        id: shortcode,
        platform: "instagram",
        sourceUrl: url,
        videoUrl: targetUrl,
        title: caption || `Instagram Post (${shortcode})`,
        authorName: cleanUsername,
        authorDisplayName: data.author_name || cleanUsername,
        authorUrl: `https://www.instagram.com/${cleanUsername}`,
        authorAvatar: "",
        coverUrl: data.thumbnail_url || "",
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        postedAt: "-",
        status: hasHashtag ? "qualified" : "unqualified",
      };
    }
  } catch (err) {
    console.warn("Server-side oEmbed Instagram gagal, memicu fallback client:", err);
  }

  // Jika server oEmbed diblokir / rate limit, lempar error agar ditangani oleh client fallback
  throw new Error("Instagram Rate Limit / Private Video");
}