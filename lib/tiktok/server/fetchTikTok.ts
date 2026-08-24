import type { VideoItem } from "../types";

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Ubah shortlink vt.tiktok.com / vm.tiktok.com jadi URL desktop penuh. */
async function resolveTikTokUrl(url: string): Promise<string> {
  const cleanUrl = url.trim();
  if (!cleanUrl.includes("vt.tiktok.com") && !cleanUrl.includes("vm.tiktok.com")) {
    return cleanUrl;
  }
  try {
    const res = await fetch(cleanUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": DESKTOP_UA },
    });
    return res.url || cleanUrl;
  } catch {
    return cleanUrl;
  }
}

interface RawFetchOutcome {
  ok: boolean;
  rateLimited?: boolean;
  data?: Omit<VideoItem, "sourceUrl" | "status" | "errorMessage">;
  errorMessage?: string;
}

/** Satu percobaan fetch — tanpa retry. */
async function fetchTikTokOnce(rawUrl: string): Promise<RawFetchOutcome> {
  const fullUrl = await resolveTikTokUrl(rawUrl);

  // Cara 1: TikWM (biasanya sudah termasuk play_count & avatar kreator).
  try {
    const tikwmRes = await fetch("https://www.tikwm.com/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: new URLSearchParams({ url: fullUrl, hd: "1" }),
      cache: "no-store",
    });

    if (tikwmRes.status === 429) {
      return { ok: false, rateLimited: true, errorMessage: "Rate limited oleh TikWM" };
    }

    if (tikwmRes.ok) {
      const resData = await tikwmRes.json();
      if (resData.code === 0 && resData.data) {
        const data = resData.data;
        const username = (data.author?.unique_id || data.author?.nickname || "unknown").toLowerCase();
        return {
          ok: true,
          data: {
            id: String(data.id || fullUrl),
            title: data.title || "",
            authorName: username,
            authorDisplayName: data.author?.nickname || username,
            authorUrl: `https://www.tiktok.com/@${username}`,
            authorAvatar: data.author?.avatar || "",
            coverUrl: data.cover || data.origin_cover || "",
            videoUrl: fullUrl,
            views: Number(data.play_count) || 0,
          },
        };
      }
      // TikWM merespons tapi videonya tidak valid (private/dihapus/dsb).
      if (resData.msg) {
        return { ok: false, errorMessage: String(resData.msg) };
      }
    }
  } catch {
    // lanjut ke fallback
  }

  // Cara 2: oEmbed resmi TikTok + scraping HTML untuk playCount.
  try {
    const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(fullUrl)}`);
    if (!oembedRes.ok) {
      return { ok: false, errorMessage: "Video tidak ditemukan / privat (oEmbed gagal)" };
    }
    const oembedData = await oembedRes.json();

    let playCount = 0;
    try {
      const htmlRes = await fetch(fullUrl, {
        headers: { "User-Agent": DESKTOP_UA, "Accept-Language": "en-US,en;q=0.9" },
      });
      if (htmlRes.ok) {
        const htmlText = await htmlRes.text();
        const match =
          htmlText.match(/"playCount":\s*(\d+)/) ||
          htmlText.match(/"play_count":\s*(\d+)/) ||
          htmlText.match(/"viewsCount":\s*(\d+)/);
        if (match?.[1]) playCount = parseInt(match[1], 10);
      }
    } catch {
      playCount = 0;
    }

    const urlMatch = fullUrl.match(/@([^/]+)/);
    const extractedUsername = urlMatch
      ? urlMatch[1].toLowerCase()
      : (oembedData.author_name || "unknown").toLowerCase();

    return {
      ok: true,
      data: {
        id: String(oembedData.embed_product_id || fullUrl),
        title: oembedData.title || "",
        authorName: extractedUsername,
        authorDisplayName: oembedData.author_name || extractedUsername,
        authorUrl: oembedData.author_url || `https://www.tiktok.com/@${extractedUsername}`,
        authorAvatar: "",
        coverUrl: oembedData.thumbnail_url || "",
        videoUrl: fullUrl,
        views: playCount,
      },
    };
  } catch {
    return { ok: false, errorMessage: "Gagal mengambil data dari TikTok" };
  }
}

/**
 * Fetch dengan retry (maks 2x ulang, backoff singkat) — sesuai spec
 * "Asynchronous Queue & Retry Mechanism". Selalu mengembalikan VideoItem,
 * tidak pernah null, supaya video yang gagal tetap terlihat statusnya
 * di UI (Error/Private) alih-alih hilang diam-diam.
 */
export async function fetchTikTokDataWithRetry(
  sourceUrl: string,
  targetHashtagLower: string,
  maxRetries = 2
): Promise<VideoItem> {
  let lastError = "Gagal memproses URL";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const outcome = await fetchTikTokOnce(sourceUrl);

    if (outcome.ok && outcome.data) {
      const isQualified = outcome.data.title.toLowerCase().includes(`#${targetHashtagLower}`);
      return {
        ...outcome.data,
        sourceUrl,
        status: isQualified ? "qualified" : "unqualified",
      };
    }

    lastError = outcome.errorMessage || lastError;

    if (attempt < maxRetries) {
      await delay(outcome.rateLimited ? 800 * (attempt + 1) : 350);
    }
  }

  return {
    id: sourceUrl,
    sourceUrl,
    videoUrl: sourceUrl,
    title: "",
    authorName: "unknown",
    authorDisplayName: "unknown",
    authorUrl: "",
    authorAvatar: "",
    coverUrl: "",
    views: 0,
    status: "error",
    errorMessage: lastError,
  };
}
