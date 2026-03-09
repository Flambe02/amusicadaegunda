const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;
import { supabase } from '@/lib/supabase'

// Minimal helper to upsert a push subscription (Option A - public insert)
export async function upsertPushSubscription({ endpoint, p256dh, auth, topic = 'new-song', locale = 'pt-BR', vapidKeyVersion = 'v1' }) {
  if (!endpoint || !p256dh || !auth) {
    throw new Error('Missing subscription fields: endpoint, p256dh, auth')
  }
  
  isDev && console.warn('📡 upsertPushSubscription - Début');
  isDev && console.warn('📡 Endpoint:', endpoint?.substring(0, 50) + '...');
  isDev && console.warn('📡 Topic:', topic, 'Locale:', locale, 'VAPID version:', vapidKeyVersion);
  
  const payload = {
    endpoint,
    p256dh,
    auth,
    topics: [topic],
    locale,
    vapid_key_version: vapidKeyVersion,
    last_seen_at: new Date().toISOString()
  };
  
  isDev && console.warn('📡 Payload (sans clés):', { endpoint, topics: payload.topics, locale, vapid_key_version: payload.vapid_key_version });
  
  // Essayer d'abord avec onConflict sur la colonne
  // PostgREST devrait reconnaître soit la contrainte UNIQUE soit l'index UNIQUE
  let { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(payload, { onConflict: 'endpoint' })
    .select('endpoint, id, created_at')
    .maybeSingle() // Utiliser maybeSingle() au lieu de single() pour éviter les erreurs PGRST116
  
  if (error) {
    console.error('❌ Erreur upsertPushSubscription:', error);
    console.error('❌ Code:', error.code);
    console.error('❌ Message:', error.message);
    console.error('❌ Details:', error.details);
    console.error('❌ Hint:', error.hint);
    
    // Gérer spécifiquement les erreurs de contrainte UNIQUE manquante
    if (error.message?.includes('no unique or exclusion constraint matching the ON CONFLICT specification') || 
        error.message?.includes('ON CONFLICT')) {
      console.error('❌ Contrainte UNIQUE manquante sur endpoint - tentative de fallback INSERT/UPDATE');
      
      // Fallback: essayer d'abord un SELECT, puis INSERT ou UPDATE
      try {
        const { data: existing } = await supabase
          .from('push_subscriptions')
          .select('endpoint, id')
          .eq('endpoint', endpoint)
          .maybeSingle();
        
        if (existing) {
          // Mise à jour de l'enregistrement existant
          const { data: updated, error: updateError } = await supabase
            .from('push_subscriptions')
            .update({
              p256dh,
              auth,
              topics: [topic],
              locale,
              vapid_key_version: vapidKeyVersion,
              last_seen_at: new Date().toISOString()
            })
            .eq('endpoint', endpoint)
            .select('endpoint, id, created_at')
            .maybeSingle();
          
          if (updateError) throw updateError;
          isDev && console.warn('✅ Subscription mise à jour via fallback UPDATE');
          return updated || { endpoint, success: true };
        } else {
          // Insertion d'un nouvel enregistrement
          const { data: inserted, error: insertError } = await supabase
            .from('push_subscriptions')
            .insert(payload)
            .select('endpoint, id, created_at')
            .maybeSingle();
          
          if (insertError) throw insertError;
          isDev && console.warn('✅ Subscription créée via fallback INSERT');
          return inserted || { endpoint, success: true };
        }
      } catch (fallbackError) {
        console.error('❌ Fallback INSERT/UPDATE a échoué:', fallbackError);
        const constraintError = new Error('Erreur de contrainte : La contrainte UNIQUE sur endpoint est manquante dans la base de données. Exécutez la migration 20250110000000_fix_push_subscriptions_unique_constraint.sql');
        constraintError.code = 'CONSTRAINT_ERROR';
        constraintError.originalError = error;
        constraintError.fallbackError = fallbackError;
        throw constraintError;
      }
    }
    
    // Gérer spécifiquement les erreurs RLS
    if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('row-level security')) {
      const rlsError = new Error('Erreur de permission RLS : Les politiques de sécurité ne permettent pas l\'insertion. Vérifiez que les RLS policies sont correctement configurées sur la table push_subscriptions.');
      rlsError.code = 'RLS_ERROR';
      rlsError.originalError = error;
      throw rlsError;
    }
    
    throw error;
  }
  
  if (!data) {
    isDev && console.warn('⚠️ upsertPushSubscription: Aucune donnée retournée (mais pas d\'erreur)');
    // Retourner quand même un objet minimal pour indiquer le succès
    return { endpoint, success: true };
  }
  
  isDev && console.warn('✅ Subscription sauvegardée avec succès:', data);
  return data;
}

