import { NextResponse } from 'next/server';

// Helper delay untuk menghindari rate limit
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Unshorten URL vt.tiktok.com menjadi URL lengkap
async function resolveTikTokUrl(url: string): Promise<string> {
  const cleanUrl = url.trim();
  if (!cleanUrl.includes('vt.tiktok.com') && !cleanUrl.includes('vm.tiktok.com')) {
    return cleanUrl;
  }
  try {
    const res = await fetch(cleanUrl, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    return res.url || cleanUrl;
  } catch {
    return cleanUrl;
  }
}

async function fetchTikTokData(rawUrl: string) {
  try {
    // 1. Dapatkan Full Desktop URL dari Shortlink
    const fullUrl = await resolveTikTokUrl(rawUrl);

    // 2. Coba via TikWM API (Cara 1)
    try {
      const tikwmRes = await fetch('https://www.tikwm.com/api/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        body: new URLSearchParams({ url: fullUrl, hd: '1' }),
        cache: 'no-store',
      });

      if (tikwmRes.ok) {
        const resData = await tikwmRes.json();
        if (resData.code === 0 && resData.data) {
          const data = resData.data;
          const username = (data.author?.unique_id || data.author?.nickname || 'unknown').toLowerCase();
          return {
            id: data.id || fullUrl,
            title: data.title || '',
            authorName: username,
            authorDisplayName: data.author?.nickname || username,
            authorUrl: `https://www.tiktok.com/@${username}`,
            coverUrl: data.cover || data.origin_cover || '',
            videoUrl: fullUrl,
            views: Number(data.play_count) || 0,
          };
        }
      }
    } catch {
      // lanjut ke fallback jika TikWM error/timeout
    }

    // 3. Fallback: Direct Scraping HTML Full Desktop URL (Cara 2)
    const oembedRes = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(fullUrl)}`
    );
    if (!oembedRes.ok) return null;
    const oembedData = await oembedRes.json();

    let playCount = 0;
    try {
      const htmlRes = await fetch(fullUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (htmlRes.ok) {
        const htmlText = await htmlRes.text();
        const match =
          htmlText.match(/"playCount":\s*(\d+)/) ||
          htmlText.match(/"play_count":\s*(\d+)/) ||
          htmlText.match(/"viewsCount":\s*(\d+)/);
        if (match && match[1]) {
          playCount = parseInt(match[1], 10);
        }
      }
    } catch {
      playCount = 0;
    }

    // Ekstrak username unik dari URL jika ada (@username)
    const urlMatch = fullUrl.match(/@([^/]+)/);
    const extractedUsername = urlMatch ? urlMatch[1].toLowerCase() : oembedData.author_name.toLowerCase();

    return {
      id: oembedData.embed_product_id || fullUrl,
      title: oembedData.title || '',
      authorName: extractedUsername,
      authorDisplayName: oembedData.author_name || extractedUsername,
      authorUrl: oembedData.author_url || `https://www.tiktok.com/@${extractedUsername}`,
      coverUrl: oembedData.thumbnail_url || '',
      videoUrl: fullUrl,
      views: playCount,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { videoUrls, targetHashtag }: { videoUrls: string[]; targetHashtag: string } = body;

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return NextResponse.json({ error: 'Masukkan minimal 1 URL video TikTok' }, { status: 400 });
    }

    if (!targetHashtag) {
      return NextResponse.json({ error: 'Hashtag target tidak boleh kosong' }, { status: 400 });
    }

    const cleanHashtag = targetHashtag.toLowerCase().replace('#', '').trim();

    // Proses request satu per satu dengan delay singkat agar stabil
    const fetchedVideos = [];
    for (const url of videoUrls) {
      const data = await fetchTikTokData(url);
      if (data) fetchedVideos.push(data);
      await delay(400); // jeda 0.4 detik per request
    }

    // Filter berdasarkan hashtag
    const qualifiedVideos = fetchedVideos.filter((vid) =>
      vid?.title.toLowerCase().includes(`#${cleanHashtag}`)
    );

    // Grouping berdasarkan Username TikTok (Normalisasi ke Lowercase)
    const creatorsMap: {
      [key: string]: { authorName: string; authorUrl: string; videos: any[]; totalViews: number };
    } = {};

    qualifiedVideos.forEach((vid) => {
      if (!vid) return;
      const key = vid.authorName.toLowerCase().replace('@', '');
      if (!creatorsMap[key]) {
        creatorsMap[key] = {
          authorName: key,
          authorUrl: vid.authorUrl,
          videos: [],
          totalViews: 0,
        };
      }
      creatorsMap[key].videos.push(vid);
      creatorsMap[key].totalViews += vid.views;
    });

    const creators = Object.values(creatorsMap);
    const totalGlobalViews = qualifiedVideos.reduce((acc, v) => acc + (v?.views || 0), 0);

    return NextResponse.json({
      hashtag: `#${cleanHashtag}`,
      globalMetrics: {
        totalSubmitted: videoUrls.length,
        totalQualified: qualifiedVideos.length,
        totalViews: totalGlobalViews,
        totalCreators: creators.length,
      },
      creators: creators,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}