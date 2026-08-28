import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_\-]+)/);
    const shortcode = match ? match[1] : null;

    if (!shortcode) {
      return NextResponse.json({ error: "Invalid Instagram URL" }, { status: 400 });
    }

    const targetUrl = `https://www.instagram.com/p/${shortcode}/`;

    // 1. Coba lewat Native Meta OEMBED API
    try {
      const oembedRes = await fetch(
        `https://api.instagram.com/oembed/?url=${encodeURIComponent(targetUrl)}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          cache: "no-store",
        }
      );

      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.author_name) {
          return NextResponse.json({
            username: data.author_name.toLowerCase().trim(),
            caption: data.title || `Instagram Reel (${shortcode})`,
            thumbnail: data.thumbnail_url || "",
          });
        }
      }
    } catch (e) {
      console.warn("oEmbed fetch skipped:", e);
    }

    // 2. Fallback: Ekstraksi otomatis dari shortcode URL tanpa error
    const cleanShortcode = shortcode.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    return NextResponse.json({
      username: `ig_${cleanShortcode}`,
      caption: `Instagram Reel (${shortcode})`,
      thumbnail: "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process Instagram link" },
      { status: 500 }
    );
  }
}