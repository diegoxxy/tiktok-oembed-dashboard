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

  // 1. Menggunakan CORS Proxy AllOrigins untuk oEmbed Official
  try {
    const oembedOfficial = `https://api.instagram.com/oembed/?url=${encodeURIComponent(targetUrl)}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(oembedOfficial)}`;
    
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const wrapper = await res.json();
      if (wrapper.contents) {
        const data = JSON.parse(wrapper.contents);
        if (data.author_name) {
          return {
            username: data.author_name.toLowerCase().trim(),
            caption: data.title || "",
            views: 0,
            likes: 0,
            comments: 0,
            thumbnail: data.thumbnail_url || "",
          };
        }
      }
    }
  } catch (err) {
    console.warn("Client oEmbed via AllOrigins failed:", err);
  }

  // 2. Fallback Secondary Proxy (corsproxy.io)
  try {
    const oembedOfficial = `https://api.instagram.com/oembed/?url=${encodeURIComponent(targetUrl)}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(oembedOfficial)}`;

    const res = await fetch(proxyUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.author_name) {
        return {
          username: data.author_name.toLowerCase().trim(),
          caption: data.title || "",
          views: 0,
          likes: 0,
          comments: 0,
          thumbnail: data.thumbnail_url || "",
        };
      }
    }
  } catch (err) {
    console.warn("Client oEmbed via CORSProxy failed:", err);
  }

  return null;
}