// Script d'installation PWA pour Música da Segunda
class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.installButton = null;
    this.isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.init();
  }

  init() {
    // Enregistrer le service worker
    this.registerServiceWorker();
    // En DEV, s'assurer qu'aucun SW existant ne contrôle la page
    if (this.isLocalDev) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(r => r.unregister());
          console.log('🧹 DEV: Service Worker désinstallé pour éviter tout cache.');
        }).catch(() => {});
      }
      // En local, désactiver le flux d'installation PWA (évite les warnings beforeinstallprompt)
      return;
    }
    
    // Écouter l'événement d'installation
    this.listenForInstallPrompt();
    
    // Créer le bouton d'installation
    this.createInstallButton();
  }

  // Enregistrer le service worker
  async registerServiceWorker() {
    // En dev, pas de SW pour éviter les conflits HMR
    if (this.isLocalDev) {
      console.log('🔧 DEV mode: Service Worker désactivé pour éviter les conflits HMR');
      return;
    }
    
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('🎵 Service Worker enregistré avec succès:', registration);
        
        // Vérifier les mises à jour
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 Nouvelle version disponible !');
              this.showUpdateNotification();
            }
          });
        });
      } catch (error) {
        console.error('❌ Erreur lors de l\'enregistrement du Service Worker:', error);
      }
    }
  }

  // Écouter l'événement d'installation
  listenForInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('📱 Installation PWA disponible !');
      
      // ✅ ACCESSIBILITÉ: Afficher le bouton avec ARIA
      if (this.installButton) {
        this.installButton.setAttribute('aria-hidden', 'false');
        this.installButton.setAttribute('data-visible', 'true');
        // Focus management optionnel : attendre 2s avant d'attirer l'attention
        setTimeout(() => {
          if (this.installButton.getAttribute('data-visible') === 'true') {
            // Annoncer aux lecteurs d'écran sans voler le focus
            this.installButton.setAttribute('aria-live', 'polite');
          }
        }, 2000);
      }
    });
  }

  // ✅ ACCESSIBILITÉ: Créer le bouton d'installation avec ARIA et CSS externe
  createInstallButton() {
    // Charger le CSS externe
    const linkElem = document.createElement('link');
    linkElem.rel = 'stylesheet';
    linkElem.href = '/pwa-install.css';
    document.head.appendChild(linkElem);
    
    // Créer le bouton avec des attributs ARIA appropriés
    this.installButton = document.createElement('button');
    this.installButton.className = 'pwa-install-button';
    this.installButton.setAttribute('type', 'button');
    this.installButton.setAttribute('aria-label', 'Instalar aplicação como PWA');
    this.installButton.setAttribute('role', 'button');
    this.installButton.textContent = '📱 Instalar App';
    
    // Masquer par défaut (sera affiché quand beforeinstallprompt se déclenche)
    this.installButton.setAttribute('aria-hidden', 'true');
    this.installButton.setAttribute('data-visible', 'false');
    
    // Ajouter le bouton au DOM
    document.body.appendChild(this.installButton);
    
    // Gérer le clic
    this.installButton.addEventListener('click', () => {
      this.installPWA();
    });
    
    // Masquer le bouton si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.installButton.setAttribute('aria-hidden', 'true');
      this.installButton.setAttribute('data-visible', 'false');
    }
  }

  // Installer la PWA
  async installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      
      const { outcome } = await this.deferredPrompt.userChoice;
      console.log('📱 Résultat de l\'installation:', outcome);
      
      if (outcome === 'accepted') {
        console.log('🎉 PWA installée avec succès !');
        // ✅ ACCESSIBILITÉ: Masquer le bouton avec ARIA
        this.installButton.setAttribute('aria-hidden', 'true');
        this.installButton.setAttribute('data-visible', 'false');
        
        // Afficher une notification de succès
        this.showSuccessNotification();
        
        // Ne plus activer automatiquement les push (désactivé pour conformité)
        this.activatePushNotifications();
      }
      
      this.deferredPrompt = null;
    }
  }

  // ✅ SÉCURITÉ: Ne plus activer automatiquement les push notifications
  // Cette fonction est désormais obsolète et ne fait plus rien
  // Les notifications doivent être activées manuellement par l'utilisateur
  async activatePushNotifications() {
    // ⚠️ IMPORTANT: Ne JAMAIS demander automatiquement la permission
    // C'est contraire aux guidelines Chrome/Apple et peut faire bloquer le domaine
    console.log('ℹ️ Les notifications push doivent être activées manuellement par l\'utilisateur');
  }

  // Afficher la notification de mise à jour
  showUpdateNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Música da Segunda', {
        body: 'Nova versão disponível! Recarregue a página para atualizar.',
        icon: '/icons/pwa/icon-192x192.png',
        badge: '/icons/pwa/icon-72x72.png'
      });
    }
  }

  // Afficher la notification de succès
  showSuccessNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Música da Segunda', {
        body: 'App instalada com sucesso! 🎉',
        icon: '/icons/pwa/icon-192x192.png',
        badge: '/icons/pwa/icon-72x72.png'
      });
    }
  }
}

// Initialiser l'installateur PWA quand le DOM est prêt
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PWAInstaller();
  });
} else {
  new PWAInstaller();
}

// ✅ SÉCURITÉ: SUPPRIMÉ - Ne JAMAIS demander automatiquement la permission pour les notifications
// C'est contraire aux guidelines Chrome/Apple et peut faire bloquer le domaine
// Les notifications doivent être activées via un bouton explicite avec le consentement de l'utilisateur

// Fonction manquante pour la conversion Base64 vers Uint8Array
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

// Récupérer la clé VAPID depuis une variable globale (injectée par Vite) ou utiliser la valeur par défaut
// Cette fonction peut être utilisée pour les push notifications si nécessaire
const getVAPIDKey = () => {
  // Vérifier si la clé est disponible via une variable globale (injectée par le build)
  if (typeof window !== 'undefined' && window.__VAPID_PUBLIC_KEY__) {
    return window.__VAPID_PUBLIC_KEY__;
  }
  // Valeur par défaut (fallback)
  return 'BNmWY52nhsYuohsMsFuFw5-vPv20qLw6nehrF-vyzPm87xU-6cPUoJhwtAVxj_18TcREBqx2uLdr5dcl57gVVNw';
};

console.log('🚀 PWA Installer Música da Segunda initialisé !');
