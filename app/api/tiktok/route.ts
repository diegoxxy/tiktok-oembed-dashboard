import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { videoUrls, targetHashtag }: { videoUrls: string[]; targetHashtag: string } = body;

    // Validasi input
    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return NextResponse.json({ error: 'Masukkan minimal 1 URL video TikTok' }, { status: 400 });
    }

    if (!targetHashtag) {
      return NextResponse.json({ error: 'Hashtag target tidak boleh kosong' }, { status: 400 });
    }

    const cleanHashtag = targetHashtag.toLowerCase().replace('#', '').trim();

    // Panggil TikTok Official oEmbed API untuk setiap URL secara paralel
    const promises = videoUrls.map(async (rawUrl) => {
      const url = rawUrl.trim();
      if (!url) return null;

      try {
        const oembedRes = await fetch(
          `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
          { next: { revalidate: 3600 } } // Cache response selama 1 jam
        );

        if (!oembedRes.ok) return null;

        const data = await oembedRes.json();

        return {
          id: data.embed_product_id || url,
          title: data.title || '',
          authorName: data.author_name || '',
          authorUrl: data.author_url || '',
          coverUrl: data.thumbnail_url || '',
          videoUrl: url,
        };
      } catch {
        return null;
      }
    });

    const fetchedVideos = (await Promise.all(promises)).filter(Boolean);

    // Filter video yang mengandung hashtag syarat pada caption
    const qualifiedVideos = fetchedVideos.filter((vid) =>
      vid?.title.toLowerCase().includes(`#${cleanHashtag}`)
    );

    return NextResponse.json({
      hashtag: `#${cleanHashtag}`,
      metrics: {
        totalSubmitted: videoUrls.length,
        totalQualified: qualifiedVideos.length,
      },
      videos: qualifiedVideos,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}