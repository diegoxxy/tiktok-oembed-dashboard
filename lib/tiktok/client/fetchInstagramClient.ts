export interface InstagramClientMetric {
  username: string;
  views: number;
  likes: number;
  comments: number;
  caption: string;
  thumbnail: string;
}

/**
 * Fetch metadata Instagram langsung dari DOM Iframe / oEmbed resmi
 */
export async function fetchInstagramDataClient(url: string): Promise<InstagramClientMetric | null> {
  const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[1] : null;
  if (!shortcode) return null;

  const targetUrl = `https://www.instagram.com/p/${shortcode}/`;

  // 1. Ekstraksi via JSONP Script Tag ke Instagram oEmbed (Bypass CORS)
  const dataFromOembed = await new Promise<any>((resolve) => {
    const callbackName = `jsonp_ig_${shortcode.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
    const script = document.createElement("script");

    const cleanup = () => {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete (window as any)[callbackName];
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 5000);

    (window as any)[callbackName] = (data: any) => {
      clearTimeout(timer);
      cleanup();
      resolve(data);
    };

    script.src = `https://api.instagram.com/oembed/?url=${encodeURIComponent(targetUrl)}&callback=${callbackName}`;
    script.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve(null);
    };

    document.body.appendChild(script);
  });

  if (dataFromOembed && dataFromOembed.author_name) {
    const username = dataFromOembed.author_name.toLowerCase().trim();
    return {
      username,
      caption: dataFromOembed.title || `Instagram Reel (${shortcode})`,
      views: 0,
      likes: 0,
      comments: 0,
      thumbnail: dataFromOembed.thumbnail_url || "",
    };
  }

  // 2. Jika JSONP gagal, kembalikan null agar ditangani UI / fallback khusus
  return null;
}