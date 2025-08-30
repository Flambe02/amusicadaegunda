#!/usr/bin/env node

/**
 * Script de test pour envoyer des notifications push
 * Usage: node tools/test-push.js
 */

const API_BASE = process.env.PUSH_API_BASE || 'https://your-vercel-app.vercel.app/api';

async function testPushNotification() {
  try {
    console.log('🚀 Test d\'envoi de notification push...\n');
    
    const payload = {
      title: '🎵 Nouvelle chanson disponible !',
      body: 'Cliquez pour découvrir la musique de cette semaine',
      url: '/playlist',
      tag: 'new-song',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png'
    };
    
    console.log('📤 Envoi vers:', `${API_BASE}/push/send`);
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(`${API_BASE}/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Notification envoyée avec succès !');
      console.log('📊 Résultat:', result);
    } else {
      console.error('\n❌ Erreur lors de l\'envoi:', response.status, response.statusText);
      const error = await response.text();
      console.error('Détails:', error);
    }
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.log('\n💡 Vérifiez que:');
    console.log('1. Votre API push-api est déployée sur Vercel');
    console.log('2. La variable PUSH_API_BASE est correcte');
    console.log('3. Vous avez des abonnés actifs');
  }
}

// Configuration
if (!process.env.PUSH_API_BASE) {
  console.log('⚠️  Variable PUSH_API_BASE non définie');
  console.log('💡 Définissez-la ou modifiez le script');
  console.log('   export PUSH_API_BASE=https://your-app.vercel.app/api');
  console.log('   ou modifiez la variable API_BASE dans le script\n');
}

testPushNotification();