// src/lib/push.js - FORCE INCLUSION
isDev && console.warn('🚀 PUSH LIB LOADED - VERSION:', Date.now());

// Force export to prevent tree-shaking
export const PUSH_VERSION = Date.now();

// Test function to verify the file is loaded
export function testPush() {
  isDev && console.warn('🧪 TEST PUSH FUNCTION CALLED');
  return 'PUSH_LIB_WORKING';
}

// Variables d'environnement - obligatoires
// Note: Pas de fallback hardcodé pour la sécurité
const VAPID_PUBLIC_KEY = import.meta.env?.VITE_VAPID_PUBLIC_KEY;
const API_BASE = import.meta.env?.VITE_PUSH_API_BASE || 'https://efnzmpzkzeuktqkghwfa.functions.supabase.co';
const VAPID_KEY_VERSION = import.meta.env?.VITE_VAPID_KEY_VERSION || 'v1';

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
  navigator.standalone === true;
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

export const shouldShowPushCTA = async () => {
  if (!supported() || optedOut()) return false;
  const refusedUntil = localStorage.getItem('push_refused_until');
  if (refusedUntil && Date.now() < Number(refusedUntil)) return false;
  if (Notification.permission === 'denied') return false;
  
  // Desktop: jamais de notifications push
  if (!isMobile()) return false;
  
  // Mobile: seulement si PWA installée ou en mode standalone
  if (!isStandalone()) return false;

  // Eviter d'afficher le CTA si déjà abonné
  try {
    const reg = await navigator.serviceWorker.ready;
    const existingSubscription = await reg.pushManager.getSubscription();
    if (existingSubscription) return false;
  } catch {
    // Si le SW n'est pas prêt, on laisse le CTA visible
  }

  return true;
};

async function getSWRegistration() {
  // En dev, pas de SW pour éviter les conflits HMR
  if (import.meta.env?.DEV) {
    isDev && console.warn('🔧 DEV mode: Service Worker désactivé pour éviter les conflits HMR');
    return null;
  }
  
  // Utiliser le SW déjà enregistré par pwa-install.js
  try { 
    isDev && console.warn('🔍 Récupération du Service Worker existant...');
    return await navigator.serviceWorker.ready; 
  }
  catch {
    isDev && console.warn('⚠️ SW pas prêt, tentative d\'enregistrement...');
    // Enregistrer uniquement en production
    if (import.meta.env?.PROD) {
      return await navigator.serviceWorker.register('/sw.js');
    }
    return null;
  }
}

