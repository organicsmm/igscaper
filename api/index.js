export const config = {
  runtime: "edge",
};

export default async function handler(request) {
  const url = new URL(request.url);
  
  // Normalize path (handle direct call or Vercel internal /api path rewrite)
  let path = url.pathname;
  if (path.startsWith("/api")) {
    path = path.slice(4);
  }
  if (!path) {
    path = "/";
  }

  const username = url.searchParams.get("username");

  // ✅ CORS Headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // ✅ OPTIONS preflight request handle
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (path === "/") {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Instagram Scraper API - by @s4chiz</title>
        <link rel="icon" href="https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png" type="image/png">
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f5f7fa;
            margin: 0;
            padding: 2rem;
            color: #333;
          }
          h1 { color: #111; }
          code {
            background: #eee;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 14px;
          }
          .section {
            margin-bottom: 2rem;
          }
          footer {
            margin-top: 3rem;
            font-size: 14px;
            color: #555;
          }
          a {
            color: #0072ff;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <h1>📸 Instagram Info Api </h1>
        <p>Created by <a href="https://t.me/anshapi" target="_blank">@s4chiz</a></p>
  
        <div class="section">
          <h2>📘 Usage</h2>
          <p>Add <code>?username=&lt;insta_username&gt;</code> to any of the following endpoints:</p>
          <ul>
            <li><code>/info</code> – Get basic profile info</li>
            <li><code>/posts</code> – Get latest posts</li>
            <li><code>/reelsexport</code> – Get latest reel</li>
            <li><code>/stories</code> – Get active stories</li>
          </ul>
          <p><b>Example:</b> <code>/info?username=instagram</code></p>
        </div>
  
        <div class="section">
          <h2>🔐 Auth</h2>
          <p>Pre-authenticated with a session cookie for private content (reels, stories).</p>
        </div>
  
        <footer>
          © 2025 <a href="https://t.me/anshapi" target="_blank">AnshAPI</a>. Built for educational use.
        </footer>
      </body>
      </html>
    `;
    return new Response(html, {
      headers: { "Content-Type": "text/html", ...corsHeaders },
    });
  }

  // ✅ Image Proxy — Instagram CDN images browser me directly load nahi hoti
  if (path === "/proxy") {
    const imageUrl = url.searchParams.get("url");
    if (!imageUrl) {
      return new Response("Missing url parameter", { status: 400, headers: corsHeaders });
    }
    try {
      const imgRes = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X)",
          "Referer": "https://www.instagram.com/",
        },
      });
      const contentType = imgRes.headers.get("Content-Type") || "image/jpeg";
      const imageData = await imgRes.arrayBuffer();
      return new Response(imageData, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
          ...corsHeaders,
        },
      });
    } catch (e) {
      return new Response("Failed to fetch image", { status: 500, headers: corsHeaders });
    }
  }

  if (!username) {
    return new Response(JSON.stringify({ error: "Username parameter is required" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }

  // Retrieve session cookie from env or fallback
  const sessionCookie = (process.env.INSTAGRAM_SESSION_ID || "75786336582%3AkQ04V2hqMznDq0%3A23%3AAYgaKE5rUlo4naD4HCYHRAzwkrghoIPaQ59grgspvQ;").trim();
  
  // Format cookie preview for debugging (e.g. "435186...Wpg (length: 83)")
  const cookiePreview = sessionCookie.length > 15 
    ? `${sessionCookie.slice(0, 8)}...${sessionCookie.slice(-8)} (length: ${sessionCookie.length})` 
    : "invalid-cookie";

  // Headers for Web API fetches (like web_profile_info)
  const webHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "X-IG-App-ID": "936619743392459",
    "Cookie": `sessionid=${sessionCookie};`,
    "Referer": "https://www.instagram.com/",
    "Origin": "https://www.instagram.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin"
  };

  // Headers for mobile App API fetches (like feed/user/ or clips/user/)
  const appHeaders = {
    "User-Agent": "Instagram 155.0.0.37.107 (iPhone11,8; iOS 14_4; en_US; en-US; scale=2.00; 828x1792; 190542906)",
    "Accept-Language": "en-US",
    "X-IG-App-ID": "936619743392459",
    "Cookie": `sessionid=${sessionCookie};`,
  };

  // Helper function to fetch and safely parse or report error
  const safeFetchJson = async (urlStr, requestHeaders) => {
    const res = await fetch(urlStr, { headers: requestHeaders });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Instagram returned non-JSON (Status ${res.status}). Body snippet: ${text.slice(0, 250)}`);
    }
  };

  const fetchUserId = async () => {
    // Note: Using www.instagram.com domain instead of i.instagram.com for web_profile_info to bypass API blocks
    const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    const data = await safeFetchJson(profileUrl, webHeaders);
    if (data.data?.user?.id) return data.data.user.id;
    throw new Error(`Could not find User ID. Response: ${JSON.stringify(data).slice(0, 200)}`);
  };

  try {
    const userId = await fetchUserId();

    if (path === "/info") {
      const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
      const data = await safeFetchJson(profileUrl, webHeaders);
      const user = data.data.user;

      const result = {
        username: user.username,
        full_name: user.full_name,
        bio: user.biography,
        followers: user.edge_followed_by.count,
        following: user.edge_follow.count,
        profile_image: user.profile_pic_url_hd,
        is_private: user.is_private,
        is_verified: user.is_verified,
        id: user.id,
      };

      return new Response(JSON.stringify(result, null, 2), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (path === "/posts") {
      const postsUrl = `https://i.instagram.com/api/v1/feed/user/${userId}/?count=12`;
      const data = await safeFetchJson(postsUrl, appHeaders);
      
      if (!data.items) {
        throw new Error(`Failed to fetch posts. Response: ${JSON.stringify(data).slice(0, 200)}`);
      }

      const posts = data.items.map(post => ({
        id: post.id,
        caption: post.caption?.text || "",
        media_type: post.media_type,
        image_url: post.image_versions2?.candidates[0]?.url || null,
        video_url: post.video_versions?.[0]?.url || null,
      }));

      return new Response(JSON.stringify({ posts }, null, 2), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (path === "/reels") {
      const reelsUrl = `https://i.instagram.com/api/v1/clips/user/${userId}/`;
      const data = await safeFetchJson(reelsUrl, appHeaders);

      if (!data.items || data.items.length === 0) {
        return new Response(JSON.stringify({ error: "No reels found" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 404,
        });
      }

      const latestReel = data.items[0];
      const reelInfo = {
        id: latestReel.id,
        caption: latestReel.caption?.text || "",
        video_url: latestReel.video_versions?.[0]?.url || null,
        thumbnail: latestReel.image_versions2?.candidates[0]?.url || null,
      };

      return new Response(JSON.stringify({ reel: reelInfo }, null, 2), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else if (path === "/stories") {
      const storyUrl = `https://i.instagram.com/api/v1/feed/user/${userId}/reel_media/`;
      const data = await safeFetchJson(storyUrl, appHeaders);

      if (!data.items || data.items.length === 0) {
        return new Response(JSON.stringify({ error: "No stories found" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 404,
        });
      }

      const stories = data.items.map(story => ({
        id: story.id,
        media_type: story.media_type,
        image_url: story.image_versions2?.candidates[0]?.url || null,
        video_url: story.video_versions?.[0]?.url || null,
        timestamp: story.taken_at,
      }));

      return new Response(JSON.stringify({ stories }, null, 2), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } else {
      return new Response(JSON.stringify({ error: "Invalid endpoint" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 404,
      });
    }

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch data",
        details: error.message,
        debug: {
          active_session_id: cookiePreview
        }
      }, null, 2),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
}
