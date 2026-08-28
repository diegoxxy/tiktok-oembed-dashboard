import type { VideoItem } from "../types";

/**
 * Interface response data dari Instagram Public Endpoint / Scraper
 */
interface InstagramScrapeResult {
  username: string;
  caption: string;
  views: number;
  likes: number;
  comments: number;
  thumbnail: string;
}

/**
 * Mengambil data Instagram menggunakan endpoint JSON publik + fallback parsing
 */
async function scrapeInstagramPublicData(shortcode: string): Promise<InstagramScrapeResult | null> {
  // 1. Coba fetch metadata publik via JSON endpoint Instagram
  const targetUrl = `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 300 },
    });

    if (res.ok) {
      const data = await res.json();
      const media = data?.graphql?.shortcode_media || data?.items?.[0];

      if (media) {
        return {
          username: media.owner?.username || media.user?.username || "",
          caption: media.edge_media_to_caption?.edges?.[0]?.node?.text || media.caption?.text || "",
          views: media.video_view_count || media.play_count || media.view_count || 0,
          likes: media.edge_media_preview_like?.count || media.like_count || 0,
          comments: media.edge_media_to_comment?.count || media.comment_count || 0,
          thumbnail: media.display_url || media.image_versions2?.candidates?.[0]?.url || "",
        };
      }
    }
  } catch (err) {
    console.warn(`[Instagram Direct Scrape Failed] Shortcode: ${shortcode}`);
  }

  return null;
}

/**
 * Membuat SVG Cover placeholder jika media/gambar terblokir CORS Meta
 */
function createInstagramPlaceholderSvg(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
    <rect width="100%" height="100%" fill="#0f172a"/>
    <rect x="110" y="130" width="80" height="80" rx="20" fill="none" stroke="#ec4899" stroke-width="4"/>
    <circle cx="150" cy="170" r="20" fill="none" stroke="#ec4899" stroke-width="4"/>
    <circle cx="170" cy="145" r="4" fill="#ec4899"/>
    <text x="50%" y="260" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="14" font-weight="600">INSTAGRAM REEL</text>
    <text x="50%" y="285" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="monospace" font-size="12">${label}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Main Fetcher Instagram
 */
export async function fetchInstagramData(
  url: string,
  targetHashtag: string
): Promise<VideoItem | null> {
  const cleanUrl = url.trim();

  // Extract shortcode dari URL Instagram (/p/, /reel/, /reels/)
  const match = cleanUrl.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[1] : null;

  if (!shortcode) {
    throw new Error("URL Instagram tidak valid");
  }

  // 1. Attempt Scraping Real Data
  const scrapedData = await scrapeInstagramPublicData(shortcode);

  // 2. Set Nilai Hasil Scraping atau Fallback jika diblokir
  const authorName = scrapedData?.username ? scrapedData.username.toLowerCase().trim() : `ig_${shortcode}`;
  const authorDisplayName = scrapedData?.username || authorName;
  const title = scrapedData?.caption || `Instagram Reel (${shortcode})`;
  const views = scrapedData?.views || 0;
  const likes = scrapedData?.likes || 0;
  const comments = scrapedData?.comments || 0;
  const coverUrl = scrapedData?.thumbnail || createInstagramPlaceholderSvg(shortcode);

  // 3. Evaluasi Kelayakan Hashtag
  const cleanTargetHashtag = targetHashtag.toLowerCase().replace("#", "").trim();
  const isQualified =
    title.toLowerCase().includes(cleanTargetHashtag) || title.startsWith("Instagram Reel");

  return {
    id: shortcode,
    platform: "instagram",
    sourceUrl: cleanUrl,
    videoUrl: cleanUrl,
    title,
    authorName,
    authorDisplayName,
    authorUrl: scrapedData?.username
      ? `https://www.instagram.com/${scrapedData.username}`
      : cleanUrl,
    authorAvatar: "",
    coverUrl,
    views,
    likes,
    comments,
    shares: 0,
    saves: 0,
    postedAt: "Terbaru",
    status: isQualified ? "qualified" : "unqualified",
  };
}