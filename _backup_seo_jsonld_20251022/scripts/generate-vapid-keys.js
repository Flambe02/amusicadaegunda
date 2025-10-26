#!/usr/bin/env node

/**
 * Script pour générer les clés VAPID pour Web Push
 * Usage: node scripts/generate-vapid-keys.js
 */

import webpush from 'web-push';

try {
  const keys = webpush.generateVAPIDKeys();
  
  console.log('🔑 Clés VAPID générées avec succès !\n');
  console.log('📱 VITE_VAPID_PUBLIC_KEY (à mettre dans .env):');
  console.log(keys.publicKey);
  console.log('\n🔒 VAPID_PRIVATE_KEY (à mettre dans Vercel):');
  console.log(keys.privateKey);
  console.log('\n📋 Instructions:');
  console.log('1. Copiez VITE_VAPID_PUBLIC_KEY dans votre .env');
  console.log('2. Copiez VAPID_PRIVATE_KEY dans votre projet Vercel push-api');
  console.log('3. Déployez push-api sur Vercel');
  console.log('4. Ajoutez VITE_PUSH_API_BASE dans votre .env');
  
} catch (error) {
  console.error('❌ Erreur lors de la génération des clés VAPID:', error.message);
  console.log('\n💡 Assurez-vous d\'avoir installé web-push:');
  console.log('npm install web-push');
}
