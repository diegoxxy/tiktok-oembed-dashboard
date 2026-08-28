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

  // 1. Coba fetch oEmbed publik dari server
  try {
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(
      `https://www.instagram.com/p/${shortcode}/`
    )}`;
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
    console.warn(`Server oEmbed failed for shortcode ${shortcode}:`, err);
  }

  // 2. Jika server terblokir, kembalikan status "unknown" untuk diproses oleh Client-Side Enrichment
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
    authorDisplayName,
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