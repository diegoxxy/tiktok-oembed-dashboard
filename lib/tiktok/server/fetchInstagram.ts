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
  let title = `Instagram Reel (${shortcode})`;
  let coverUrl = "";

  // 1. Coba Scraping HTML Meta Tags (Server-Side)
  try {
    const res = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const html = await res.text();
      const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
      if (ogTitleMatch) {
        title = ogTitleMatch[1];
        const userMatch = title.match(/@([a-zA-Z0-9_.]+)/);
        if (userMatch) {
          authorName = userMatch[1].toLowerCase().trim();
        }
      }

      const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
      if (ogImageMatch) {
        coverUrl = ogImageMatch[1].replace(/&amp;/g, "&");
      }
    }
  } catch (err) {
    console.warn(`Direct scraping failed for shortcode ${shortcode}:`, err);
  }

  // 2. Fallback Official oEmbed (Server-Side)
  if (!authorName) {
    try {
      const oembedRes = await fetch(
        `https://api.instagram.com/oembed/?url=${encodeURIComponent(`https://www.instagram.com/p/${shortcode}/`)}`,
        { cache: "no-store" }
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.author_name) authorName = data.author_name.toLowerCase().trim();
        if (data.title) title = data.title;
        if (data.thumbnail_url) coverUrl = data.thumbnail_url;
      }
    } catch (err) {
      console.warn(`Server oEmbed failed for shortcode ${shortcode}:`, err);
    }
  }

  // 3. JIKA SERVER GAGAL (Terblokir Rate Limit / Private):
  // Kembalikan objek 'error' & authorName 'unknown' agar page.tsx langsung menjalankan fetchInstagramDataClient di browser!
  if (!authorName) {
    return {
      id: shortcode,
      platform: "instagram",
      sourceUrl: cleanUrl,
      videoUrl: cleanUrl,
      title: `Instagram Reel (${shortcode})`,
      authorName: "unknown",
      authorDisplayName: "Unknown / Error",
      authorUrl: cleanUrl,
      authorAvatar: "",
      coverUrl: "",
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      postedAt: "Terbaru",
      status: "error",
      errorMessage: "Membutuhkan parsing client-side",
    };
  }

  const isQualified = cleanTargetHashtag
    ? title.toLowerCase().includes(`#${cleanTargetHashtag}`)
    : true;

  return {
    id: shortcode,
    platform: "instagram",
    sourceUrl: cleanUrl,
    videoUrl: cleanUrl,
    title,
    authorName,
    authorDisplayName: authorName,
    authorUrl: `https://www.instagram.com/${authorName}`,
    authorAvatar: "",
    coverUrl,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    postedAt: "Terbaru",
    status: isQualified ? "qualified" : "unqualified",
  };
}