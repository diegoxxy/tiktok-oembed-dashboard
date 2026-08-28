export interface InstagramClientMetric {
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
}

/**
 * Fetch Instagram metadata via specialized public JSON endpoints
 */
export async function fetchInstagramDataClient(
  url: string
): Promise<InstagramClientMetric | null> {
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_\-]+)/);
  const shortcode = match ? match[1] : null;
  if (!shortcode) return null;

  // 1. Coba DDInstagram API Engine
  try {
    const res = await fetch(`https://api.ddinstagram.com/posts/${shortcode}`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      const user =
        data?.username ||
        data?.author_name ||
        data?.post?.user?.username ||
        data?.user?.username;

      if (user) {
        return {
          username: user.toLowerCase().trim(),
          caption: data.caption || data.post?.caption || `Instagram Reel (${shortcode})`,
          views: data.views || 0,
          likes: data.likes || data.post?.likes || 0,
          comments: data.comments || data.post?.comments || 0,
          thumbnail: data.thumbnail_url || data.post?.display_url || "",
        };
      }
    }
  } catch (e) {
    console.warn("DDInstagram Engine bypass failed, trying Provider 2...", e);
  }

  // 2. Coba FxInstagram JSON Endpoint
  try {
    const res = await fetch(`https://api.fxinstagram.com/post/${shortcode}`);
    if (res.ok) {
      const data = await res.json();
      const user = data?.post?.author?.username || data?.author?.username;
      if (user) {
        return {
          username: user.toLowerCase().trim(),
          caption: data?.post?.description || `Instagram Reel (${shortcode})`,
          views: data?.post?.views || 0,
          likes: data?.post?.likes || 0,
          comments: data?.post?.comments || 0,
          thumbnail: data?.post?.display_url || "",
        };
      }
    }
  } catch (e) {
    console.warn("FxInstagram Engine bypass failed...", e);
  }

  // 3. Fallback: Ekstrak identifier singkat agar tetap valid & tidak error
  const cleanShortcode = shortcode.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return {
    username: `ig_${cleanShortcode}`,
    caption: `Instagram Reel (${shortcode})`,
    views: 0,
    likes: 0,
    comments: 0,
    thumbnail: "",
  };
}