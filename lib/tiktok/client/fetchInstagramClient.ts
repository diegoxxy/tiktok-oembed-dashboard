export interface InstagramClientMetric {
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
}

/**
 * Fetch Instagram Data via Internal Server Route
 */
export async function fetchInstagramDataClient(url: string): Promise<InstagramClientMetric | null> {
  try {
    const res = await fetch("/api/instagram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) return null;

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
  } catch (err) {
    console.error("Gagal menghubungi endpoint /api/instagram:", err);
  }

  return null;
}