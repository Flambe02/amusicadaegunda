// src/lib/push.js
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const API_BASE = import.meta.env.VITE_PUSH_API_BASE; // e.g. https://<your-vercel-app>.vercel.app/api
const VAPID_KEY_VERSION = import.meta.env.VITE_VAPID_KEY_VERSION || 'v1';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true;
const isAndroid = () => /Android/i.test(navigator.userAgent);
const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const b64ToUint8 = (base64) => {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64B = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64B);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
};

export const optedOut = () => localStorage.getItem('push_optout') === 'true';

export const shouldShowPushCTA = () => {
  if (!supported() || optedOut()) return false;
  const refusedUntil = localStorage.getItem('push_refused_until');
  if (refusedUntil && Date.now() < Number(refusedUntil)) return false;
  if (isIOS()) return isStandalone(); // iOS: only if installed
  return true; // Android/Desktop supported
};

async function getSWRegistration() {
  // En dev, pas de SW pour éviter les conflits HMR
  if (import.meta.env.DEV) {
    console.log('🔧 DEV mode: Service Worker désactivé pour éviter les conflits HMR');
    return null;
  }
  
  // Utiliser le SW déjà enregistré par pwa-install.js
  try { 
    console.log('🔍 Récupération du Service Worker existant...');
    return await navigator.serviceWorker.ready; 
  }
  catch (error) {
    console.log('⚠️ SW pas prêt, tentative d\'enregistrement...');
    return await navigator.serviceWorker.register('/sw.js');
  }
}

export async function enablePush({ locale = 'pt-BR' } = {}) {
  // DIAGNOSTIC: Afficher les variables d'environnement
  console.log('🔍 DIAGNOSTIC VAPID:');
  console.log('VAPID_PUBLIC_KEY:', VAPID_PUBLIC_KEY);
  console.log('VAPID_PUBLIC_KEY length:', VAPID_PUBLIC_KEY?.length);
  console.log('API_BASE:', API_BASE);
  console.log('---');
  
  console.log('🔍 Starting push activation...', { locale, VAPID_PUBLIC_KEY: !!VAPID_PUBLIC_KEY, API_BASE });
  
  if (!supported()) {
    console.error('❌ Push not supported');
    throw new Error('Push non supporté');
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error('❌ VAPID_PUBLIC_KEY missing');
    throw new Error('VAPID_PUBLIC_KEY manquante');
  }
  
  // TEST: Vérifier la validité de la clé VAPID
  try {
    const testKey = b64ToUint8(VAPID_PUBLIC_KEY);
    console.log('🔑 VAPID key test - Length:', testKey.byteLength, '(doit être 65)');
    if (testKey.byteLength !== 65) {
      console.error('❌ VAPID key invalide: longueur incorrecte');
      throw new Error('VAPID key invalide: longueur incorrecte');
    }
    console.log('✅ VAPID key valide');
  } catch (e) {
    console.error('❌ VAPID key error:', e);
    throw new Error('VAPID key invalide: ' + e.message);
  }

  if (!API_BASE) {
    console.error('❌ API_BASE missing');
    throw new Error('API_BASE manquante');
  }

  console.log('✅ Environment variables loaded');

  const reg = await getSWRegistration();
  if (!reg) {
    console.error('❌ Service Worker registration failed');
    throw new Error('Service Worker registration failed');
  }
  console.log('✅ Service Worker registered:', reg);
  console.log('🔍 SW state:', reg.active?.state, 'controller:', !!navigator.serviceWorker.controller);

  // Request permission ONLY on user gesture
  const permission = await Notification.requestPermission();
  console.log('🔐 Permission result:', permission);
  
  if (permission !== 'granted') {
    const in30d = Date.now() + 1000 * 60 * 60 * 24 * 30;
    localStorage.setItem('push_refused_until', String(in30d));
    throw new Error('Permission refusée');
  }

  console.log('🔑 Creating push subscription...');
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64ToUint8(VAPID_PUBLIC_KEY)
  });
  console.log('✅ Push subscription created:', sub.endpoint);

  console.log('📡 Sending subscription to server...');
  const res = await fetch(`${API_BASE}/push/subscribe`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      subscription: sub,
      topic: 'new-song',
      locale,
      vapidKeyVersion: VAPID_KEY_VERSION
    })
  });
  
  console.log('📊 Server response:', res.status, res.statusText);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ Subscribe failed:', errorText);
    throw new Error(`Subscribe failed: ${res.status} ${res.statusText}`);
  }
  
  console.log('✅ Push activation completed successfully');
  return sub;
}

export async function unsubscribePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch(`${API_BASE}/push/unsubscribe`, {
        method: 'DELETE',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ endpoint: sub.endpoint })
      }).catch(()=>{});
      await sub.unsubscribe();
    }
  } catch {}
}

export function optOutPushForever() {
  localStorage.setItem('push_optout', 'true');
}
