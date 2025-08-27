// src/components/TikTokEmbedClean.jsx
import { useEffect } from "react";

/**
 * Minimal clean TikTok embed (JSX):
 * - Fixed 9:16 viewport to avoid scroll
 * - Loads TikTok script once per app
 */
export default function TikTokEmbedClean({ url, className }) {
  useEffect(() => {
    const id = "tiktok-embed-script";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://www.tiktok.com/embed.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  return (
    <div
      className={className || ""}
      style={{
        width: "100%",
        maxWidth: 420,
        aspectRatio: "9 / 16",
        overflow: "hidden",
        borderRadius: 16
      }}
    >
      <blockquote
        className="tiktok-embed"
        cite={url}
        data-video-id={extractVideoId(url)}
        style={{ margin: 0, height: "100%" }}
      >
        <section style={{ height: "100%" }}>
          <a href={url} target="_blank" rel="noreferrer">Voir sur TikTok</a>
        </section>
      </blockquote>
    </div>
  );
}

function extractVideoId(u) {
  if (!u) return "";
  const m = u.match(/\/video\/(\d+)/) || u.match(/[?&]video_id=(\d+)/);
  return m ? m[1] : "";
}
