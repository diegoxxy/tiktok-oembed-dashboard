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

  return {
    id: shortcode,
    platform: "instagram",
    sourceUrl: cleanUrl,
    videoUrl: cleanUrl,
    title: `Instagram Reel (${shortcode})`,
    authorName: `ig_${shortcode}`,
    authorDisplayName: `ig_${shortcode}`,
    authorUrl: cleanUrl,
    authorAvatar: "",
    coverUrl: "",
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    postedAt: "Terbaru",
    status: "qualified",
  };
}