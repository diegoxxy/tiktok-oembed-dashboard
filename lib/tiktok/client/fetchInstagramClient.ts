export interface InstagramClientMetric {
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
}

/**
 * Fetch metadata Instagram langsung dari browser pengguna
 */
export async function fetchInstagramDataClient(url: string): Promise<InstagramClientMetric | null> {
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[1] : null;
  if (!shortcode) return null;

  // 1. Coba lewat oEmbed dengan CORS Proxy agar tidak diblokir browser
  try {
    const targetOembed = `https://api.instagram.com/oembed/?url=${encodeURIComponent(`https://www.instagram.com/p/${shortcode}/`)}`;
    const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetOembed)}`;
    
    const res = await fetch(corsProxyUrl);

    if (res.ok) {
      const data = await res.json();
      if (data.author_name) {
        return {
          username: data.author_name,
          caption: data.title || "",
          views: 0,
          likes: 0,
          comments: 0,
          thumbnail: data.thumbnail_url || "",
        };
      }
    }
  } catch (err) {
    console.warn("CORS oEmbed failed, falling back to iframe scraping:", err);
  }

  // 2. Fallback: Parse HTML dari Instagram Iframe Embed
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const corsProxyEmbed = `https://corsproxy.io/?${encodeURIComponent(embedUrl)}`;
    
    const res = await fetch(corsProxyEmbed);
    if (res.ok) {
      const htmlText = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      // Extract Username
      const userEl = doc.querySelector(".UsernameText") || doc.querySelector("a.Username");
      const username = userEl ? userEl.textContent?.trim().replace("@", "") || "" : "";

      // Extract Caption
      const captionEl = doc.querySelector(".Caption");
      const caption = captionEl ? captionEl.textContent?.trim() || "" : "";

      // Extract Likes
      const likesMatch = htmlText.match(/([\d,.]+)\s+likes/i);
      const likes = likesMatch ? parseInt(likesMatch[1].replace(/[,.]/g, ""), 10) : 0;

      // Extract Thumbnail dari meta tag / img tag di iframe
      const imgEl = doc.querySelector("img.EmbeddedMediaImage") as HTMLImageElement;
      const thumbnail = imgEl ? imgEl.src : "";

      if (username) {
        return {
          username,
          caption,
          views: 0,
          likes,
          comments: 0,
          thumbnail,
        };
      }
    }
  } catch (e) {
    console.error("Gagal parse Instagram iframe embed:", e);
  }

  return null;
}