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
  let views = 0;

  // 1. Ekstraksi Menggunakan API Public Scraper Spesialis Instagram (Cobalt / Rapid Instagram Scraper API)
  try {
    const apiEndpoint = `https://api.cobalt.tools/api/json`;
    const res = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      },
      body: JSON.stringify({
        url: `https://www.instagram.com/reel/${shortcode}/`
      }),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === "stream" || data.status === "picker") {
        if (data.picker && data.picker[0]) {
          coverUrl = data.picker[0].thumb || "";
        }
      }
    }
  } catch (e) {
    console.warn("Cobalt API failed, switching to InstaoEmbed Bypass");
  }

  // 2. Fetch via Query GraphQL / InstaoEmbed Proxy Publik
  try {
    const oembedUrl = `https://www.instagram.com/graphql/query/?doc_id=17991233853488220&variables=${encodeURIComponent(
      JSON.stringify({ shortcode })
    )}`;

    const res = await fetch(oembedUrl, {
      headers: {
        "User-Agent": "Instagram 219.0.0.12.117 Android",
        "Accept": "*/*",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const media = json?.data?.xdt_shortcode_media;
      if (media) {
        authorName = media.owner?.username?.toLowerCase() || "";
        authorDisplayName = media.owner?.username || "";
        title = media.edge_media_to_caption?.edges[0]?.node?.text || title;
        coverUrl = media.display_url || coverUrl;
        likes = media.edge_media_preview_like?.count || 0;
        views = media.video_view_count || media.play_count || 0;
      }
    }
  } catch (err) {
    console.warn(`Instagram GraphQL fetch failed for ${shortcode}`);
  }

  // 3. Jika metode server tetap terblokir Meta, buat status ERROR agar Client-side Enrichment mengambil alih
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
      errorMessage: "Gagal memuat profil Instagram (Terbentur Bot Detection Meta)",
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
    views,
    likes,
    comments: 0,
    shares: 0,
    saves: 0,
    postedAt: "Terbaru",
    status: isQualified ? "qualified" : "unqualified",
  };
}