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

  try {
    // Gunakan oEmbed official endpoint publik dari client browser
    const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedUrl);

    if (res.ok) {
      const data = await res.json();
      return {
        username: data.author_name || "",
        caption: data.title || "",
        views: 0,
        likes: 0,
        comments: 0,
        thumbnail: data.thumbnail_url || "",
      };
    }
  } catch (err) {
    console.warn("Client-side oEmbed fallback triggered");
  }

  // Fallback: Scrape langsung lewat DOM parser di browser
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const res = await fetch(embedUrl);
    if (res.ok) {
      const htmlText = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      const userEl = doc.querySelector(".UsernameText");
      const username = userEl ? userEl.textContent?.trim() || "" : "";

      const captionEl = doc.querySelector(".Caption");
      const caption = captionEl ? captionEl.textContent?.trim() || "" : "";

      const likesMatch = htmlText.match(/([\d,.]+)\s+likes/i);
      const likes = likesMatch ? parseInt(likesMatch[1].replace(/[,.]/g, ""), 10) : 0;

      return {
        username,
        caption,
        views: 0,
        likes,
        comments: 0,
        thumbnail: "",
      };
    }
  } catch (e) {
    console.error("Failed to parse Instagram embed client-side", e);
  }

  return null;
}