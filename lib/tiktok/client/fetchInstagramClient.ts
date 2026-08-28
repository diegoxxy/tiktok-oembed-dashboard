export interface InstagramClientMetric {
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
}

/**
 * Fetch Instagram metadata via specialized public JSON engines
 */
export async function fetchInstagramDataClient(
  url: string
): Promise<InstagramClientMetric | null> {
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_\-]+)/);
  const shortcode = match ? match[1] : null;
  if (!shortcode) return null;

  // 1. Coba vxinstagram JSON API
  try {
    const res = await fetch(`https://api.vxinstagram.com/post/${shortcode}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.user?.username || data?.author) {
        const username = (data.user?.username || data.author).toLowerCase().trim();
        return {
          username,
          caption: data.caption || `Instagram Reel (${shortcode})`,
          views: data.views || 0,
          likes: data.likes || 0,
          comments: data.comments || 0,
          thumbnail: data.media_urls?.[0] || "",
        };
      }
    }
  } catch (e) {
    console.warn("VxInstagram engine failed...", e);
  }

  // 2. Coba ddinstagram JSON Engine
  try {
    const res = await fetch(`https://api.ddinstagram.com/posts/${shortcode}`);
    if (res.ok) {
      const data = await res.json();
      const user = data?.username || data?.author_name || data?.post?.user?.username;
      if (user) {
        return {
          username: user.toLowerCase().trim(),
          caption: data.caption || `Instagram Reel (${shortcode})`,
          views: data.views || 0,
          likes: data.likes || 0,
          comments: data.comments || 0,
          thumbnail: data.thumbnail_url || "",
        };
      }
    }
  } catch (e) {
    console.warn("DDInstagram engine failed...", e);
  }

  // Fallback: Gunakan kelompok nama 'Instagram Creator' agar tidak membentuk folder username acak
  return {
    username: "instagram_creator",
    caption: `Instagram Reel (${shortcode})`,
    views: 0,
    likes: 0,
    comments: 0,
    thumbnail: "",
  };
}