// Code corrigé pour utiliser dans la console ou un script non-module
// Remplacez import.meta.env.VITE_VAPID_PUBLIC_KEY par une valeur directe ou window.__VAPID_PUBLIC_KEY__

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// CORRECTION : Utiliser window.__VAPID_PUBLIC_KEY__ ou la valeur par défaut
// au lieu de import.meta.env.VITE_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = (typeof window !== 'undefined' && window.__VAPID_PUBLIC_KEY__) 
  ? window.__VAPID_PUBLIC_KEY__ 
  : 'BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw';

const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

console.log('VAPID key length:', key.byteLength);
console.log('VAPID key value:', VAPID_PUBLIC_KEY);

