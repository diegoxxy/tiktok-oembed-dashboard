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

  // 1. Coba lewat Proxy HTML AllOrigins (Ekstrak meta tags og:title & og:image)
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

        // Ekstrak Meta Tag Title
        const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
        if (ogTitleMatch) {
          const rawTitle = ogTitleMatch[1];
          caption = rawTitle;

          // Ekstrak username dari format "@username"
          const userMatch = rawTitle.match(/@([a-zA-Z0-9_.]+)/) || rawTitle.match(/^([^•:(]+)/);
          if (userMatch) {
            username = userMatch[1].replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase().trim();
          }
        }

        // Ekstrak Meta Tag Image
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

  // 2. Fallback: Parse HTML Iframe Embed (Teknik CorsProxy)
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const corsProxyEmbed = `https://corsproxy.io/?${encodeURIComponent(embedUrl)}`;

    const res = await fetch(corsProxyEmbed);
    if (res.ok) {
      const htmlText = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, "text/html");

      const userEl = doc.querySelector(".UsernameText") || doc.querySelector("a.Username");
      const username = userEl ? userEl.textContent?.trim().replace("@", "").toLowerCase() || "" : "";

      const captionEl = doc.querySelector(".Caption");
      const caption = captionEl ? captionEl.textContent?.trim() || "" : "";

      const likesMatch = htmlText.match(/([\d,.]+)\s+likes/i);
      const likes = likesMatch ? parseInt(likesMatch[1].replace(/[,.]/g, ""), 10) : 0;

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