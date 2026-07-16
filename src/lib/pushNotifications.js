import { supabase } from '@/lib/supabase';

/**
 * Send push notifications to all subscribers via Supabase Edge Function.
 * Réservé aux admins : /push/send exige un JWT d'un compte présent dans
 * public.admins. On joint le token de la session courante (l'appel se fait
 * toujours depuis le panneau admin, où une session existe).
 * @returns {Promise<{success: boolean, sent?: number, total?: number, failed?: number, error?: string}>}
 */
export async function notifyAllSubscribers({ title, body, icon, url }) {
  const apiBase = import.meta.env?.VITE_PUSH_API_BASE || 'https://efnzmpzkzeuktqkghwfa.functions.supabase.co';

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
      return { success: false, error: 'Sessão admin ausente (login necessário para enviar notificações).' };
    }

    const response = await fetch(`${apiBase}/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        title: title || 'Nouvelle Chanson !',
        body: body || 'Une nouvelle chanson est disponible !',
        icon: icon || '/icons/pwa/icon-192x192.png',
        url: url || '/',
        tag: 'nova-musica',
        topic: 'new-song',
        locale: 'pt-BR'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorData.error || errorData.message || 'Erreur inconnue'}`
      };
    }

    const result = await response.json();
    if (result.ok) {
      return { success: true, sent: result.sent, total: result.total, failed: result.failed };
    }

    return { success: false, error: result.message || 'Réponse inattendue' };
  } catch (error) {
    return { success: false, error: error?.message || 'Erreur réseau' };
  }
}
