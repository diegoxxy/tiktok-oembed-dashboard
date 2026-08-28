import type { VideoItem } from "../types";

export async function fetchInstagramData(
  url: string,
  targetHashtag: string
): Promise<VideoItem | null> {
  const cleanUrl = url.trim();
  const match = cleanUrl.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[1] : null;

  if (!shortcode) {
    throw new Error("URL Instagram tidak valid");
  }

  const cleanTargetHashtag = targetHashtag.toLowerCase().replace("#", "").trim();

  let authorName = "";
  let authorDisplayName = "";
  let title = `Instagram Reel (${shortcode})`;
  let coverUrl = "";
  let likes = 0;

  // 1. Coba fetch via Official Instagram oEmbed Endpoint
  try {
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(`https://www.instagram.com/p/${shortcode}/`)}`;
    const res = await fetch(oembedUrl, { cache: "no-store" });

    if (res.ok) {
      const data = await res.json();
      if (data.author_name) {
        authorName = data.author_name.toLowerCase().trim();
        authorDisplayName = data.author_name.trim();
      }
      if (data.title) {
        title = data.title;
      }
      if (data.thumbnail_url) {
        coverUrl = data.thumbnail_url;
      }
    }
  } catch (err) {
    console.warn(`oEmbed server fetch failed for ${shortcode}:`, err);
  }

  // 2. Fallback: Parse via Instagram Embed Iframe HTML
  if (!authorName) {
    try {
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
      const res = await fetch(embedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        cache: "no-store",
      });

      if (res.ok) {
        const htmlText = await res.text();

        // Extract Username dari HTML Embed
        const userMatch = htmlText.match(/class="UsernameText"[^>]*>([^<]+)</i);
        if (userMatch && userMatch[1]) {
          authorName = userMatch[1].toLowerCase().trim().replace("@", "");
          authorDisplayName = userMatch[1].trim().replace("@", "");
        }

        // Extract Caption
        const captionMatch = htmlText.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/i);
        if (captionMatch && captionMatch[1]) {
          title = captionMatch[1].replace(/<[^>]+>/g, "").trim();
        }

        // Extract Likes
        const likesMatch = htmlText.match(/([\d,.]+)\s+likes/i);
        if (likesMatch && likesMatch[1]) {
          likes = parseInt(likesMatch[1].replace(/[,.]/g, ""), 10) || 0;
        }
      }
    } catch (err) {
      console.warn(`Embed HTML fetch failed for ${shortcode}:`, err);
    }
  }

  // Jika tetap gagal mendapatkan username, kelompokkan sebagai error / unknown
  const finalAuthor = authorName || "unknown";
  const finalDisplayName = authorDisplayName || "Unknown / Error";
  const isQualified = cleanTargetHashtag
    ? title.toLowerCase().includes(`#${cleanTargetHashtag}`)
    : true;

  return {
    id: shortcode,
    platform: "instagram",
    sourceUrl: cleanUrl,
    videoUrl: cleanUrl,
    title,
    authorName: finalAuthor,
    authorDisplayName: finalDisplayName,
    authorUrl: authorName ? `https://www.instagram.com/${authorName}` : cleanUrl,
    authorAvatar: "",
    coverUrl,
    views: 0,
    likes,
    comments: 0,
    shares: 0,
    saves: 0,
    postedAt: "Terbaru",
    status: finalAuthor === "unknown" ? "error" : isQualified ? "qualified" : "unqualified",
    errorMessage: finalAuthor === "unknown" ? "Gagal memuat profil Instagram" : undefined,
  };
}