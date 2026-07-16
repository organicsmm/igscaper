# 📸 Instagram Scraper API (Vercel Edge Runtime)

This is a standalone Instagram Scraper API ported to run on **Vercel Edge Runtime**. It supports fetching basic info, latest posts, reels, stories, and proxying Instagram CDN images.

## 🚀 Setup & Vercel Deployment Guide

### 1. GitHub Par Code Push Karna (How to Push to GitHub)
Since your local Git CLI is not globally configured in the system environment variables, you can commit and push these files using VS Code or your terminal:

**Terminal commands (Run this in your command line / powershell):**
```bash
# Verify the new directory
cd instagram-scraper

# Go back to project root
cd ..

# Add files to git
git add instagram-scraper/

# Commit changes
git commit -m "Add Vercel-ready Instagram Scraper API"

# Push to your GitHub repository
git push origin main
```
*Alternatively, you can use the VS Code Git pane (Source Control icon on the left sidebar) to stage, commit, and sync/push these changes.*

---

### 2. Vercel Par Host Kaise Karein (How to Host on Vercel)
Follow these steps to deploy this subdirectory to Vercel:

1. **Vercel Dashboard Open Karein:** Go to [vercel.com](https://vercel.com) and log in.
2. **Naya Project Add Karein:** Click on **"Add New"** -> **"Project"**.
3. **GitHub Repo Import Karein:** Select and import the GitHub repository containing this code.
4. **Configure Project Settings:**
   * **Root Directory:** Edit the root directory settings and set it to `instagram-scraper`. This tells Vercel to only deploy the scraper project.
   * **Framework Preset:** Leave it as `Other` or `Vercel` (it will auto-detect).
5. **Environment Variables Add Karein (Crucial for Security):**
   Under the **Environment Variables** section, add your Instagram Session ID so you don't leak it in your public Git repository:
   * **Key:** `INSTAGRAM_SESSION_ID`
   * **Value:** `75786336582%3AkQ04V2hqMznDq0%3A23%3AAYgaKE5rUlo4naD4HCYHRAzwkrghoIPaQ59grgspvQ;`
6. **Deploy:** Click **"Deploy"**. Vercel will build and deploy the edge function in less than a minute!

---

## 📘 Usage & Endpoints

Once deployed, your base URL will be `https://your-project-name.vercel.app`.

### 1. User Profile Info
Get profile details (followers, verification, name, and bio).
* **Endpoint:** `/info?username=INSTAGRAM_USERNAME`
* **Example:** `https://your-project-name.vercel.app/info?username=instagram`

### 2. Latest Posts
Get the latest posts from a user profile.
* **Endpoint:** `/posts?username=INSTAGRAM_USERNAME`
* **Example:** `https://your-project-name.vercel.app/posts?username=instagram`

### 3. Latest Reel
Get the most recent reel from a user.
* **Endpoint:** `/reels?username=INSTAGRAM_USERNAME`
* **Example:** `https://your-project-name.vercel.app/reels?username=instagram`

### 4. Active Stories
Get the active stories for a user.
* **Endpoint:** `/stories?username=INSTAGRAM_USERNAME`
* **Example:** `https://your-project-name.vercel.app/stories?username=instagram`

### 5. Image Proxy
Instagram blocks direct loading of CDN images in external browsers. Use this proxy to display images correctly:
* **Endpoint:** `/proxy?url=INSTAGRAM_CDN_IMAGE_URL`
* **Example:** `https://your-project-name.vercel.app/proxy?url=https://scontent.cdninstagram.com/...`
