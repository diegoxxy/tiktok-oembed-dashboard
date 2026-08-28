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

  // 1. Coba lewat proxy publik CORS.sh / Corsproxy agar request server tidak terblokir IP Meta
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(embedUrl)}`;

    const res = await fetch(proxyUrl, {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (res.ok) {
      const htmlText = await res.text();

      // Extract Username
      const userMatch =
        htmlText.match(/class="UsernameText"[^>]*>([^<]+)</i) ||
        htmlText.match(/class="Username"[^>]*>([^<]+)</i);

      if (userMatch && userMatch[1]) {
        authorName = userMatch[1].toLowerCase().trim().replace("@", "");
        authorDisplayName = userMatch[1].trim().replace("@", "");
      }

      // Extract Caption/Title
      const captionMatch = htmlText.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/i);
      if (captionMatch && captionMatch[1]) {
        title = captionMatch[1].replace(/<[^>]+>/g, "").trim();
      }

      // Extract Likes
      const likesMatch = htmlText.match(/([\d,.]+)\s+likes/i);
      if (likesMatch && likesMatch[1]) {
        likes = parseInt(likesMatch[1].replace(/[,.]/g, ""), 10) || 0;
      }

      // Extract Thumbnail/Cover
      const imgMatch = htmlText.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/i);
      if (imgMatch && imgMatch[1]) {
        coverUrl = imgMatch[1].replace(/&amp;/g, "&");
      }
    }
  } catch (err) {
    console.warn(`Proxy fetch failed for Instagram ${shortcode}:`, err);
  }

  // 2. Fallback jika proxy gagal: izinkan username fallback sementara agar tidak langsung dibuang ke error
  // dan bisa di-enrich ulang di client side
  const finalAuthor = authorName || `ig_${shortcode.toLowerCase()}`;
  const finalDisplayName = authorDisplayName || `@${authorName || shortcode}`;

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
    authorUrl: `https://www.instagram.com/reel/${shortcode}/`,
    authorAvatar: "",
    coverUrl,
    views: 0,
    likes,
    comments: 0,
    shares: 0,
    saves: 0,
    postedAt: "Terbaru",
    status: isQualified ? "qualified" : "unqualified",
  };
}