export async function enablePush({ locale = 'pt-BR' } = {}) {
  // DIAGNOSTIC: Afficher les variables d'environnement
  isDev && console.warn('🔍 DIAGNOSTIC VAPID:');
  isDev && console.warn('VAPID_PUBLIC_KEY length:', VAPID_PUBLIC_KEY?.length);
  isDev && console.warn('API_BASE:', API_BASE);
  isDev && console.warn('---');
  
  isDev && console.warn('🔍 Starting push activation...');
  
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
    isDev && console.warn('🔑 VAPID key test - Length:', testKey.byteLength, '(doit être 65)');
    if (testKey.byteLength !== 65) {
      console.error('❌ VAPID key invalide: longueur incorrecte');
      throw new Error('VAPID key invalide: longueur incorrecte');
    }
    isDev && console.warn('✅ VAPID key valide');
  } catch (e) {
    console.error('❌ VAPID key error:', e);
    throw new Error('VAPID key invalide: ' + e.message);
  }

  if (!API_BASE) {
    console.error('❌ API_BASE missing');
    throw new Error('API_BASE manquante');
  }

  isDev && console.warn('✅ Environment variables loaded');

  const reg = await getSWRegistration();
  if (!reg) {
    console.error('❌ Service Worker registration failed');
    throw new Error('Service Worker registration failed');
  }
  isDev && console.warn('✅ Service Worker registered');
  isDev && console.warn('🔍 SW state:', reg.active?.state, 'controller:', !!navigator.serviceWorker.controller);

  // Request permission ONLY on user gesture
  const permission = await Notification.requestPermission();
  isDev && console.warn('🔐 Permission result:', permission);
  
  if (permission !== 'granted') {
    const in30d = Date.now() + 1000 * 60 * 60 * 24 * 30;
    localStorage.setItem('push_refused_until', String(in30d));
    throw new Error('Permission refusée');
  }

  isDev && console.warn('🔑 Creating push subscription...');
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: b64ToUint8(VAPID_PUBLIC_KEY)
  });
  isDev && console.warn('✅ Push subscription created');

  // Extraire les clés de la subscription
  const p256dh = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh'))));
  const auth = btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))));

  isDev && console.warn('📡 Sending subscription to server (Supabase)...');
  
  try {
    // Utiliser Supabase directement pour sauvegarder l'abonnement
    await upsertPushSubscription({
      endpoint: sub.endpoint,
      p256dh,
      auth,
      topic: 'new-song',
      locale,
      vapidKeyVersion: VAPID_KEY_VERSION
    });
    
    isDev && console.warn('✅ Subscription saved to Supabase');
  } catch (supabaseError) {
    console.error('❌ Supabase save failed:', supabaseError);
    console.error('❌ Error type:', supabaseError?.constructor?.name);
    console.error('❌ Error code:', supabaseError?.code);
    console.error('❌ Error message:', supabaseError?.message);
    
    // Si c'est une erreur de contrainte UNIQUE, ne pas essayer le fallback API
    if (supabaseError?.code === 'CONSTRAINT_ERROR') {
      console.error('❌ Erreur de contrainte UNIQUE détectée - pas de fallback API');
      await sub.unsubscribe(); // Nettoyer l'abonnement échoué
      throw new Error('Erreur de base de données : La contrainte UNIQUE sur endpoint est manquante. Veuillez contacter le support technique.');
    }
    
    // Si c'est une erreur RLS, ne pas essayer le fallback API
    if (supabaseError?.code === 'RLS_ERROR' || supabaseError?.code === '42501') {
      console.error('❌ Erreur RLS détectée - pas de fallback API');
      await sub.unsubscribe(); // Nettoyer l'abonnement échoué
      throw new Error('Erreur de permission : Impossible de sauvegarder l\'abonnement. Vérifiez que les politiques RLS sont correctement configurées sur la table push_subscriptions.');
    }
    
    console.error('❌ Supabase save failed, trying API fallback:', supabaseError);
    
    // Fallback vers l'API externe si Supabase échoue
    // Extraire les données de la subscription pour la sérialisation JSON
    const subscriptionData = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth'))))
      }
    };
    
    try {
      const res = await fetch(`${API_BASE}/push/subscribe`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          subscription: subscriptionData,
          topic: 'new-song',
          locale,
          vapidKeyVersion: VAPID_KEY_VERSION
        })
      });
      
      isDev && console.warn('📊 API fallback response:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Both Supabase and API failed:', errorText);
        await sub.unsubscribe(); // Nettoyer l'abonnement échoué
        throw new Error(`Subscribe failed: ${res.status} ${res.statusText}. Détails: ${errorText}`);
      }
      
      isDev && console.warn('✅ Subscription saved via API fallback');
    } catch (apiError) {
      console.error('❌ API fallback also failed:', apiError);
      await sub.unsubscribe(); // Nettoyer l'abonnement échoué
      throw new Error(`Échec de l'activation : Impossible de sauvegarder l'abonnement. Erreur Supabase: ${supabaseError?.message || supabaseError}. Erreur API: ${apiError?.message || apiError}`);
    }
  }
  
  isDev && console.warn('✅ Push activation completed successfully');
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
