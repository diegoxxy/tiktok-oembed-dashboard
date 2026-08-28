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

    // Direct GraphQL Embed Info Request (Bypass Anti-Bot)
    const embedUrl = `https://www.instagram.com/graphql/query/?doc_id=10015901848480574&variables=${encodeURIComponent(
      JSON.stringify({ shortcode })
    )}`;

    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "*/*",
        "X-IG-App-ID": "936619743392459",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const media = json?.data?.xdt_shortcode_media;

      if (media) {
        const username = media.owner?.username || "";
        const caption =
          media.edge_media_to_caption?.edges[0]?.node?.text ||
          `Instagram Reel (${shortcode})`;
        const thumbnail = media.display_url || "";
        const likes = media.edge_media_preview_like?.count || 0;
        const comments = media.edge_media_to_comment?.count || 0;

        if (username) {
          return NextResponse.json({
            username: username.toLowerCase().trim(),
            caption,
            thumbnail,
            likes,
            comments,
          });
        }
      }
    }

    // Fallback Secondary: Instagram Oembed Official
    const oembedUrl = `https://api.instagram.com/oembed/?url=https://www.instagram.com/p/${shortcode}/`;
    const oembedRes = await fetch(oembedUrl, { cache: "no-store" });
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