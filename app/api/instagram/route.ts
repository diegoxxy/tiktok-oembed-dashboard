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

    // 1. Coba lewat Native Meta API
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

    // 2. Server Scrape HTML Meta Tag Fallback
    const htmlRes = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      },
      cache: "no-store",
    });

    if (htmlRes.ok) {
      const html = await htmlRes.text();

      // Extract username from og:title or og:description
      const ogTitleMatch = html.match(/property="og:title"\s+content="([^"]+)"/i);
      const ogDescMatch = html.match(/property="og:description"\s+content="([^"]+)"/i);

      let username = "";
      let caption = "";

      if (ogTitleMatch) {
        // Format biasa: "Username on Instagram: 'Caption...'"
        const titleText = ogTitleMatch[1];
        const userExtract = titleText.match(/^([^(@]+)(?:\s*\(@([^)]+)\))?/);
        if (userExtract) {
          username = (userExtract[2] || userExtract[1]).replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase();
        }
      }

      if (ogDescMatch) {
        caption = ogDescMatch[1];
        if (!username) {
          const handleMatch = caption.match(/@([a-zA-Z0-9_.]+)/);
          if (handleMatch) username = handleMatch[1].toLowerCase();
        }
      }

      if (username) {
        return NextResponse.json({
          username,
          caption: caption || `Instagram Reel (${shortcode})`,
          thumbnail: "",
        });
      }
    }

    // Jika gagal total, ekstrak shortcode tanpa prefiks ig_reel_ agar tetap berupa identifier bersih
    return NextResponse.json({
      username: `user_${shortcode.toLowerCase()}`,
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