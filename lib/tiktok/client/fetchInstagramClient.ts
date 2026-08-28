export interface InstagramClientMetric {
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
}

/**
 * Fetch Instagram metadata via public API proxies (Client-side directly)
 */
export async function fetchInstagramDataClient(url: string): Promise<InstagramClientMetric | null> {
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_\-]+)/);
  const shortcode = match ? match[1] : null;
  if (!shortcode) return null;

  // 1. Coba via DDInstagram Open API Proxy
  try {
    const res = await fetch(`https://api.ddinstagram.com/posts/${shortcode}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.author_name || data.username || data.post)) {
        const username = (data.author_name || data.username || data.post?.user?.username || "").toLowerCase().trim();
        const caption = data.caption || data.post?.caption || `Instagram Reel (${shortcode})`;
        const likes = data.likes || data.post?.likes || 0;
        const comments = data.comments || data.post?.comments || 0;
        const thumbnail = data.thumbnail_url || data.post?.display_url || "";

        if (username) {
          return { username, caption, views: 0, likes, comments, thumbnail };
        }
      }
    }
  } catch (err) {
    console.warn("DDInstagram API proxy failed, trying fallback 2...", err);
  }

  // 2. Coba via VxTikTok/FixupInstagram API Proxy
  try {
    const res = await fetch(`https://api.vxtiktok.com/info?url=${encodeURIComponent(`https://www.instagram.com/reel/${shortcode}/`)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.user_name || data.author_name)) {
        const username = (data.user_name || data.author_name).toLowerCase().trim();
        return {
          username,
          caption: data.text || `Instagram Reel (${shortcode})`,
          views: data.views || 0,
          likes: data.likes || 0,
          comments: data.comment_count || 0,
          thumbnail: data.cover_url || "",
        };
      }
    }
  } catch (err) {
    console.warn("VxInstagram API proxy failed, trying internal API fallback...", err);
  }

  // 3. Fallback terakhir ke Internal API Server
  try {
    const res = await fetch("/api/instagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.username) {
        return {
          username: data.username,
          caption: data.caption || "",
          views: 0,
          likes: 0,
          comments: 0,
          thumbnail: data.thumbnail || "",
        };
      }
    }
  } catch (err) {
    console.error("Internal API fallback failed:", err);
  }

  return null;
}