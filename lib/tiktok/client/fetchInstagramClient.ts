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

  const targetUrl = `https://www.instagram.com/p/${shortcode}/`;

  // 1. Coba lewat Proxy HTML AllOrigins
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, { cache: "no-store" });

    if (res.ok) {
      const data = await res.json();
      const html = data.contents;

      if (html && typeof html === "string") {
        let username = "";
        let caption = `Instagram Reel (${shortcode})`;
        let thumbnail = "";

        const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
        if (ogTitleMatch) {
          const rawTitle = ogTitleMatch[1];
          caption = rawTitle;

          const userMatch = rawTitle.match(/@([a-zA-Z0-9_.]+)/) || rawTitle.match(/^([^•:(]+)/);
          if (userMatch) {
            username = userMatch[1].replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase().trim();
          }
        }

        const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
        if (ogImageMatch) {
          thumbnail = ogImageMatch[1].replace(/&amp;/g, "&");
        }

        if (username) {
          return {
            username,
            caption,
            views: 0,
            likes: 0,
            comments: 0,
            thumbnail,
          };
        }
      }
    }
  } catch (err) {
    console.warn("Client fallback scraping via AllOrigins failed:", err);
  }

  // 2. Fallback Ultimate: Ekstrak minimal dari URL agar tidak menjadi 'unknown'
  // Jika Instagram memblokir scraping, set setidaknya ID Shortcode sebagai identitas
  return {
    username: `ig_post_${shortcode.slice(0, 6)}`,
    caption: `Instagram Reel (${shortcode})`,
    views: 0,
    likes: 0,
    comments: 0,
    thumbnail: "",
  };
}