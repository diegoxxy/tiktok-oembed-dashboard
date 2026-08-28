export interface InstagramClientMetric {
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
}

/**
 * Robust Client-side Instagram Extractor
 */
export async function fetchInstagramDataClient(url: string): Promise<InstagramClientMetric | null> {
  // Regex untuk mencakup shortcode Instagram (termasuk trailing slash)
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_\-]+)/);
  const shortcode = match ? match[1] : null;
  if (!shortcode) return null;

  const targetUrl = `https://www.instagram.com/p/${shortcode}/`;

  // 1. Provider Utama: NoEmbed API
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.author_name && !data.error) {
        const username = data.author_name.toLowerCase().replace(/[^a-z0-9_.]/g, "").trim();
        return {
          username: username || `ig_user_${shortcode.slice(0, 6)}`,
          caption: data.title || `Instagram Reel (${shortcode})`,
          views: 0,
          likes: 0,
          comments: 0,
          thumbnail: data.thumbnail_url || "",
        };
      }
    }
  } catch (err) {
    console.warn("NoEmbed provider failed:", err);
  }

  // 2. Provider Cadangan: CorsProxy + AllOrigins Embed Scraper
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(embedUrl)}`;
    
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const data = await res.json();
      const htmlText = data.contents || "";
      
      const userMatch = htmlText.match(/class="UsernameText"[^>]*>([^<]+)</) || htmlText.match(/@([a-zA-Z0-9_.]+)/);
      let username = userMatch ? userMatch[1].toLowerCase().replace(/[^a-z0-9_.]/g, "").trim() : "";

      const captionMatch = htmlText.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/) || htmlText.match(/class="Caption"[^>]*>([^<]+)</);
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
    console.warn("Client proxy extraction failed:", err);
  }

  // 3. Fallback Darurat: Gunakan shortcode sebagai ID Username sementara
  const cleanShortcode = shortcode.replace(/[^a-zA-Z0-9]/g, "");
  return {
    username: `ig_reel_${cleanShortcode}`,
    caption: `Instagram Reel (${shortcode})`,
    views: 0,
    likes: 0,
    comments: 0,
    thumbnail: "",
  };
}