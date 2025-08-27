// src/pages/TikTokDemo.jsx
import TikTokEmbedClean from "../components/TikTokEmbedClean";

export default function TikTokDemo() {
  const url = "https://www.tiktok.com/@amusicadasegunda/video/7467353900979424534";
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 12 }}>Demo TikTok Clean</h1>
      <TikTokEmbedClean url={url} />
      <p style={{ marginTop: 12, opacity: .6, fontSize: 12 }}>
        Embed en 9:16 sans scroll (script TikTok chargé une seule fois).
      </p>
    </div>
  );
}
