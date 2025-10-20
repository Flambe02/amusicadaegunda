import { supabase } from '@/lib/supabase'

// Minimal helper to upsert a push subscription (Option A - public insert)
export async function upsertPushSubscription({ endpoint, p256dh, auth, topic = 'new-song', locale = 'pt-BR', vapidKeyVersion = 'v1' }) {
  if (!endpoint || !p256dh || !auth) {
    throw new Error('Missing subscription fields: endpoint, p256dh, auth')
  }
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh, auth, topics: [topic], locale, vapid_key_version: vapidKeyVersion }, { onConflict: 'endpoint' })
    .select('endpoint')
    .single()
  if (error) throw error
  return data
}

// src/lib/push.js - FORCE INCLUSION
console.warn('🚀 PUSH LIB LOADED - VERSION:', Date.now());

// Force export to prevent tree-shaking
export const PUSH_VERSION = Date.now();

// Test function to verify the file is loaded
export function testPush() {
  console.warn('🧪 TEST PUSH FUNCTION CALLED');
  return 'PUSH_LIB_WORKING';
}

// Variables d'environnement - obligatoires
const VAPID_PUBLIC_KEY = import.meta.env?.VITE_VAPID_PUBLIC_KEY || 'BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw';
const API_BASE = import.meta.env?.VITE_PUSH_API_BASE || 'https://musica-da-segunda-push.vercel.app';
const VAPID_KEY_VERSION = import.meta.env?.VITE_VAPID_KEY_VERSION || 'v1';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone === true;
const isAndroid = () => /Android/i.test(navigator.userAgent);
export const isMobile = () => isIOS() || isAndroid();
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
  
  // Desktop: jamais de notifications push
  if (!isMobile()) return false;
  
  // Mobile: seulement si PWA installée ou en mode standalone
  if (isMobile()) {
    return isStandalone();
  }
  
  return false;
};

async function getSWRegistration() {
  // En dev, pas de SW pour éviter les conflits HMR
  if (import.meta.env?.DEV) {
    console.warn('🔧 DEV mode: Service Worker désactivé pour éviter les conflits HMR');
    return null;
  }
  
  // Utiliser le SW déjà enregistré par pwa-install.js
  try { 
    console.warn('🔍 Récupération du Service Worker existant...');
    return await navigator.serviceWorker.ready; 
  }
  catch {
    console.warn('⚠️ SW pas prêt, tentative d\'enregistrement...');
    // Enregistrer uniquement en production
    if (import.meta.env?.PROD) {
      return await navigator.serviceWorker.register('/sw.js');
    }
    return null;
  }
}

export async function enablePush({ locale = 'pt-BR' } = {}) {
  // DIAGNOSTIC: Afficher les variables d'environnement
  console.warn('🔍 DIAGNOSTIC VAPID:');
  console.warn('VAPID_PUBLIC_KEY length:', VAPID_PUBLIC_KEY?.length);
  console.warn('API_BASE:', API_BASE);
  console.warn('---');
  
  console.warn('🔍 Starting push activation...');
  
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
    console.warn('🔑 VAPID key test - Length:', testKey.byteLength, '(doit être 65)');
    if (testKey.byteLength !== 65) {
      console.error('❌ VAPID key invalide: longueur incorrecte');
      throw new Error('VAPID key invalide: longueur incorrecte');
    }
    console.warn('✅ VAPID key valide');
  } catch (e) {
    console.error('❌ VAPID key error:', e);
    throw new Error('VAPID key invalide: ' + e.message);
  }

  if (!API_BASE) {
    console.error('❌ API_BASE missing');
    throw new Error('API_BASE manquante');
  }

  console.warn('✅ Environment variables loaded');

  const reg = await getSWRegistration();
  if (!reg) {
    console.error('❌ Service Worker registration failed');
    throw new Error('Service Worker registration failed');
  }
  console.warn('✅ Service Worker registered');
  console.warn('🔍 SW state:', reg.active?.state, 'controller:', !!navigator.serviceWorker.controller);

  // Request permission ONLY on user gesture
  const permission = await Notification.requestPermission();
  console.warn('🔐 Permission result:', permission);
  
  if (permission !== 'granted') {
    const in30d = Date.now() + 1000 * 60 * 60 * 24 * 30;
    localStorage.setItem('push_refused_until', String(in30d));
    throw new Error('Permission refusée');
  }

  console.warn('🔑 Creating push subscription...');
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64ToUint8(VAPID_PUBLIC_KEY)
  });
  console.warn('✅ Push subscription created');

  console.warn('📡 Sending subscription to server...');
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
  
  console.warn('📊 Server response:', res.status, res.statusText);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ Subscribe failed:', errorText);
    throw new Error(`Subscribe failed: ${res.status} ${res.statusText}`);
  }
  
  console.warn('✅ Push activation completed successfully');
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
