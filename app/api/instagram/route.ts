import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Ekstraksi shortcode dari URL Instagram
    const match = url.match(/\/(?:p|reel|reels)\/([A-Za-z0-9_\-]+)/);
    const shortcode = match ? match[1] : null;

    if (!shortcode) {
      return NextResponse.json({ error: "Invalid Instagram URL" }, { status: 400 });
    }

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "*/*",
      "X-IG-App-ID": "936619743392459",
    };

    // 1. Primary Attempt: Instagram Direct GraphQL API
    try {
      const embedUrl = `https://www.instagram.com/graphql/query/?doc_id=10015901848480574&variables=${encodeURIComponent(
        JSON.stringify({ shortcode })
      )}`;

      const res = await fetch(embedUrl, { headers, cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const media = json?.data?.xdt_shortcode_media;

        if (media?.owner?.username) {
          return NextResponse.json({
            username: media.owner.username.toLowerCase().trim(),
            caption:
              media.edge_media_to_caption?.edges[0]?.node?.text ||
              `Instagram Reel (${shortcode})`,
            thumbnail: media.display_url || "",
            likes: media.edge_media_preview_like?.count || 0,
            comments: media.edge_media_to_comment?.count || 0,
          });
        }
      }
    } catch (err) {
      console.warn("GraphQL Fetch failed, switching to oEmbed...");
    }

    // 2. Secondary Attempt: Official Instagram oEmbed API
    try {
      const oembedUrl = `https://api.instagram.com/oembed/?url=https://www.instagram.com/p/${shortcode}/`;
      const oembedRes = await fetch(oembedUrl, { headers, cache: "no-store" });

      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.author_name) {
          return NextResponse.json({
            username: oembedData.author_name.toLowerCase().trim(),
            caption: oembedData.title || `Instagram Reel (${shortcode})`,
            thumbnail: oembedData.thumbnail_url || "",
            likes: 0,
            comments: 0,
          });
        }
      }
    } catch (err) {
      console.warn("oEmbed Fetch failed, switching to Direct Scraping...");
    }

    // 3. Tertiary Attempt: HTML Meta Scraping
    try {
      const htmlRes = await fetch(`https://www.instagram.com/p/${shortcode}/`, {
        headers,
        cache: "no-store",
      });

      if (htmlRes.ok) {
        const html = await htmlRes.text();
        
        // Match @username dari title atau meta tag
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        const rawTitle = titleMatch?.[1] || ogTitleMatch?.[1] || "";
        
        const userMatch = rawTitle.match(/@([A-Za-z0-9._]+)/) || rawTitle.match(/^([^(]+)/);
        const scrapedUser = userMatch ? userMatch[1].replace(/[^A-Za-z0-9._]/g, "") : null;

        if (scrapedUser && scrapedUser.toLowerCase() !== "instagram") {
          return NextResponse.json({
            username: scrapedUser.toLowerCase().trim(),
            caption: `Instagram Reel (${shortcode})`,
            thumbnail: "",
            likes: 0,
            comments: 0,
          });
        }
      }
    } catch (err) {
      console.warn("Direct scraping failed, falling back to default response.");
    }

    // Final Fallback jika semua metode scraping terblokir
    return NextResponse.json({
      username: `ig_${shortcode.toLowerCase()}`,
      caption: `Instagram Reel (${shortcode})`,
      thumbnail: "",
      likes: 0,
      comments: 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process Instagram link" },
      { status: 500 }
    );
  }
}