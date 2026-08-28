export interface InstagramClientMetric {
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
}

/**
 * Multi-Engine Instagram Scraper Client (Bypass Vercel & CORS Lock)
 */
export async function fetchInstagramDataClient(
  url: string
): Promise<InstagramClientMetric | null> {
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_\-]+)/);
  const shortcode = match ? match[1] : null;
  if (!shortcode) return null;

  const targetUrl = `https://www.instagram.com/reel/${shortcode}/`;

  // Engine 1: Instagram Embed HTML Parser via AllOrigins Bypass
  try {
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(
        `https://www.instagram.com/p/${shortcode}/embed/captioned/`
      )}`
    );
    if (res.ok) {
      const data = await res.json();
      const html = data?.contents || "";

      // Ekstraksi Username dari Embed Class .CaptionUsernameText
      const userMatch =
        html.match(/class="CaptionUsernameText"[^>]*>([^<]+)</i) ||
        html.match(/href="\/\s*([a-zA-Z0-9_.-]+)\/?"[^>]*class="UsernameText"/i) ||
        html.match(/@([a-zA-Z0-9_.-]+)/);

      // Ekstraksi Caption
      const captionMatch = html.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/i);
      const cleanCaption = captionMatch
        ? captionMatch[1].replace(/<[^>]+>/g, "").trim()
        : `Instagram Reel (${shortcode})`;

      // Ekstraksi Likes & Views dari Text Embed
      const likesMatch = html.match(/([\d,.KMB]+)\s+likes/i);
      const viewsMatch = html.match(/([\d,.KMB]+)\s+views/i);

      const parseNumber = (str: string | null) => {
        if (!str) return 0;
        let num = parseFloat(str.replace(/,/g, ""));
        if (str.includes("K")) num *= 1000;
        if (str.includes("M")) num *= 1000000;
        return Math.round(num);
      };

      if (userMatch && userMatch[1]) {
        const username = userMatch[1].replace(/[^a-zA-Z0-9_.-]/g, "").toLowerCase();
        if (username && username !== "instagram") {
          return {
            username,
            caption: cleanCaption,
            views: parseNumber(viewsMatch ? viewsMatch[1] : null),
            likes: parseNumber(likesMatch ? likesMatch[1] : null),
            comments: 0,
            thumbnail: "",
          };
        }
      }
    }
  } catch (e) {
    console.warn("Embed Parser failed, trying Engine 2...", e);
  }

  // Engine 2: Fast Social Scraper Proxy API
  try {
    const res = await fetch(`https://social-dl.up.railway.app/api/ig?url=${encodeURIComponent(targetUrl)}`);
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.author?.username) {
        return {
          username: json.data.author.username.toLowerCase().trim(),
          caption: json.data.caption || `Instagram Reel (${shortcode})`,
          views: json.data.metrics?.views || 0,
          likes: json.data.metrics?.likes || 0,
          comments: json.data.metrics?.comments || 0,
          thumbnail: json.data.thumbnail || "",
        };
      }
    }
  } catch (e) {
    console.warn("Proxy API Engine failed...", e);
  }

  // Fallback default jika postingan diprivat/dihapus
  return {
    username: `ig_${shortcode.toLowerCase()}`,
    caption: `Instagram Reel (${shortcode})`,
    views: 0,
    likes: 0,
    comments: 0,
    thumbnail: "",
  };
}