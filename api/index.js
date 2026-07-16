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
  const userIdParam = url.searchParams.get("userId");

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
          <p>Add <code>?username=&lt;insta_username&gt;</code> or <code>?userId=&lt;user_id&gt;</code> to any of the following endpoints:</p>
          <ul>
            <li><code>/info</code> – Get basic profile info (requires username)</li>
            <li><code>/posts</code> – Get latest posts</li>
            <li><code>/reels</code> – Get latest reel</li>
            <li><code>/stories</code> – Get active stories</li>
          </ul>
          <p><b>Examples:</b><br/>
             <code>/info?username=instagram</code><br/>
             <code>/posts?userId=43518657979</code> (Bypasses username blocks)
          </p>
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

  if (!username && !userIdParam) {
    return new Response(JSON.stringify({ error: "Either 'username' or 'userId' parameter is required" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 400,
    });
  }

  // Retrieve session cookie from env or fallback
  const fullCookieStr = process.env.INSTAGRAM_COOKIE;
  const sessionCookieFallback = process.env.INSTAGRAM_SESSION_ID || "75786336582%3AkQ04V2hqMznDq0%3A23%3AAYgaKE5rUlo4naD4HCYHRAzwkrghoIPaQ59grgspvQ;";
  
  const activeCookie = fullCookieStr ? fullCookieStr.trim() : `sessionid=${sessionCookieFallback.trim()};`;

  // Extract csrftoken if available in the cookie string
  let csrfToken = "";
  const csrfMatch = activeCookie.match(/csrftoken=([^;]+)/);
  if (csrfMatch) {
    csrfToken = csrfMatch[1];
  }

  // Debug preview
  const cookieType = fullCookieStr ? "Full Cookie String" : "Single Session ID";
  const cookiePreview = activeCookie.length > 20 
    ? `${activeCookie.slice(0, 10)}...${activeCookie.slice(-10)} (length: ${activeCookie.length})` 
    : "invalid-cookie";

  // Headers for Web API fetches (like web_profile_info)
  const webHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "X-IG-App-ID": "936619743392459",
    "Cookie": activeCookie,
    "Referer": "https://www.instagram.com/",
    "Origin": "https://www.instagram.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin"
  };

  if (csrfToken) {
    webHeaders["X-CSRFToken"] = csrfToken;
  }

  // Headers for mobile App API fetches (like feed/user/ or clips/user/)
  const appHeaders = {
    "User-Agent": "Instagram 155.0.0.37.107 (iPhone11,8; iOS 14_4; en_US; en-US; scale=2.00; 828x1792; 190542906)",
    "Accept-Language": "en-US",
    "X-IG-App-ID": "936619743392459",
    "Cookie": activeCookie,
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

  // Fallback function to extract User ID from public profile HTML page using regex
  const fetchUserIdFromHtml = async (uname) => {
    const profileUrl = `https://www.instagram.com/${encodeURIComponent(uname)}/`;
    const res = await fetch(profileUrl, { headers: webHeaders });
    const text = await res.text();
    
    // 1. Try matching iOS deep-link tag: instagram://user?username=...&id=1234
    let match = text.match(/instagram:\/\/user\?username=[^&]+&id=(\d+)/);
    if (match) return match[1];

    // 2. Try matching instapp:owner_id content tag
    match = text.match(/property="instapp:owner_id"\s+content="(\d+)"/) || text.match(/instapp:owner_id"\s+content="(\d+)"/);
    if (match) return match[1];

    // 3. Try matching generic user ID script tags
    match = text.match(/"id":"(\d+)"/);
    if (match) return match[1];

    throw new Error(`HTML parsing fallback failed (Status ${res.status}). Snippet: ${text.slice(0, 150)}`);
  };

  const fetchUserId = async () => {
    try {
      const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
      const data = await safeFetchJson(profileUrl, webHeaders);
      if (data.data?.user?.id) return data.data.user.id;
      throw new Error(`web_profile_info parsed, but ID missing`);
    } catch (apiError) {
      // Fallback to HTML parsing if web_profile_info fails (e.g. returns 429)
      try {
        return await fetchUserIdFromHtml(username);
      } catch (htmlError) {
        throw new Error(`Username resolution failed. API error: ${apiError.message}. Fallback error: ${htmlError.message}`);
      }
    }
  };

  try {
    // Resolve userId: either use direct param or fetch it from username
    const userId = userIdParam ? userIdParam.trim() : await fetchUserId();

    if (path === "/info") {
      // Info route requires username to parse profile correctly
      if (!username) {
        return new Response(JSON.stringify({ error: "Username parameter is required for /info route" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400,
        });
      }
      
      let data;
      try {
        const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
        data = await safeFetchJson(profileUrl, webHeaders);
      } catch (e) {
        // Fallback: if we only have HTML
        const profileUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
        const res = await fetch(profileUrl, { headers: webHeaders });
        const html = await res.text();
        
        // Try to pull username/info statically if API rate-limited
        return new Response(JSON.stringify({
          error: "API rate-limited, but User ID resolved",
          userId: userId,
          message: "Instagram blocks profile data scraper on this IP. Use /posts, /reels, or /stories with ?userId=" + userId + " directly."
        }, null, 2), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 429
        });
      }

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
          auth_type: cookieType,
          active_cookie: cookiePreview,
          csrf_token_present: !!csrfToken
        }
      }, null, 2),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
}
