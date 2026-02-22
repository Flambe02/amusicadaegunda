/**
 * Send push notifications to all subscribers via Supabase Edge Function.
 * @returns {Promise<{success: boolean, sent?: number, total?: number, failed?: number, error?: string}>}
 */
export async function notifyAllSubscribers({ title, body, icon, url }) {
  const apiBase = import.meta.env?.VITE_PUSH_API_BASE || 'https://efnzmpzkzeuktqkghwfa.functions.supabase.co';

  try {
    const response = await fetch(`${apiBase}/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
