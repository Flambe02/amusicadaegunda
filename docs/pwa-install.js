// Script d'installation PWA pour Música da Segunda
class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.installButton = null;
    this.init();
  }

  init() {
    // Enregistrer le service worker
    this.registerServiceWorker();
    
    // Écouter l'événement d'installation
    this.listenForInstallPrompt();
    
    // Créer le bouton d'installation
    this.createInstallButton();
  }

  // Enregistrer le service worker
  async registerServiceWorker() {
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
      
      // Afficher le bouton d'installation
      if (this.installButton) {
        this.installButton.style.display = 'block';
      }
    });
  }

  // Créer le bouton d'installation
  createInstallButton() {
    // Créer le bouton
    this.installButton = document.createElement('button');
    this.installButton.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #32a2dc, #1e88e5);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 15px 25px;
        font-size: 14px;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(50, 162, 220, 0.3);
        cursor: pointer;
        z-index: 1000;
        display: none;
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        📱 Instalar App
      </div>
    `;
    
    // Ajouter le bouton au DOM
    document.body.appendChild(this.installButton);
    
    // Gérer le clic
    this.installButton.addEventListener('click', () => {
      this.installPWA();
    });
    
    // Masquer le bouton si l'app est déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.installButton.style.display = 'none';
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
        this.installButton.style.display = 'none';
        
        // Afficher une notification de succès
        this.showSuccessNotification();
      }
      
      this.deferredPrompt = null;
    }
  }

  // Afficher la notification de mise à jour
  showUpdateNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Música da Segunda', {
        body: 'Nova versão disponível! Recarregue a página para atualizar.',
        icon: '/images/Logo.png',
        badge: '/images/Logo.png'
      });
    }
  }

  // Afficher la notification de succès
  showSuccessNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Música da Segunda', {
        body: 'App instalada com sucesso! 🎉',
        icon: '/images/Logo.png',
        badge: '/images/Logo.png'
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

// Demander la permission pour les notifications
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

console.log('🚀 PWA Installer Música da Segunda initialisé !');
