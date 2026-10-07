/**
 * Plateformes d'écoute du projet (liens déjà publiés dans le site : Sobre, page pour
 * les IA). Affichées en pastilles NEUTRES dans le Menu : aucune couleur de marque
 * (DESIGN.md, « Borrowed Colour Rule »).
 */
import { WHATSAPP_CHANNEL_LABEL, WHATSAPP_CHANNEL_URL } from '@/lib/whatsappChannel';

export const PLATFORMS = [
  { label: 'YouTube', href: 'https://music.youtube.com/playlist?list=PLmoOyuQg7Y2QZKbcj20s7dcadsVx7WuWH' },
  { label: 'Spotify', href: 'https://open.spotify.com/playlist/5z7Jan9yS1KRzwWEPYs4sH' },
  { label: 'Apple Music', href: 'https://music.apple.com/us/artist/a-m%C3%BAsica-da-segunda/1867784335' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@amusicadasegunda' },
  { label: 'Instagram', href: 'https://www.instagram.com/a_musica_da_segunda/' },
  // Le canal WhatsApp : pour suivre, pas pour écouter — en dernier, même pastille neutre.
  ...(WHATSAPP_CHANNEL_URL ? [{ label: WHATSAPP_CHANNEL_LABEL, href: WHATSAPP_CHANNEL_URL }] : []),
];
