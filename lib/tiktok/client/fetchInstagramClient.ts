export interface InstagramClientMetric {
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
}

/**
 * Direct Public OEMBED Instagram Extractor
 */
export async function fetchInstagramDataClient(url: string): Promise<InstagramClientMetric | null> {
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_\-]+)/);
  const shortcode = match ? match[1] : null;
  if (!shortcode) return null;

  const targetUrl = `https://www.instagram.com/p/${shortcode}/`;

  // 1. Ekstraksi via JSONP / Public OEmbed Proxy Instagram (Sangat Stabil)
  try {
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(oembedUrl)}`);

    if (res.ok) {
      const data = await res.json();
      if (data.author_name) {
        const username = data.author_name.toLowerCase().trim();
        return {
          username,
          caption: data.title || `Instagram Reel (${shortcode})`,
          views: 0,
          likes: 0,
          comments: 0,
          thumbnail: data.thumbnail_url || "",
        };
      }
    }
  } catch (err) {
    console.warn("Direct oEmbed failed, switching to iframe fallback:", err);
  }

  // 2. Secondary Scraper via DDG Search Proxy Meta Tag
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(embedUrl)}`);

    if (res.ok) {
      const htmlText = await res.text();
      
      // Ambil username dari pola HTML embed resmi Instagram
      const userMatch = htmlText.match(/class="UsernameText"[^>]*>([^<]+)</) || htmlText.match(/@([a-zA-Z0-9_.]+)/);
      const username = userMatch ? userMatch[1].replace("@", "").trim().toLowerCase() : "";

      const captionMatch = htmlText.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/);
      const caption = captionMatch ? captionMatch[1].replace(/<[^>]+>/g, "").trim() : "";

      if (username) {
        return {
          username,
          caption: caption || `Instagram Reel (${shortcode})`,
          views: 0,
          likes: 0,
          comments: 0,
          thumbnail: "",
        };
      }
    }
  } catch (err) {
    console.warn("CorsProxy HTML Embed failed:", err);
  }

  return null;
}