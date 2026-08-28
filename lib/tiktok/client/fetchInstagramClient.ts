export interface InstagramClientMetric {
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
}

export async function fetchInstagramDataClient(url: string): Promise<InstagramClientMetric | null> {
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[1] : null;
  if (!shortcode) return null;

  const targetUrl = `https://www.instagram.com/p/${shortcode}/`;

  // 1. Provider Utama: NoEmbed API (Mengembalikan metadata public termasuk author_name)
  try {
    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.author_name && !data.error) {
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
    console.warn("NoEmbed provider failed:", err);
  }

  // 2. Provider Cadangan: CorsProxy + Meta OpenGraph Direct Extraction
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(embedUrl)}`;
    
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const htmlText = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      const userEl = doc.querySelector(".UsernameText") || doc.querySelector("a.Username");
      let username = userEl ? userEl.textContent?.trim().replace("@", "").toLowerCase() || "" : "";

      if (!username) {
        const titleMatch = htmlText.match(/@([a-zA-Z0-9_.]+)/);
        if (titleMatch) username = titleMatch[1].toLowerCase();
      }

      const captionEl = doc.querySelector(".Caption");
      const caption = captionEl ? captionEl.textContent?.trim() || "" : "";

      const imgEl = doc.querySelector("img.EmbeddedMediaImage") as HTMLImageElement;
      const thumbnail = imgEl ? imgEl.src : "";

      if (username) {
        return {
          username,
          caption: caption || `Instagram Reel (${shortcode})`,
          views: 0,
          likes: 0,
          comments: 0,
          thumbnail,
        };
      }
    }
  } catch (err) {
    console.warn("Iframe scraping failed:", err);
  }

  return null;
}