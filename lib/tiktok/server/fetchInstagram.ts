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

  // 1. Coba via JSONP / Public OEmbed endpoint
  try {
    const res = await fetch(`https://api.instagram.com/oembed/?url=${encodeURIComponent(targetUrl)}`, {
      mode: "cors",
    });
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
  } catch {
    // Ignore CORS error and move to next fallback
  }

  // 2. Fallback: Ekstraksi via JSONP script tag injection (Memotong blokir CORS Browser)
  return new Promise((resolve) => {
    const callbackName = `jsonp_ig_${shortcode}_${Date.now()}`;
    const script = document.createElement("script");

    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete (window as any)[callbackName];
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 4000);

    (window as any)[callbackName] = (data: any) => {
      clearTimeout(timer);
      cleanup();
      if (data && data.author_name) {
        resolve({
          username: data.author_name.toLowerCase().trim(),
          caption: data.title || "",
          views: 0,
          likes: 0,
          comments: 0,
          thumbnail: data.thumbnail_url || "",
        });
      } else {
        resolve(null);
      }
    };

    script.src = `https://api.instagram.com/oembed/?url=${encodeURIComponent(targetUrl)}&callback=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve(null);
    };

    document.body.appendChild(script);
  });
}